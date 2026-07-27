import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const origin = forwardedHost
    ? `${request.headers.get('x-forwarded-proto') ?? 'https'}://${forwardedHost}`
    : request.nextUrl.origin

  return NextResponse.redirect(`${origin}/login`, { status: 303 })
}
