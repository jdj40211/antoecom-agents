-- Hardening de contadores de uso y del INSERT de perfil
--
-- Cierra tres agujeros que quedaron abiertos entre el schema inicial y la
-- migración de control de programa:
--
--  1. `record_agent_usage` sumaba lo que le mandaran, signo incluido. Es
--     SECURITY DEFINER y el EXECUTE quedó en PUBLIC, así que desde la consola
--     del navegador se podía llamar con `p_tokens_input: -2000000000` y dejar
--     `total_tokens_input` en negativo para siempre. El rate limiter suma esas
--     columnas, o sea que el límite de tokens del día desaparecía y /usage
--     mostraba números negativos. El comentario del schema inicial prometía que
--     el cliente "no puede inflar sus contadores": era cierto para el INSERT
--     directo (usage_daily no tiene policies de escritura) y falso para la
--     aritmética de la función.
--
--  2. La policy `users_insert_own_profile` decide QUÉ FILA se inserta, no qué
--     columnas. El GRANT INSERT por defecto cubre todas, `program` incluida, así
--     que un usuario sin fila en community_profiles (el trigger falló, o es
--     anterior al trigger) podía crearse a sí mismo como elite. Es exactamente
--     el agujero que 20260821000000 cerró para el UPDATE y dejó abierto para el
--     INSERT.
--
--  3. El límite diario se contabilizaba DESPUÉS de streamear, así que cancelar
--     la ejecución la dejaba sin contar, y entre el chequeo y la escritura pasaba
--     una generación entera de LLM (maxDuration = 300), sin lock ni contador
--     optimista. `reserve_agent_run` invierte el orden: primero se reserva, se
--     decide con el contador ya incrementado, y recién después se streamea.
--
-- Esta migración es idempotente: se puede pegar entera en el SQL editor de
-- Supabase y correr las veces que haga falta.

-- ---------------------------------------------------------------------------
-- 1. usage_daily no puede quedar en negativo, venga de donde venga
-- ---------------------------------------------------------------------------
--
-- Defensa en profundidad: aunque las funciones de abajo validan el signo, la
-- tabla también lo hace. Si mañana aparece otra función SECURITY DEFINER que
-- escriba acá, el invariante sigue en pie sin depender de que se acuerde.
--
-- Primero se normaliza lo que ya esté roto, porque un CHECK no se puede agregar
-- sobre filas que lo violan.

UPDATE public.usage_daily
SET
  total_runs = GREATEST(0, total_runs),
  total_tokens_input = GREATEST(0, total_tokens_input),
  total_tokens_output = GREATEST(0, total_tokens_output),
  total_cost_estimate_usd = GREATEST(0, total_cost_estimate_usd)
WHERE
  total_runs < 0
  OR total_tokens_input < 0
  OR total_tokens_output < 0
  OR total_cost_estimate_usd < 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.usage_daily'::regclass
      AND conname = 'usage_daily_no_negativos'
  ) THEN
    ALTER TABLE public.usage_daily
      ADD CONSTRAINT usage_daily_no_negativos CHECK (
        total_runs >= 0
        AND total_tokens_input >= 0
        AND total_tokens_output >= 0
        AND total_cost_estimate_usd >= 0
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. record_agent_usage: validación de signo
-- ---------------------------------------------------------------------------
--
-- Se elige RAISE EXCEPTION antes que GREATEST(0, ...) por dos razones:
--
--  * GREATEST convierte el ataque en un no-op silencioso. Con la excepción, el
--    intento queda en los logs de Postgres y en el `console.warn` que la ruta ya
--    tiene sobre `usageError`, así que se ve que alguien está probando.
--  * El único llamador legítimo (app/api/agents/run/route.ts) manda siempre
--    `usage?.inputTokens ?? 0`, que nunca es negativo. Un negativo acá no es un
--    dato raro que haya que redondear: es un bug nuestro o un abuso. En ninguno
--    de los dos casos conviene tragárselo.
--
-- La excepción es segura para el usuario final: el RPC corre en su propia
-- transacción y es lo último que hace la ruta, después de que el stream ya salió
-- entero y de que agent_runs ya se actualizó. Falla el contador, no la respuesta.
--
-- Sobre el EXECUTE: `grant_program` sí se pudo revocar a `authenticated` porque
-- nadie la llama desde la app. Acá NO se puede. La ruta usa el cliente de sesión
-- del usuario (lib/supabase/server.ts: createServerClient con la anon key y las
-- cookies), así que el RPC llega a Postgres con el rol `authenticated`:
-- revocárselo rompería la ruta de ejecución de agentes en producción. Se revoca
-- entonces a PUBLIC y a `anon` (nadie sin sesión tiene por qué tocar contadores)
-- y se deja explícito el grant a `authenticated`. Como el navegador del usuario
-- también es `authenticated`, la protección real es la validación de signo de
-- acá abajo, no el grant.

CREATE OR REPLACE FUNCTION public.record_agent_usage(
  p_provider VARCHAR,
  p_tokens_input INTEGER,
  p_tokens_output INTEGER,
  p_cost NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'record_agent_usage requiere un usuario autenticado';
  END IF;

  IF COALESCE(p_tokens_input, 0) < 0
     OR COALESCE(p_tokens_output, 0) < 0
     OR COALESCE(p_cost, 0) < 0 THEN
    RAISE EXCEPTION
      'record_agent_usage no acepta valores negativos (tokens_input=%, tokens_output=%, cost=%)',
      p_tokens_input, p_tokens_output, p_cost;
  END IF;

  INSERT INTO usage_daily (
    user_id, usage_date, provider,
    total_runs, total_tokens_input, total_tokens_output, total_cost_estimate_usd
  )
  VALUES (
    v_user_id, CURRENT_DATE, p_provider,
    1, COALESCE(p_tokens_input, 0), COALESCE(p_tokens_output, 0), COALESCE(p_cost, 0)
  )
  ON CONFLICT (user_id, usage_date, provider) DO UPDATE SET
    total_runs = usage_daily.total_runs + 1,
    total_tokens_input = usage_daily.total_tokens_input + COALESCE(p_tokens_input, 0),
    total_tokens_output = usage_daily.total_tokens_output + COALESCE(p_tokens_output, 0),
    total_cost_estimate_usd = usage_daily.total_cost_estimate_usd + COALESCE(p_cost, 0);
END;
$$;

COMMENT ON FUNCTION public.record_agent_usage(VARCHAR, INTEGER, INTEGER, NUMERIC) IS
  'Contabiliza una ejecución ya terminada: suma 1 a total_runs y acumula tokens y costo. Queda como camino heredado: la ruta nueva usa reserve_agent_run antes del stream y settle_agent_run al terminar. No mezclar las dos en la misma ejecución o el run se cuenta dos veces.';

REVOKE EXECUTE ON FUNCTION public.record_agent_usage(VARCHAR, INTEGER, INTEGER, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_agent_usage(VARCHAR, INTEGER, INTEGER, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_agent_usage(VARCHAR, INTEGER, INTEGER, NUMERIC) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. El usuario tampoco elige su programa al crear su fila
-- ---------------------------------------------------------------------------
--
-- Simétrico al GRANT UPDATE de 20260821000000. Se revoca el INSERT amplio y se
-- devuelve solo lo que el usuario puede decidir sobre sí mismo. `program` queda
-- afuera, así que un INSERT que lo mencione es rechazado por permisos y el resto
-- toma el DEFAULT 'trial' de la columna.
--
-- El trigger `handle_new_user` no se ve afectado: es SECURITY DEFINER y corre
-- como el dueño de la función, que no pasa por estos grants. Ninguna ruta de la
-- app inserta en community_profiles (solo el trigger crea la fila, /api/profile
-- hace UPDATE), así que esto no rompe nada del flujo actual.

REVOKE INSERT ON public.community_profiles FROM anon, authenticated;

GRANT INSERT (id, display_name, avatar_url)
  ON public.community_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reservar la ejecución antes de streamear
-- ---------------------------------------------------------------------------
--
-- Hoy la ruta chequea el límite, streamea hasta 300 segundos y recién entonces
-- contabiliza. Eso deja dos agujeros que son el mismo agujero:
--
--  * Cancelando el stream la ejecución nunca se cuenta. Se cierra la pestaña
--    después del primer token y el contador diario sigue en cero, indefinidamente.
--  * Entre el chequeo y la escritura no hay nada. Seis pestañas disparadas a la
--    vez en el run 9 de 10 leen 9, las seis pasan, las seis escriben.
--
-- `reserve_agent_run` hace las dos cosas en una sola llamada atómica: decide y
-- cuenta antes de que se gaste un token. La ruta la llama en lugar del chequeo
-- previo y decide con `allowed`; si es false, devuelve 429 con `reason`.
--
-- La atomicidad sale de un advisory lock por usuario que dura la transacción.
-- Un lock a nivel fila no alcanza: `usage_daily` tiene una fila por (usuario,
-- día, provider) y el límite se aplica sobre la suma de todas, así que dos
-- ejecuciones simultáneas con providers distintos tocarían filas distintas y no
-- se verían entre sí. El lock serializa por usuario, que es la granularidad del
-- límite. No bloquea a otros usuarios ni a las lecturas de /usage.
--
-- Devuelve el contador POST incremento para que la ruta pueda mostrar cuántas
-- ejecuciones quedan sin volver a consultar. Cuando no se permite, no se
-- incrementa nada: un usuario bloqueado que reintenta veinte veces no debe
-- terminar con veinte ejecuciones fantasma en /usage.
--
-- El límite por hora no se toca acá. Ese se cuenta sobre `agent_runs`, que la
-- ruta inserta antes de streamear, así que ya es inmune a la cancelación.

DROP FUNCTION IF EXISTS public.reserve_agent_run(VARCHAR);

CREATE OR REPLACE FUNCTION public.reserve_agent_run(p_provider VARCHAR)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  runs_today INTEGER,
  runs_limit INTEGER,
  tokens_today INTEGER,
  tokens_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_program VARCHAR(20);
  v_runs INTEGER;
  v_tokens INTEGER;
  v_max_runs INTEGER;
  v_max_tokens INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'reserve_agent_run requiere un usuario autenticado';
  END IF;

  IF p_provider IS NULL OR btrim(p_provider) = '' THEN
    RAISE EXCEPTION 'reserve_agent_run requiere un provider';
  END IF;

  -- A partir de acá, para este usuario, no hay dos reservas en paralelo. El lock
  -- se suelta solo al terminar la transacción del RPC, que son milisegundos: no
  -- abarca el stream.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0::BIGINT));

  SELECT p.program INTO v_program
  FROM community_profiles p
  WHERE p.id = v_user_id;

  -- Sin fila de perfil se asume 'trial', igual que la ruta. Es el plan más
  -- restrictivo: ante la duda no se regala cuota.
  v_program := COALESCE(v_program, 'trial');

  SELECT c.max_runs_per_day, c.max_tokens_per_day
  INTO v_max_runs, v_max_tokens
  FROM rate_limit_config c
  WHERE c.program = v_program;

  -- Mismos valores por defecto que lib/agents/rate-limiter.ts, para que la
  -- tabla vacía no signifique cosas distintas de cada lado.
  v_max_runs := COALESCE(v_max_runs, 50);
  v_max_tokens := COALESCE(v_max_tokens, 500000);

  SELECT
    COALESCE(SUM(u.total_runs), 0)::INTEGER,
    COALESCE(SUM(u.total_tokens_input + u.total_tokens_output), 0)::INTEGER
  INTO v_runs, v_tokens
  FROM usage_daily u
  WHERE u.user_id = v_user_id
    AND u.usage_date = CURRENT_DATE;

  -- CURRENT_DATE es UTC, igual que el `today` del rate limiter. Que el día se
  -- corte a las 7 PM en Bogotá es un problema de producto, no de esta función:
  -- lo importante acá es que las dos piezas usen el mismo corte.

  IF v_runs >= v_max_runs THEN
    RETURN QUERY SELECT FALSE, 'daily-runs'::TEXT, v_runs, v_max_runs, v_tokens, v_max_tokens;
    RETURN;
  END IF;

  IF v_tokens >= v_max_tokens THEN
    RETURN QUERY SELECT FALSE, 'daily-tokens'::TEXT, v_runs, v_max_runs, v_tokens, v_max_tokens;
    RETURN;
  END IF;

  INSERT INTO usage_daily (user_id, usage_date, provider, total_runs)
  VALUES (v_user_id, CURRENT_DATE, p_provider, 1)
  ON CONFLICT (user_id, usage_date, provider) DO UPDATE SET
    total_runs = usage_daily.total_runs + 1;

  v_runs := v_runs + 1;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_runs, v_max_runs, v_tokens, v_max_tokens;
END;
$$;

COMMENT ON FUNCTION public.reserve_agent_run(VARCHAR) IS
  'Reserva una ejecución antes de streamear: chequea los límites del día y suma 1 a total_runs en la misma llamada atómica. Devuelve allowed, reason (daily-runs o daily-tokens) y los contadores post incremento. Al terminar la ejecución hay que llamar a settle_agent_run con el mismo provider.';

-- ---------------------------------------------------------------------------
-- 5. Cerrar la reserva: sumar los tokens reales, o devolverla
-- ---------------------------------------------------------------------------
--
-- `reserve_agent_run` cuenta la ejecución pero no sabe cuántos tokens va a
-- gastar. `settle_agent_run` cierra el ciclo al final del stream, y NUNCA vuelve
-- a sumar a total_runs: contar es trabajo exclusivo de la reserva. Por eso la
-- ruta tiene que dejar de llamar a `record_agent_usage` cuando pase a este par
-- de funciones, o cada ejecución se contaría dos veces.
--
-- Criterio para no castigar una ejecución que falló:
--
--   Si la ejecución no produjo NI UN token, la reserva se devuelve (total_runs
--   baja 1, con piso en 0). Si produjo aunque sea uno, se queda contada.
--
-- El razonamiento es a quién le cobraron. Cero tokens significa que el
-- proveedor rechazó la llamada o se cayó antes de generar nada: no hubo gasto y
-- el usuario no recibió nada, así que quedarse la reserva sería cobrarle por un
-- error nuestro o del proveedor. Con un solo token ya hay una request facturada
-- contra su key, y además es la única forma de que cancelar el stream no siga
-- siendo gratis: quien corta a los tres segundos generó tokens, y esos cuentan.
--
-- Es deliberadamente asimétrico contra el usuario en el borde, porque el error
-- barato (regalarle una ejecución cuando el proveedor falló) es preferible al
-- caro (dejar abierta otra vez la evasión por cancelación).
--
-- La ruta la llama tanto en el camino feliz como en el `catch` del stream, con
-- los tokens que haya alcanzado a acumular. Si no llega a llamarse nunca (el
-- proceso se muere), la reserva queda contada: se pierde una ejecución del día,
-- no el límite.

CREATE OR REPLACE FUNCTION public.settle_agent_run(
  p_provider VARCHAR,
  p_tokens_input INTEGER,
  p_tokens_output INTEGER,
  p_cost NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_input INTEGER := COALESCE(p_tokens_input, 0);
  v_output INTEGER := COALESCE(p_tokens_output, 0);
  v_cost NUMERIC := COALESCE(p_cost, 0);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'settle_agent_run requiere un usuario autenticado';
  END IF;

  IF p_provider IS NULL OR btrim(p_provider) = '' THEN
    RAISE EXCEPTION 'settle_agent_run requiere un provider';
  END IF;

  -- Misma decisión que en record_agent_usage: los negativos son un abuso o un
  -- bug, no un dato a redondear. Acá importa todavía más, porque esta función
  -- es la única que resta.
  IF v_input < 0 OR v_output < 0 OR v_cost < 0 THEN
    RAISE EXCEPTION
      'settle_agent_run no acepta valores negativos (tokens_input=%, tokens_output=%, cost=%)',
      p_tokens_input, p_tokens_output, p_cost;
  END IF;

  -- Mismo lock que la reserva: si el usuario cierra una ejecución mientras
  -- reserva otra, las dos ven el contador consistente.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0::BIGINT));

  IF v_input = 0 AND v_output = 0 THEN
    -- Cero tokens: se devuelve la reserva. GREATEST protege el caso de un
    -- settle repetido o de un settle sin reserva previa.
    UPDATE usage_daily
    SET total_runs = GREATEST(0, total_runs - 1)
    WHERE user_id = v_user_id
      AND usage_date = CURRENT_DATE
      AND provider = p_provider;

    RETURN;
  END IF;

  -- Hubo tokens: la reserva se queda contada y se le suma el consumo real.
  -- El INSERT con total_runs = 1 solo se alcanza si no existe la fila del día
  -- para este provider, o sea si nunca hubo reserva (llamada suelta, o settle
  -- con un provider distinto al reservado). En ese caso contar la ejecución acá
  -- es lo correcto: lo que no se puede es perderla.
  INSERT INTO usage_daily (
    user_id, usage_date, provider,
    total_runs, total_tokens_input, total_tokens_output, total_cost_estimate_usd
  )
  VALUES (
    v_user_id, CURRENT_DATE, p_provider,
    1, v_input, v_output, v_cost
  )
  ON CONFLICT (user_id, usage_date, provider) DO UPDATE SET
    total_tokens_input = usage_daily.total_tokens_input + v_input,
    total_tokens_output = usage_daily.total_tokens_output + v_output,
    total_cost_estimate_usd = usage_daily.total_cost_estimate_usd + v_cost;
END;
$$;

COMMENT ON FUNCTION public.settle_agent_run(VARCHAR, INTEGER, INTEGER, NUMERIC) IS
  'Cierra una reserva de reserve_agent_run al terminar el stream. Suma los tokens y el costo reales sin volver a contar el run. Si la ejecución no produjo ni un token, devuelve la reserva restando 1 a total_runs.';

-- ---------------------------------------------------------------------------
-- 6. Permisos de las funciones nuevas
-- ---------------------------------------------------------------------------
--
-- Mismo criterio que en el punto 2: la ruta las llama con la sesión del usuario,
-- así que `authenticated` las necesita. Se le saca a PUBLIC y a `anon`, que no
-- tienen usuario del que sacar auth.uid() y solo pueden hacer ruido.
--
-- Un usuario logueado puede llamar a `reserve_agent_run` desde la consola y
-- gastarse su propia cuota. Es autolesión, no escalada: no puede subir el límite
-- ni tocar contadores ajenos (el user_id sale de auth.uid(), nunca de un
-- parámetro), y por el CHECK del punto 1 tampoco puede dejarlos en negativo.

REVOKE EXECUTE ON FUNCTION public.reserve_agent_run(VARCHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_agent_run(VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.reserve_agent_run(VARCHAR) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.settle_agent_run(VARCHAR, INTEGER, INTEGER, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_agent_run(VARCHAR, INTEGER, INTEGER, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_agent_run(VARCHAR, INTEGER, INTEGER, NUMERIC) TO authenticated;
