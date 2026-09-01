-- Invitaciones y acceso plano
--
-- Dos decisiones de producto que se aplican juntas porque se sostienen entre sí:
--
--  1. Se acaban los tiers. Trial, club y elite existían para racionar un gasto
--     que la plataforma nunca pagó: cada usuario trae su propia API key, así que
--     los tokens los factura su proveedor contra su cuenta. Racionar por plan no
--     protegía ninguna factura nuestra, solo separaba a la comunidad en
--     categorías que no correspondían a nada. Todos pasan a tener los 30 agentes
--     y un único límite, el que hoy tiene elite. Ese límite sobrevive con otro
--     propósito: es un freno técnico contra bucles y contra una pestaña colgada
--     disparando ejecuciones, y acota la factura de Vercel, que sí es nuestra.
--     No es un plan comercial y no debería presentarse como tal.
--
--  2. El registro deja de ser abierto y pasa por código de invitación. Son
--     varios códigos, no uno: cada camada o cada lanzamiento tiene el suyo, con
--     su vencimiento y su tope de usos, así que se puede abrir y cerrar el
--     ingreso por tanda sin tocar código ni variables de entorno.
--
-- El punto 2 es lo que hace viable al punto 1. Con el registro abierto, quitar
-- los tiers habría dejado el límite alto al alcance de cualquiera que se
-- registrara; con la puerta cerrada, adentro no hace falta jerarquía.
--
-- Lo que NO hace esta migración, a propósito: borrar `community_profiles.program`
-- ni `program_grants`. El código desplegado todavía las lee y la migración se
-- aplica antes de que termine el deploy. Quedan sin efecto y anotadas como
-- residuo a limpiar en una migración posterior, cuando ya no queden lectores.
--
-- Es idempotente: se puede pegar entera en el SQL editor de Supabase y correr
-- las veces que haga falta.

-- ---------------------------------------------------------------------------
-- 1. Los códigos de invitación
-- ---------------------------------------------------------------------------
--
-- La clave primaria es el código mismo y se guarda en mayúsculas. Nadie tipea un
-- código de invitación con el mismo casing con que se lo mandaron: llega por
-- WhatsApp, se copia a medias, se escribe a mano. Normalizar al guardar y al
-- comparar evita que 'camada3' y 'Camada3' sean dos cosas distintas, y evita
-- tener que acordarse de poner upper() en cada consulta futura. El CHECK obliga
-- a que la normalización se cumpla también cuando el código se inserta a mano
-- desde el SQL editor, que es como se van a crear siempre.
--
-- El largo mínimo no es capricho: el endpoint que canjea es público por
-- necesidad (ver punto 2), así que un código corto y adivinable es la puerta.
-- Conviene que cada código lleve un sufijo aleatorio, del estilo
-- 'CAMADA3-K7QX2M', y no solo el nombre de la camada.
--
-- expires_at NULL = no vence. max_uses NULL = ilimitado. Los dos NULL a la vez
-- dan un código permanente y sin tope, que es exactamente lo que no conviene
-- tener, pero es decisión del dueño y no de la tabla.

CREATE TABLE IF NOT EXISTS public.invite_codes (
  code TEXT PRIMARY KEY CHECK (
    code = upper(btrim(code)) AND length(code) >= 6
  ),
  label TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.invite_codes IS
  'Códigos de invitación para el registro. Uno por camada o lanzamiento. Se guardan en mayúsculas; expires_at NULL no vence y max_uses NULL no tiene tope.';
COMMENT ON COLUMN public.invite_codes.label IS
  'Para qué es el código, en texto libre: la camada, el lanzamiento, el evento. Solo se lee desde el SQL editor.';
COMMENT ON COLUMN public.invite_codes.uses IS
  'Canjes exitosos. Lo mueve redeem_invite_code, nunca la app ni el usuario.';

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Mismo criterio que program_grants: RLS activo y ninguna policy. Sin policies,
-- ni anon ni authenticated leen ni escriben esta tabla, así que un código no se
-- puede sacar desde la consola del navegador con la anon key. La tocan el
-- service_role y el SQL editor, que saltean RLS, y la función de canje, que es
-- SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- 2. Quién canjeó qué
-- ---------------------------------------------------------------------------
--
-- El correo es la clave primaria, o sea que un correo se registra una sola vez.
-- No es solo un dato de auditoría: es lo que impide que el mismo correo consuma
-- dos usos de la misma camada, y es lo que el trigger de alta consulta para
-- saber si ese usuario entró con invitación.
--
-- Se guarda en minúsculas por la misma razón que el código en mayúsculas: el
-- correo con el que se canjea y el que después llega en auth.users tienen que
-- ser comparables sin ambigüedad.
--
-- El FK contra invite_codes es a propósito sin ON DELETE: borrar un código con
-- canjes queda bloqueado. Dar de baja un código no es borrarlo, es vencerlo (ver
-- los ejemplos del final): borrarlo perdería el rastro de por dónde entró cada
-- persona, que es justamente para lo que sirve esta tabla.

CREATE TABLE IF NOT EXISTS public.invite_redemptions (
  email TEXT PRIMARY KEY CHECK (email = lower(btrim(email))),
  code TEXT NOT NULL REFERENCES public.invite_codes(code) ON UPDATE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_redemptions_code
  ON public.invite_redemptions (code, redeemed_at DESC);

COMMENT ON TABLE public.invite_redemptions IS
  'Qué correo canjeó qué código y cuándo. El correo es clave primaria: se registra una sola vez. handle_new_user la consulta para decidir access_granted.';

ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;

-- Sin policies, igual que arriba. Acá pesa más todavía: es la lista de correos
-- de la comunidad entera.

-- ---------------------------------------------------------------------------
-- 3. Canjear un código, en una sola llamada atómica
-- ---------------------------------------------------------------------------
--
-- Devuelve (allowed, reason), con los mismos nombres que reserve_agent_run para
-- que la ruta que la consuma no tenga que aprender otra convención.
--
--   allowed = true,  reason NULL           -> canjeado, sumar 1 al contador
--   allowed = true,  reason 'ya-canjeado'  -> ese correo ya tenía acceso
--   allowed = false, reason 'datos-incompletos'
--   allowed = false, reason 'codigo-invalido'
--
-- Sobre 'ya-canjeado' devolviendo allowed = true: la función se llama antes de
-- mandar el magic link, y pedir el link dos veces es lo más normal del mundo (no
-- llegó, se fue a spam, se cerró la pestaña). Si el segundo intento fallara, el
-- usuario quedaría trabado afuera con su código ya gastado. Como el correo ya
-- tiene acceso, dejarlo pasar no regala nada y no consume otro uso.
--
-- Sobre 'codigo-invalido' como único motivo de fallo: adentro se distingue
-- perfectamente entre un código que no existe, uno vencido y uno agotado, pero
-- afuera no. El endpoint que la llama es público por definición (quien todavía
-- no tiene cuenta tiene que poder golpearlo), así que responder 'agotado'
-- confirmaría que ese código existe y convertiría el formulario en un oráculo
-- para adivinar códigos a fuerza de intentos. El costo es que el mensaje en
-- español tiene que cubrir los tres casos a la vez, del estilo "Ese código no es
-- válido o ya no está disponible. Pedí uno nuevo en la comunidad."
--
-- Sobre la concurrencia: acá NO hace falta el advisory lock de reserve_agent_run.
-- Ese lock existe porque el límite diario se calcula sumando varias filas de
-- usage_daily (una por provider), y un lock de fila no serializa una suma. Este
-- caso es más simple: el tope vive en la misma fila que el contador, así que el
-- UPDATE condicional de abajo alcanza. Postgres bloquea la fila mientras uno de
-- los dos la actualiza y el otro reevalúa el WHERE contra la versión ya
-- incrementada, así que dos personas peleando por el último uso no pasan las
-- dos: la segunda no encuentra fila que cumpla la condición y se va con
-- 'codigo-invalido'. Un advisory lock acá sería serializar de más, y encima por
-- código: dos camadas distintas no tienen por qué esperarse.
--
-- El orden importa. Se incrementa primero y se anota después, y si el INSERT del
-- canje pierde una carrera contra sí mismo (el mismo correo dos veces en
-- paralelo) se devuelve el uso. Al revés (anotar y después incrementar) un
-- código agotado dejaría el canje anotado igual y regalaría acceso.

DROP FUNCTION IF EXISTS public.redeem_invite_code(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_email TEXT, p_code TEXT)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(btrim(COALESCE(p_email, '')));
  v_code TEXT := upper(btrim(COALESCE(p_code, '')));
  v_anotados INTEGER;
BEGIN
  IF v_email = '' OR v_code = '' OR position('@' IN v_email) = 0 THEN
    RETURN QUERY SELECT FALSE, 'datos-incompletos'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM invite_redemptions r WHERE r.email = v_email) THEN
    RETURN QUERY SELECT TRUE, 'ya-canjeado'::TEXT;
    RETURN;
  END IF;

  -- Existe, no venció y le quedan usos: las tres condiciones y el incremento en
  -- una sola sentencia, que es lo que la vuelve segura ante concurrencia.
  UPDATE invite_codes c
  SET uses = c.uses + 1
  WHERE c.code = v_code
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND (c.max_uses IS NULL OR c.uses < c.max_uses);

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'codigo-invalido'::TEXT;
    RETURN;
  END IF;

  INSERT INTO invite_redemptions (email, code)
  VALUES (v_email, v_code)
  ON CONFLICT (email) DO NOTHING;

  GET DIAGNOSTICS v_anotados = ROW_COUNT;

  IF v_anotados = 0 THEN
    -- Carrera del mismo correo contra sí mismo: entre el EXISTS de arriba y este
    -- INSERT, otra llamada lo anotó. El acceso ya está, así que el resultado es
    -- el bueno, pero el uso que acabamos de consumir hay que devolverlo o la
    -- camada pierde cupos por gente que hizo doble clic.
    UPDATE invite_codes c
    SET uses = GREATEST(0, c.uses - 1)
    WHERE c.code = v_code;

    RETURN QUERY SELECT TRUE, 'ya-canjeado'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.redeem_invite_code(TEXT, TEXT) IS
  'Canjea un código de invitación para un correo, antes de que el usuario exista. Devuelve allowed y reason (ya-canjeado, datos-incompletos, codigo-invalido). Solo la puede ejecutar el service_role.';

-- Permisos: esta función corre antes de que exista el usuario, así que no puede
-- apoyarse en auth.uid() y no hay sesión de la cual colgarse. La consecuencia es
-- que el permiso es el único control de acceso que tiene, y por eso queda en el
-- rol más chico posible.
--
-- Se le da EXECUTE solo al service_role. NO a anon: la anon key viaja en el
-- bundle del navegador, así que un GRANT a anon sería publicar el canje de
-- códigos como RPC abierto, con reintentos gratis y sin pasar por la ruta.
-- Tampoco a authenticated, que para este flujo no tiene sentido: quien canjea
-- todavía no tiene cuenta.
--
-- Esto obliga a que la ruta de registro use un cliente con
-- SUPABASE_SERVICE_ROLE_KEY (ya está en env.example) y nunca el cliente de
-- sesión. Es la parte que hay que respetar del lado del código: si la ruta lo
-- llama con la anon key, Postgres responde permission denied.
--
-- Lo que el permiso NO resuelve es que la ruta en sí es pública. El freno contra
-- adivinar códigos a fuerza bruta son tres cosas juntas: el motivo de fallo
-- único de acá arriba, el largo mínimo con sufijo aleatorio del punto 1, y un
-- rate limit por IP en la ruta, que es trabajo de la capa de aplicación.

REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Quién tiene acceso
-- ---------------------------------------------------------------------------
--
-- `access_granted` es la respuesta a "esta persona pasó por la puerta". Arranca
-- en false porque el default seguro es no dejar entrar, pero eso vale solo para
-- las filas nuevas: todos los perfiles que ya existen quedan en true en esta
-- misma migración. Nadie que hoy está adentro puede quedar afuera por un cambio
-- de reglas que llegó después.
--
-- El backfill va adentro del mismo bloque que crea la columna, y ese bloque
-- corre una sola vez. Si mañana se le revoca el acceso a alguien y esta
-- migración se vuelve a pegar en el SQL editor, un UPDATE suelto se lo
-- devolvería sin que nadie se entere. Atado a la creación de la columna, la
-- segunda corrida no toca ninguna fila.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'community_profiles'
      AND column_name = 'access_granted'
  ) THEN
    ALTER TABLE public.community_profiles
      ADD COLUMN access_granted BOOLEAN NOT NULL DEFAULT false;

    UPDATE public.community_profiles SET access_granted = TRUE;
  END IF;
END;
$$;

COMMENT ON COLUMN public.community_profiles.access_granted IS
  'Si esta persona pasó por un código de invitación. Lo escribe handle_new_user al registrarse; a mano se corrige desde el SQL editor. El usuario no puede editarlo.';

-- El usuario no elige si tiene acceso. La policy `users_update_own_profile`
-- decide qué FILA se toca, no qué columnas, así que el control real es el GRANT
-- por columna que puso 20260821000000. `access_granted` es una columna nueva y
-- por lo tanto queda afuera de ese grant sin hacer nada, pero se reescribe acá
-- entero y explícito: es la clase de invariante que se rompe sola el día que
-- alguien agregue una columna y haga GRANT UPDATE a secas para salir del paso.
-- Repetir el REVOKE y el GRANT es idempotente y deja la lista completa a la
-- vista, sin tener que ir a buscarla tres migraciones atrás.

REVOKE UPDATE ON public.community_profiles FROM anon, authenticated;

GRANT UPDATE (display_name, avatar_url, onboarded_at, updated_at)
  ON public.community_profiles TO authenticated;

-- Lo mismo para el INSERT, que 20260901120000 ya había acotado. Sin repetirlo,
-- un usuario sin fila de perfil podría crearse la suya con access_granted = true.

REVOKE INSERT ON public.community_profiles FROM anon, authenticated;

GRANT INSERT (id, display_name, avatar_url)
  ON public.community_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. El alta del usuario mira el canje
-- ---------------------------------------------------------------------------
--
-- El trigger es el único lugar donde el acceso se decide solo. La ruta de
-- registro canjea el código y anota el correo en invite_redemptions; cuando ese
-- correo termina de confirmarse y aparece en auth.users, acá se cierra el
-- círculo. Los dos pasos hablan por el correo y no por el user_id, porque en el
-- momento del canje el user_id no existe.
--
-- Queda en false el usuario que llega por un camino que no pasó por el canje: un
-- alta hecha a mano desde el panel de Supabase, un OAuth con un correo distinto
-- al que se invitó. No es un error, es el caso que hay que ver: la app lo manda
-- a una pantalla de "pedí tu invitación" y se arregla a mano si corresponde.
--
-- El bloque de `program` se conserva tal cual estaba aunque ya no cambie nada,
-- por la misma razón que la columna: mientras el código desplegado la lea, mejor
-- que lea un valor coherente y no NULL.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_program VARCHAR(20);
  v_access BOOLEAN;
BEGIN
  v_email := lower(btrim(COALESCE(NEW.email, '')));

  SELECT g.program INTO v_program
  FROM public.program_grants g
  WHERE g.email = v_email;

  v_access := EXISTS (
    SELECT 1 FROM public.invite_redemptions r WHERE r.email = v_email
  );

  INSERT INTO public.community_profiles (
    id, display_name, avatar_url, program, access_granted
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(v_program, 'trial'),
    v_access
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- El trigger `on_auth_user_created` del schema inicial sigue apuntando acá por
-- nombre, así que reemplazar la función alcanza y no hace falta tocarlo.

-- ---------------------------------------------------------------------------
-- 6. Un solo juego de límites
-- ---------------------------------------------------------------------------
--
-- rate_limit_config estaba indexada por programa: una fila para trial, otra para
-- club, otra para elite. Con los tiers afuera queda una sola fila, la de clave
-- 'all', con los valores que hasta hoy eran los de elite.
--
-- Las tres filas viejas no se borran todavía y se dejan con los mismos valores
-- que 'all'. El motivo es el mismo que para la columna `program`: el código
-- desplegado consulta esta tabla filtrando por programa
-- (lib/agents/rate-limiter.ts y la pantalla de perfil), y la migración se aplica
-- antes de que ese código se reemplace. Dejarlas vacías durante esa ventana
-- habría hecho caer al usuario contra los valores por defecto del rate limiter,
-- que son más bajos, y habría puesto un cero en el límite que muestra el perfil.
-- Con las filas sincronizadas, la ventana no se nota. Son residuo: una vez
-- desplegado el código que lee 'all', se limpian con
--   DELETE FROM public.rate_limit_config WHERE program <> 'all';
--
-- Los números (200 por día, 50 por hora, 2.000.000 de tokens) no son un plan.
-- Son un tope técnico: frenan un bucle o una pestaña colgada disparando
-- ejecuciones, y acotan lo que esas ejecuciones cuestan en Vercel. Los tokens
-- los paga el usuario con su propia key, así que el límite no está defendiendo
-- una factura nuestra de LLM, que no existe.

ALTER TABLE public.rate_limit_config
  DROP CONSTRAINT IF EXISTS rate_limit_config_program_check;

ALTER TABLE public.rate_limit_config
  ALTER COLUMN program SET DEFAULT 'all';

INSERT INTO public.rate_limit_config (
  program, max_runs_per_day, max_runs_per_hour, max_tokens_per_day
)
VALUES ('all', 200, 50, 2000000)
ON CONFLICT (program) DO UPDATE SET
  max_runs_per_day = EXCLUDED.max_runs_per_day,
  max_runs_per_hour = EXCLUDED.max_runs_per_hour,
  max_tokens_per_day = EXCLUDED.max_tokens_per_day;

UPDATE public.rate_limit_config
SET
  max_runs_per_day = 200,
  max_runs_per_hour = 50,
  max_tokens_per_day = 2000000
WHERE program <> 'all';

COMMENT ON COLUMN public.rate_limit_config.program IS
  'Clave de la fila. La única que cuenta es all. Las filas trial, club y elite quedan como residuo del esquema por tiers y se borran cuando ya nadie las lea.';

-- ---------------------------------------------------------------------------
-- 7. Reservar la ejecución sin mirar el programa
-- ---------------------------------------------------------------------------
--
-- Mismo cuerpo que en 20260901120000, con un solo cambio: ya no consulta el
-- programa del perfil ni lo usa para elegir los límites. Todos los usuarios caen
-- en la misma fila de rate_limit_config, así que la consulta al perfil dejó de
-- decidir nada y se va, junto con el COALESCE a 'trial' que servía para no
-- regalar cuota ante la duda.
--
-- El advisory lock por usuario se queda tal cual y por la misma razón de
-- siempre: el límite del día se calcula sumando todas las filas de usage_daily
-- del usuario (una por provider), y eso no lo serializa un lock de fila. Los
-- valores por defecto, para el caso de que la tabla de límites esté vacía, pasan
-- a ser los nuevos: 200 y 2.000.000, no 50 y 500.000.

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

  SELECT c.max_runs_per_day, c.max_tokens_per_day
  INTO v_max_runs, v_max_tokens
  FROM rate_limit_config c
  WHERE c.program = 'all';

  -- Mismos valores por defecto que lib/agents/rate-limiter.ts, para que la tabla
  -- vacía no signifique cosas distintas de cada lado.
  v_max_runs := COALESCE(v_max_runs, 200);
  v_max_tokens := COALESCE(v_max_tokens, 2000000);

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
  'Reserva una ejecución antes de streamear: chequea el límite del día y suma 1 a total_runs en la misma llamada atómica. El límite es único para todos los usuarios, sale de rate_limit_config donde program = all. Al terminar hay que llamar a settle_agent_run con el mismo provider.';

REVOKE EXECUTE ON FUNCTION public.reserve_agent_run(VARCHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_agent_run(VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.reserve_agent_run(VARCHAR) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Residuo del esquema por tiers
-- ---------------------------------------------------------------------------
--
-- Nada de lo que sigue se borra en esta migración, y nada de lo que sigue hace
-- algo. Queda anotado en la base misma para que el próximo que lo lea no gaste
-- media hora buscando dónde se usa.

COMMENT ON COLUMN public.community_profiles.program IS
  'Residuo del esquema por tiers. Ya no decide límites ni acceso a agentes: todos los usuarios tienen los mismos. Se conserva mientras el código desplegado la siga leyendo; se borra en una migración posterior.';

COMMENT ON TABLE public.program_grants IS
  'Residuo del esquema por tiers. Se sigue llenando y leyendo, pero el programa asignado ya no cambia nada. Se borra en una migración posterior.';

COMMENT ON FUNCTION public.grant_program(TEXT, VARCHAR) IS
  'Residuo del esquema por tiers. Sigue escribiendo program_grants y community_profiles.program, pero eso ya no cambia límites ni acceso: para dar o quitar acceso se usa access_granted. Se borra en una migración posterior.';

-- ---------------------------------------------------------------------------
-- 9. Recetario para el SQL editor
-- ---------------------------------------------------------------------------
--
-- Crear un código para una camada, con vencimiento y tope:
--
--   INSERT INTO public.invite_codes (code, label, expires_at, max_uses)
--   VALUES ('CAMADA3-K7QX2M', 'Camada 3, octubre', NOW() + INTERVAL '30 days', 50);
--
-- Crear uno sin vencimiento y sin tope (conviene evitarlo, pero se puede):
--
--   INSERT INTO public.invite_codes (code, label)
--   VALUES ('ELITE-PERMANENTE-9F2K', 'Invitaciones sueltas');
--
-- Ver el estado de todos los códigos, con lo que queda de cada uno:
--
--   SELECT
--     code,
--     label,
--     uses,
--     max_uses,
--     CASE WHEN max_uses IS NULL THEN NULL ELSE max_uses - uses END AS restantes,
--     expires_at,
--     created_at
--   FROM public.invite_codes
--   ORDER BY created_at DESC;
--
-- Ver quién entró con un código:
--
--   SELECT email, redeemed_at
--   FROM public.invite_redemptions
--   WHERE code = 'CAMADA3-K7QX2M'
--   ORDER BY redeemed_at DESC;
--
-- Dar de baja un código. No se borra: se vence, y así queda el rastro de quién
-- entró por él. Cualquiera de las dos formas sirve.
--
--   UPDATE public.invite_codes SET expires_at = NOW() WHERE code = 'CAMADA3-K7QX2M';
--   UPDATE public.invite_codes SET max_uses = uses WHERE code = 'CAMADA3-K7QX2M';
--
-- Reabrirlo o ampliarle el cupo:
--
--   UPDATE public.invite_codes
--   SET expires_at = NOW() + INTERVAL '15 days', max_uses = 80
--   WHERE code = 'CAMADA3-K7QX2M';
--
-- Dar acceso a mano a alguien que ya se registró y quedó afuera:
--
--   UPDATE public.community_profiles
--   SET access_granted = TRUE, updated_at = NOW()
--   WHERE id = (SELECT u.id FROM auth.users u WHERE lower(u.email) = 'alguien@ejemplo.com');
--
-- Quitarle el acceso a alguien:
--
--   UPDATE public.community_profiles
--   SET access_granted = FALSE, updated_at = NOW()
--   WHERE id = (SELECT u.id FROM auth.users u WHERE lower(u.email) = 'alguien@ejemplo.com');
--
-- Ver quién está adentro y quién quedó esperando invitación:
--
--   SELECT u.email, p.access_granted, p.created_at
--   FROM public.community_profiles p
--   JOIN auth.users u ON u.id = p.id
--   ORDER BY p.created_at DESC;
