import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  UnauthorizedError,
  NotFoundError,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/auth/dal'
import { createServiceClient, hayServiceRole } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * Da de baja un código.
 *
 * No lo borra: `invite_redemptions` tiene una FK sin ON DELETE, así que un
 * código con canjes no se puede borrar, y es a propósito. Perder el registro de
 * con qué entró cada persona sería peor que dejar una fila de más.
 *
 * Se da de baja venciéndolo, no igualando el tope a los usos. Las dos cosas lo
 * cierran, pero la fecha se puede correr para reabrirlo sin tocar el contador,
 * mientras que mover el tope confunde para siempre cuántos usos tenía de
 * verdad.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await requireAdmin()

    if (!hayServiceRole()) {
      return NextResponse.json(
        { error: 'Esta instancia no está configurada. Falta la service role key.' },
        { status: 503 }
      )
    }

    // En Next 16 los params de una ruta dinámica llegan como promesa.
    const { code: crudo } = await params
    const code = decodeURIComponent(crudo ?? '').trim().toUpperCase()

    if (code === '') {
      return NextResponse.json({ error: 'Falta el código.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('invite_codes')
      .update({ expires_at: new Date().toISOString() })
      .eq('code', code)
      .select('code')
      .maybeSingle()

    if (error) {
      console.error('[admin/codes] dar de baja:', error.message)
      return NextResponse.json(
        { error: 'No se pudo dar de baja el código.' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'Ese código no existe.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse()
    if (e instanceof NotFoundError) return notFoundResponse()
    throw e
  }
}
