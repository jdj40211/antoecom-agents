import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'

const MAX_NAME_LENGTH = 200

/**
 * Actualiza el perfil del usuario.
 *
 * Solo el nombre. El programa (club, elite, trial) no se toca desde acá ni
 * desde ningún lado que dependa del cliente: define el rate limit, así que se
 * asigna del lado de la base. Ver supabase/migrations/*_program_control.sql.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Editar el perfil necesita Supabase configurado.' },
        { status: 503 }
      )
    }

    const body: unknown = await request.json()

    if (typeof body !== 'object' || body === null || !('displayName' in body)) {
      return NextResponse.json({ error: 'displayName requerido' }, { status: 400 })
    }

    const { displayName } = body as { displayName: unknown }

    if (typeof displayName !== 'string') {
      return NextResponse.json({ error: 'displayName tiene que ser texto' }, { status: 400 })
    }

    const name = displayName.trim()

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `El nombre no puede pasar de ${MAX_NAME_LENGTH} caracteres.` },
        { status: 400 }
      )
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { error } = await supabase
      .from('community_profiles')
      .update({ display_name: name || null, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      console.error('[profile] update:', error.message)
      return NextResponse.json({ error: 'No pudimos guardar los cambios.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, displayName: name })
  } catch (err) {
    console.error('[profile] PATCH:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
