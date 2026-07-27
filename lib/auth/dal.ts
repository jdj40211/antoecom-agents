import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'

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
 * Devuelve el usuario autenticado, o null.
 *
 * Usa `auth.getUser()`, que valida el token contra Supabase. No usar
 * `getSession()` acá: lee la cookie sin verificarla, así que un cliente puede
 * falsificarla.
 *
 * Va envuelto en `cache()` para que múltiples llamadas dentro del mismo
 * request compartan una sola verificación.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) {
    return { ...DEV_USER }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

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
