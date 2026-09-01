import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/proxy-session'
import { isSupabaseConfigured, isDevBypassAllowed } from '@/lib/supabase/is-configured'

/**
 * Rutas accesibles sin sesión.
 *
 * `/api/auth/redeem-invite` tiene que estar acá: canjea el código de invitación
 * antes del magic link, o sea que la llama alguien que por definición todavía no
 * tiene cuenta. Sin esto el proxy le respondería 401 y nadie podría registrarse.
 */
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/auth/signout',
  '/api/auth/redeem-invite',
]

/** Mensaje para quien tiene sesión válida pero no pasó por una invitación. */
const SIN_ACCESO =
  'Tu cuenta todavía no tiene acceso. Pedí tu invitación en la comunidad.'

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

/**
 * Si el perfil de este usuario tiene el acceso aprobado.
 *
 * Se consulta solo al entrar a `/login` con sesión, no en cada request: el
 * chequeo que manda es el de `lib/auth/dal.ts`, que corre en cada página y en
 * cada ruta de API. Acá se usa para una sola cosa, romper el rebote: sin esto,
 * quien tiene sesión pero no tiene acceso pide `/hub`, el layout lo manda a
 * `/login` porque `getUser()` le devuelve null, y el proxy lo devuelve a `/hub`
 * por tener cookie de sesión. El navegador termina en "demasiadas
 * redirecciones" y la persona nunca ve por qué quedó afuera.
 */
async function accesoAprobado(request: NextRequest, userId: string): Promise<boolean> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // Solo lectura: las cookies de sesión ya las refrescó updateSession y
        // esa respuesta es la que se devuelve. Escribir acá las pisaría.
        setAll() {},
      },
    }
  )

  const { data, error } = await supabase
    .from('community_profiles')
    .select('access_granted')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[proxy] no se pudo leer access_granted:', error.message)
    return false
  }

  return (
    typeof data === 'object' &&
    data !== null &&
    'access_granted' in data &&
    data.access_granted === true
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
    if (await accesoAprobado(request, userId)) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/hub'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }

    // Tiene sesión pero no tiene acceso: se queda en el login viendo por qué.
    // El parámetro se pone una sola vez, o el redirect se llamaría a sí mismo.
    if (!request.nextUrl.searchParams.has('error')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.searchParams.set('error', SIN_ACCESO)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
