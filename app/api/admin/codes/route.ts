import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin,
  UnauthorizedError,
  NotFoundError,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/auth/dal'
import { createServiceClient, hayServiceRole } from '@/lib/supabase/service'
import { aVista } from '@/lib/admin/queries'

export const dynamic = 'force-dynamic'

/**
 * Traduce el error de Postgres a algo que se pueda leer.
 *
 * La tabla exige el código en mayúsculas y de al menos 6 caracteres, así que un
 * código corto no llega como error de validación sino como violación de CHECK,
 * con un mensaje que menciona el nombre de la constraint. Eso no se le muestra
 * a nadie.
 */
function mensajeDeError(code: string | undefined, detalle: string): string {
  if (code === '23505') return 'Ya existe un código con ese nombre.'
  if (code === '23514') {
    return 'El código tiene que ser de al menos 6 caracteres, sin espacios ni símbolos raros.'
  }
  console.error('[admin/codes]', detalle)
  return 'No se pudo guardar el código. Probá de nuevo.'
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    if (!hayServiceRole()) {
      return NextResponse.json(
        { error: 'Esta instancia no está configurada. Falta la service role key.' },
        { status: 503 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'No pudimos leer los datos.' }, { status: 400 })
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'No pudimos leer los datos.' }, { status: 400 })
    }

    const datos = body as Record<string, unknown>

    const code = String(datos.code ?? '').trim().toUpperCase()
    if (code.length < 6) {
      return NextResponse.json(
        { error: 'El código tiene que ser de al menos 6 caracteres.' },
        { status: 400 }
      )
    }

    const label =
      typeof datos.label === 'string' && datos.label.trim() !== ''
        ? datos.label.trim()
        : null

    // Los dos son opcionales de verdad: sin vencimiento no vence, sin tope no
    // se agota. Un 0 o un número negativo en el tope no son "sin tope", son un
    // error de quien lo escribió.
    let maxUses: number | null = null
    if (datos.maxUses !== null && datos.maxUses !== undefined && datos.maxUses !== '') {
      const n = Number(datos.maxUses)
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json(
          { error: 'El tope de usos tiene que ser un número entero mayor que cero.' },
          { status: 400 }
        )
      }
      maxUses = n
    }

    let expiresAt: string | null = null
    if (typeof datos.expiresAt === 'string' && datos.expiresAt.trim() !== '') {
      const fecha = new Date(datos.expiresAt)
      if (Number.isNaN(fecha.getTime())) {
        return NextResponse.json({ error: 'La fecha no es válida.' }, { status: 400 })
      }
      if (fecha <= new Date()) {
        return NextResponse.json(
          { error: 'La fecha de vencimiento tiene que ser futura.' },
          { status: 400 }
        )
      }
      expiresAt = fecha.toISOString()
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('invite_codes')
      .insert({ code, label, max_uses: maxUses, expires_at: expiresAt })
      .select('code, label, uses, max_uses, expires_at, created_at')
      .single()

    if (error) {
      return NextResponse.json(
        { error: mensajeDeError(error.code, error.message) },
        { status: error.code === '23505' ? 409 : 400 }
      )
    }

    return NextResponse.json({ code: aVista(data) }, { status: 201 })
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse()
    if (e instanceof NotFoundError) return notFoundResponse()
    throw e
  }
}
