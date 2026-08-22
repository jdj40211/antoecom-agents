-- Control del programa (club, elite, trial)
--
-- Resuelve dos cosas que quedaron abiertas en el schema inicial:
--
--  1. La policy `users_update_own_profile` permite actualizar cualquier columna
--     de la propia fila, `program` incluida. Como el navegador tiene la anon
--     key, cualquier usuario podía ponerse 'elite' desde la consola y pasar de
--     10 a 200 ejecuciones por día. RLS decide QUÉ FILAS se tocan, no qué
--     columnas: eso se resuelve con permisos por columna.
--
--  2. No existía forma de asignar programa. Todos quedaban en 'trial' para
--     siempre, así que la distinción club/elite no servía para nada.

-- ---------------------------------------------------------------------------
-- 1. El usuario solo edita lo que es suyo de verdad
-- ---------------------------------------------------------------------------
REVOKE UPDATE ON public.community_profiles FROM anon, authenticated;

GRANT UPDATE (display_name, avatar_url, onboarded_at, updated_at)
  ON public.community_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Asignación de programa por email
-- ---------------------------------------------------------------------------
CREATE TABLE public.program_grants (
  email TEXT PRIMARY KEY,
  program VARCHAR(20) NOT NULL CHECK (program IN ('club', 'elite', 'trial')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.program_grants IS
  'Programa asignado por email. Se aplica al registrarse, y grant_program() lo aplica también a quien ya existe.';

ALTER TABLE public.program_grants ENABLE ROW LEVEL SECURITY;

-- A propósito sin policies: con RLS activo y ninguna policy, ni anon ni
-- authenticated pueden leerla ni escribirla. Solo el service_role y el SQL
-- editor, que saltean RLS.

-- ---------------------------------------------------------------------------
-- 3. Al registrarse, el perfil toma el programa que le hayan asignado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program VARCHAR(20);
BEGIN
  SELECT g.program INTO v_program
  FROM public.program_grants g
  WHERE g.email = lower(NEW.email);

  INSERT INTO public.community_profiles (id, display_name, avatar_url, program)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(v_program, 'trial')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Asignar un programa, exista el usuario o no
-- ---------------------------------------------------------------------------
--
-- Uso desde el SQL editor de Supabase:
--   SELECT grant_program('alguien@ejemplo.com', 'club');
--
CREATE OR REPLACE FUNCTION public.grant_program(p_email TEXT, p_program VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_user_id UUID;
BEGIN
  IF p_program NOT IN ('club', 'elite', 'trial') THEN
    RAISE EXCEPTION 'Programa inválido: %. Usar club, elite o trial.', p_program;
  END IF;

  INSERT INTO public.program_grants (email, program)
  VALUES (v_email, p_program)
  ON CONFLICT (email) DO UPDATE SET program = EXCLUDED.program;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = v_email;

  IF v_user_id IS NULL THEN
    RETURN 'Guardado. Se le aplica cuando se registre.';
  END IF;

  UPDATE public.community_profiles
  SET program = p_program, updated_at = NOW()
  WHERE id = v_user_id;

  RETURN 'Aplicado a un usuario que ya existía.';
END;
$$;

-- Postgres da EXECUTE a PUBLIC en toda función nueva. Sin esto, cualquier
-- usuario logueado podría llamar al RPC y asignarse elite, que es justo lo que
-- el punto 1 acaba de cerrar.
REVOKE EXECUTE ON FUNCTION public.grant_program(TEXT, VARCHAR) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_program(TEXT, VARCHAR) FROM anon, authenticated;
