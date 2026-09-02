-- Quién administra la comunidad
--
-- Los códigos de invitación se creaban pegando SQL en este mismo editor. Eso
-- obliga a entrar al panel de Supabase para algo tan cotidiano como abrirle la
-- puerta a una camada nueva, así que pasa a hacerse desde la app, en /admin.
--
-- El flag vive en el perfil y NO se puede encender desde la aplicación: si un
-- admin pudiera nombrar a otro desde la interfaz, alcanzaría con una sola
-- cuenta comprometida para que el atacante se volviera permanente. Nombrar a
-- alguien es una decisión de dueño, y se toma acá, con la query del final.

-- ---------------------------------------------------------------------------
-- 1. El flag
-- ---------------------------------------------------------------------------

ALTER TABLE public.community_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.community_profiles.is_admin IS
  'Habilita /admin: crear códigos de invitación, darlos de baja y ver quién entró con cuál. Solo se enciende desde el SQL editor, nunca desde la app.';

-- ---------------------------------------------------------------------------
-- 2. El usuario no se puede nombrar a sí mismo
-- ---------------------------------------------------------------------------
--
-- Es el mismo problema que ya resolvieron 20260821000000 con `program` y
-- 20260901180000 con `access_granted`: la policy decide QUÉ FILA se toca, no
-- qué columnas, y el navegador tiene la anon key. Sin esto, un
-- `update({is_admin: true})` desde la consola contra la propia fila pasaría RLS
-- sin problema.
--
-- Los dos GRANT se reescriben enteros, en vez de asumir que el anterior sigue
-- en pie: así esta migración es correcta por sí sola y no depende del orden en
-- que se hayan aplicado las otras.

REVOKE UPDATE ON public.community_profiles FROM anon, authenticated;

GRANT UPDATE (display_name, avatar_url, onboarded_at, updated_at)
  ON public.community_profiles TO authenticated;

REVOKE INSERT ON public.community_profiles FROM anon, authenticated;

GRANT INSERT (id, display_name, avatar_url)
  ON public.community_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Nombrar y quitar administradores
-- ---------------------------------------------------------------------------
--
-- Se hace por correo y no por id, que es lo que uno tiene a mano. La persona
-- ya tiene que haber entrado alguna vez: antes de eso no existe su fila de
-- perfil y no hay nada que marcar.
--
--   SELECT set_admin('alguien@ejemplo.com', true);   -- nombrar
--   SELECT set_admin('alguien@ejemplo.com', false);  -- quitar

CREATE OR REPLACE FUNCTION public.set_admin(p_email TEXT, p_is_admin BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(btrim(COALESCE(p_email, '')));
  v_user_id UUID;
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'set_admin requiere un correo';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = v_email;

  IF v_user_id IS NULL THEN
    RETURN 'No hay ningún usuario con ese correo. Tiene que entrar a la app al menos una vez.';
  END IF;

  UPDATE community_profiles
  SET is_admin = COALESCE(p_is_admin, false), updated_at = NOW()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN 'El usuario existe pero no tiene perfil. Revisá el trigger handle_new_user.';
  END IF;

  RETURN CASE
    WHEN COALESCE(p_is_admin, false) THEN 'Listo, ya es administrador.'
    ELSE 'Listo, ya no es administrador.'
  END;
END;
$$;

COMMENT ON FUNCTION public.set_admin(TEXT, BOOLEAN) IS
  'Nombra o quita un administrador por correo. Solo se llama desde el SQL editor: la app no la puede ejecutar.';

-- Mismo criterio que grant_program: nadie la llama desde la aplicación, así que
-- se le revoca a todos. El SQL editor la ejecuta igual, porque corre como
-- dueño de la base y no pasa por estos permisos.

REVOKE EXECUTE ON FUNCTION public.set_admin(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_admin(TEXT, BOOLEAN) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Para copiar y pegar
-- ---------------------------------------------------------------------------
--
-- Nombrar a los administradores, una vez que entraron a la app:
--
--   SELECT set_admin('juandasierra111@gmail.com', true);
--   SELECT set_admin('fidelia.shopify@gmail.com', true);
--
-- Ver quiénes lo son hoy:
--
--   SELECT u.email, p.is_admin, p.access_granted
--   FROM public.community_profiles p
--   JOIN auth.users u ON u.id = p.id
--   WHERE p.is_admin;
