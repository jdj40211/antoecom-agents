import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy-session'
import { isSupabaseConfigured, isDevBypassAllowed } from '@/lib/supabase/is-configured'

/** Rutas accesibles sin sesión. */
const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/signout']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

/**
 * Chequeo optimista: redirige al login a quien no tenga sesión y saca del
 * login a quien ya la tenga. La verificación real vive en lib/auth/dal.ts,
 * que es lo que consultan las rutas de API y las páginas.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sin Supabase configurado no hay auth posible. En local se deja pasar todo
  // para no inutilizar el entorno de desarrollo; en un deploy se cierra, así
  // un preview al que le falten las env vars no queda abierto al que pase.
  if (!isSupabaseConfigured()) {
    if (isDevBypassAllowed() || isPublic(pathname)) {
      return NextResponse.next({ request })
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Esta instancia no está configurada. Avisale al administrador.' },
        { status: 503 }
      )
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  const { response, userId } = await updateSession(request)

  if (!userId && !isPublic(pathname)) {
    // Las rutas de API responden 401 en JSON. Si redirigieran al login, un
    // fetch() seguiría el redirect y recibiría el HTML del login con status
    // 200, así que el cliente lo tomaría por una respuesta válida.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Tu sesión expiró. Volvé a iniciar sesión.' },
        { status: 401 }
      )
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (userId && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/hub'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
