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
  /** Habilita /admin. Se enciende solo desde el SQL editor, con set_admin(). */
  isAdmin: boolean
}

/**
 * Lee `access_granted` de una fila de perfil sin castear.
 *
 * El cliente de Supabase no está tipado contra el schema, así que la fila llega
 * como dato sin forma. Se chequea acá, y solo el `true` explícito cuenta: un
 * NULL, un campo que no vino o una fila que no existe son "no tiene acceso".
 */
function tieneAcceso(fila: unknown): boolean {
  return leeBandera(fila, 'access_granted')
}

/** Igual que `tieneAcceso`, para el flag de administrador. */
function esAdmin(fila: unknown): boolean {
  return leeBandera(fila, 'is_admin')
}

function leeBandera(fila: unknown, campo: string): boolean {
  return (
    typeof fila === 'object' &&
    fila !== null &&
    campo in fila &&
    (fila as Record<string, unknown>)[campo] === true
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
    // En local el usuario de dev es admin, si no /admin sería imposible de
    // desarrollar sin un proyecto de Supabase detrás.
    return isDevBypassAllowed() ? { ...DEV_USER, isAdmin: true } : null
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
    .select('access_granted, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (perfilError) {
    console.error('[auth] no se pudo leer access_granted:', perfilError.message)
    return null
  }

  if (!tieneAcceso(perfil)) return null

  return { id: user.id, email: user.email ?? '', isAdmin: esAdmin(perfil) }
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

/**
 * Devuelve el usuario solo si es administrador. Lanza si no lo es.
 *
 * Ojo con el error que lanza según el caso: a un usuario común que escriba
 * /admin a mano se le responde como si la ruta no existiera, en vez de decirle
 * que no tiene permiso. Confirmarle que existe un panel de administración es
 * regalarle la mitad del trabajo a quien esté buscando por dónde entrar.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getUser()
  if (!user) throw new UnauthorizedError()
  if (!user.isAdmin) throw new NotFoundError()
  return user
}

export class UnauthorizedError extends Error {
  constructor() {
    super('No autenticado')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Se usa cuando alguien pide algo a lo que no llega. Se llama "no encontrado" y
 * no "prohibido" a propósito: ver el mismo 404 que vería con una URL inventada
 * no le dice nada sobre qué existe del otro lado.
 */
export class NotFoundError extends Error {
  constructor() {
    super('No encontrado')
    this.name = 'NotFoundError'
  }
}

/** Respuesta 404 para las rutas de API que no le corresponden a este usuario. */
export function notFoundResponse(): Response {
  return Response.json({ error: 'No encontrado.' }, { status: 404 })
}

/** Respuesta 401 estándar para las rutas de API. */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: 'Tenés que iniciar sesión para hacer esto.' },
    { status: 401 }
  )
}
