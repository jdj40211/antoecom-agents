import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Detrás del load balancer de Vercel, `nextUrl.origin` puede resolver a
 * localhost. El host real viene en x-forwarded-host, así que si está lo
 * usamos para no redirigir al usuario a una URL que no existe.
 */
function resolveOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (!forwardedHost) return request.nextUrl.origin

  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${forwardedHost}`
}

/** Evita open redirects: solo aceptamos rutas internas. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/hub'
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = resolveOrigin(request)
  const next = safeNext(searchParams.get('next'))

  const loginWithError = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)

  // Supabase devuelve el error acá cuando el enlace expiró o ya se usó.
  const errorDescription = searchParams.get('error_description')
  if (errorDescription) return loginWithError(errorDescription)

  const code = searchParams.get('code')
  if (!code) return loginWithError('El enlace no es válido. Pedí uno nuevo.')

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession:', error.message)
    return loginWithError('El enlace expiró o ya fue usado. Pedí uno nuevo.')
  }

  return NextResponse.redirect(`${origin}${next}`)
}
