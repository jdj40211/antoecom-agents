import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Guardar outputs necesita Supabase configurado.' },
        { status: 503 }
      )
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('runId' in body)) {
      return NextResponse.json({ error: 'runId requerido' }, { status: 400 })
    }

    const { runId, title } = body as { runId: string; title?: string }
    if (typeof runId !== 'string' || !runId.trim()) {
      return NextResponse.json({ error: 'runId inválido' }, { status: 400 })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // El FK y la policy ya impiden guardar un run ajeno, pero devolvemos un
    // error claro en vez de dejar que falle la constraint.
    const { data: run } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('id', runId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!run) {
      return NextResponse.json({ error: 'Esa ejecución no existe' }, { status: 404 })
    }

    const { error } = await supabase.from('saved_outputs').upsert(
      {
        user_id: user.id,
        run_id: runId,
        title: title?.slice(0, 200) ?? null,
      },
      { onConflict: 'user_id,run_id' }
    )

    if (error) {
      console.error('[saved] insert:', error.message)
      return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[saved] POST:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Guardar outputs necesita Supabase configurado.' },
        { status: 503 }
      )
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('id' in body)) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const { id } = body as { id: unknown }

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'id inválido' }, { status: 400 })
    }

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { error } = await supabase
      .from('saved_outputs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[saved] delete:', error.message)
      return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[saved] DELETE:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
