import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, isDevBypassAllowed } from '@/lib/supabase/is-configured'

/**
 * Usuario de desarrollo. Solo se usa cuando Supabase no está configurado, para
 * poder levantar la app en local sin proyecto. En cuanto hay Supabase, este
 * valor deja de existir y todo sale de la sesión real.
 */
const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@local',
} as const

export interface SessionUser {
  id: string
  email: string
}

/**
 * Lee `access_granted` de una fila de perfil sin castear.
 *
 * El cliente de Supabase no está tipado contra el schema, así que la fila llega
 * como dato sin forma. Se chequea acá, y solo el `true` explícito cuenta: un
 * NULL, un campo que no vino o una fila que no existe son "no tiene acceso".
 */
function tieneAcceso(fila: unknown): boolean {
  return (
    typeof fila === 'object' &&
    fila !== null &&
    'access_granted' in fila &&
    fila.access_granted === true
  )
}

/**
 * Devuelve el usuario autenticado y con acceso aprobado, o null.
 *
 * Usa `auth.getUser()`, que valida el token contra Supabase. No usar
 * `getSession()` acá: lee la cookie sin verificarla, así que un cliente puede
 * falsificarla.
 *
 * Tener sesión no alcanza: además hay que haber pasado por un código de
 * invitación. `community_profiles.access_granted` es lo que lo registra, y lo
 * escribe el trigger de alta mirando `invite_redemptions`. Sin este chequeo,
 * quien se diera de alta por un camino que no pasa por el formulario (un alta a
 * mano en el panel de Supabase, un OAuth con otro correo) entraría igual: la
 * sesión sería perfectamente válida y nadie estaría mirando la puerta.
 *
 * Ante la duda se cierra: si la consulta falla o el perfil no existe, no hay
 * acceso. Un error de red que deja gente afuera un minuto es mejor que uno que
 * abre la app entera mientras dura.
 *
 * Va envuelto en `cache()` para que múltiples llamadas dentro del mismo
 * request compartan una sola verificación, incluida esta consulta.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) {
    // Sin Supabase no hay forma de autenticar a nadie. En local se devuelve el
    // usuario de dev; en un deploy no hay sesión y punto, para que un preview
    // sin env vars no quede abierto.
    //
    // El usuario de dev no pasa por el chequeo de acceso: no hay base donde
    // consultarlo, y hacerlo fallar cerrado dejaría el entorno local inservible.
    return isDevBypassAllowed() ? { ...DEV_USER } : null
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  // La policy `users_read_own_profile` deja leer solo la fila propia, así que
  // esta consulta no necesita más permisos que la sesión que ya tenemos.
  const { data: perfil, error: perfilError } = await supabase
    .from('community_profiles')
    .select('access_granted')
    .eq('id', user.id)
    .maybeSingle()

  if (perfilError) {
    console.error('[auth] no se pudo leer access_granted:', perfilError.message)
    return null
  }

  if (!tieneAcceso(perfil)) return null

  return { id: user.id, email: user.email ?? '' }
})

/**
 * Igual que getUser pero lanza si no hay sesión. Para rutas de API que no
 * deben ejecutarse jamás sin usuario.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export class UnauthorizedError extends Error {
  constructor() {
    super('No autenticado')
    this.name = 'UnauthorizedError'
  }
}

/** Respuesta 401 estándar para las rutas de API. */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: 'Tenés que iniciar sesión para hacer esto.' },
    { status: 401 }
  )
}
