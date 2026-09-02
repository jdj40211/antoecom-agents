import 'server-only'
import { createServiceClient, hayServiceRole } from '@/lib/supabase/service'

/** Lo que la interfaz necesita saber de un código. */
export interface CodigoVista {
  code: string
  label: string | null
  uses: number
  maxUses: number | null
  expiresAt: string | null
  createdAt: string
  estado: 'activo' | 'vencido' | 'agotado'
}

export interface CanjeVista {
  email: string
  code: string
  redeemedAt: string
}

/** Cuántos canjes se traen. Alcanza para una comunidad y evita cargar la tabla
 *  entera el día que sean miles. */
export const TOPE_CANJES = 200

export function estadoDe(
  expiresAt: string | null,
  uses: number,
  maxUses: number | null
): CodigoVista['estado'] {
  // El orden importa: un código vencido Y agotado se muestra como vencido,
  // porque reabrirlo pide corregir la fecha, que es lo primero que habría que
  // tocar.
  if (expiresAt && new Date(expiresAt) <= new Date()) return 'vencido'
  if (maxUses !== null && uses >= maxUses) return 'agotado'
  return 'activo'
}

export function aVista(fila: Record<string, unknown>): CodigoVista {
  const uses = typeof fila.uses === 'number' ? fila.uses : 0
  const maxUses = typeof fila.max_uses === 'number' ? fila.max_uses : null
  const expiresAt = typeof fila.expires_at === 'string' ? fila.expires_at : null

  return {
    code: String(fila.code ?? ''),
    label: typeof fila.label === 'string' ? fila.label : null,
    uses,
    maxUses,
    expiresAt,
    createdAt: typeof fila.created_at === 'string' ? fila.created_at : '',
    estado: estadoDe(expiresAt, uses, maxUses),
  }
}

/**
 * Los datos del panel, leídos desde el servidor.
 *
 * Se consulta acá y no con un fetch desde el navegador para que la pantalla
 * llegue con los datos puestos, sin un salto de vacío a lleno, y para no
 * exponer un endpoint de lectura que después haya que proteger aparte.
 *
 * Quien llame a esto ya tiene que haber verificado que es admin: esta función
 * usa la service role key y no valida permisos por su cuenta.
 */
export async function cargarPanel(): Promise<{
  codigos: CodigoVista[]
  canjes: CanjeVista[]
  configurado: boolean
}> {
  if (!hayServiceRole()) {
    return { codigos: [], canjes: [], configurado: false }
  }

  const supabase = createServiceClient()

  const [rc, rr] = await Promise.all([
    supabase
      .from('invite_codes')
      .select('code, label, uses, max_uses, expires_at, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('invite_redemptions')
      .select('email, code, redeemed_at')
      .order('redeemed_at', { ascending: false })
      .limit(TOPE_CANJES),
  ])

  if (rc.error) console.error('[admin] códigos:', rc.error.message)
  if (rr.error) console.error('[admin] canjes:', rr.error.message)

  return {
    codigos: (rc.data ?? []).map(aVista),
    canjes: (rr.data ?? []).map((fila) => ({
      email: String(fila.email ?? ''),
      code: String(fila.code ?? ''),
      redeemedAt: typeof fila.redeemed_at === 'string' ? fila.redeemed_at : '',
    })),
    configurado: true,
  }
}
