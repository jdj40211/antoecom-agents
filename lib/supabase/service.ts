import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con la service role key: saltea RLS por completo.
 *
 * Es el único que puede tocar `invite_codes` e `invite_redemptions`, que tienen
 * RLS activo y cero policies a propósito. Solo se usa en el servidor y solo
 * detrás de un chequeo de permisos: una ruta que lo cree sin validar antes
 * quién está del otro lado le está dando acceso total a la base a cualquiera.
 *
 * Sin sesión ni refresh: no representa a ningún usuario, así que guardar estado
 * de auth entre llamadas no tendría sentido y solo abriría la puerta a que una
 * request herede el contexto de otra.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

/**
 * Si esta instancia puede usar el cliente de servicio.
 *
 * En un deploy al que le falte la env var, las rutas que dependen de esto
 * tienen que responder que la instancia no está configurada, no reventar con un
 * error de credenciales que no le dice nada a nadie.
 */
export function hayServiceRole(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
