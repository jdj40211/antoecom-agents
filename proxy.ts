import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy-session'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'

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

  // Sin Supabase configurado no hay auth posible: se deja pasar todo para no
  // dejar el entorno de desarrollo inutilizable.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request })
  }

  const { response, userId } = await updateSession(request)

  if (!userId && !isPublic(pathname)) {
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
