import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export interface ProxySession {
  response: NextResponse
  userId: string | null
}

/**
 * Refresca la sesión de Supabase en cada request y devuelve la respuesta con
 * las cookies actualizadas.
 *
 * Ojo: hay que devolver exactamente este `response`. Si se crea uno nuevo más
 * adelante sin copiarle las cookies, la sesión se pierde en cada navegación y
 * el usuario queda deslogueado de forma intermitente.
 */
export async function updateSession(request: NextRequest): Promise<ProxySession> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, userId: user?.id ?? null }
}
