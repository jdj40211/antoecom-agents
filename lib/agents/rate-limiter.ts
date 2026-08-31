import { createClient } from '@/lib/supabase/server'

/** Qué límite se alcanzó, para poder explicárselo al usuario. */
export type RateLimitReason = 'daily-runs' | 'hourly-runs' | 'daily-tokens'

export interface RateLimitResult {
  allowed: boolean
  /** Ejecuciones que le quedan hoy. */
  remaining: number
  /** Límite diario de ejecuciones. */
  limit: number
  reason: RateLimitReason | null
}

const ALLOWED: RateLimitResult = {
  allowed: true,
  remaining: 999,
  limit: 999,
  reason: null,
}

/**
 * Chequea si el usuario puede ejecutar otro agente.
 *
 * Aplica los tres límites de `rate_limit_config`: ejecuciones por día, por hora
 * y tokens por día. Durante un tiempo solo se aplicó el diario, así que los
 * otros dos existían en la tabla sin efecto.
 *
 * Falla abierto: si las consultas no responden, se deja pasar. Preferimos
 * regalar ejecuciones antes que bloquear a todo el mundo por un problema
 * nuestro.
 */
export async function checkRateLimit(
  userId: string,
  program: string
): Promise<RateLimitResult> {
  const supabase = await createClient()

  // En UTC, igual que el CURRENT_DATE de record_agent_usage. Si acá se usara
  // la fecha local del server, cerca de medianoche se contaría contra un día
  // que la función SQL nunca escribe.
  const today = new Date().toISOString().slice(0, 10)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // usage_daily tiene una fila por (usuario, día, provider), así que hay que
  // sumarlas todas. Con .maybeSingle() esto reventaba en cuanto alguien usaba
  // dos providers el mismo día, y como la función falla abierto, el efecto era
  // que el límite diario dejaba de aplicarse.
  const { data: usageRows, error: usageError } = await supabase
    .from('usage_daily')
    .select('total_runs, total_tokens_input, total_tokens_output')
    .eq('user_id', userId)
    .eq('usage_date', today)

  if (usageError) {
    console.warn('[rate-limiter] usage_daily query error:', usageError.message)
    return ALLOWED
  }

  const { data: limitRow, error: limitError } = await supabase
    .from('rate_limit_config')
    .select('max_runs_per_day, max_runs_per_hour, max_tokens_per_day')
    .eq('program', program)
    .maybeSingle()

  if (limitError) {
    console.warn('[rate-limiter] rate_limit_config query error:', limitError.message)
    return ALLOWED
  }

  const rows = usageRows ?? []

  const runsToday = rows.reduce(
    (total, row) => total + ((row.total_runs as number | null) ?? 0),
    0
  )
  const tokensToday = rows.reduce(
    (total, row) =>
      total +
      ((row.total_tokens_input as number | null) ?? 0) +
      ((row.total_tokens_output as number | null) ?? 0),
    0
  )

  const dailyRuns = (limitRow?.max_runs_per_day as number | null) ?? 50
  const hourlyRuns = (limitRow?.max_runs_per_hour as number | null) ?? 20
  const dailyTokens = (limitRow?.max_tokens_per_day as number | null) ?? 500_000

  const remaining = Math.max(0, dailyRuns - runsToday)

  if (remaining === 0) {
    return { allowed: false, remaining: 0, limit: dailyRuns, reason: 'daily-runs' }
  }

  if (tokensToday >= dailyTokens) {
    return { allowed: false, remaining, limit: dailyTokens, reason: 'daily-tokens' }
  }

  // El límite por hora se cuenta sobre agent_runs, no sobre usage_daily, que
  // solo tiene totales del día. Entran también las que fallaron: es un límite
  // de ritmo, y un bucle de ejecuciones que fallan igual pega contra el
  // proveedor.
  const { count, error: hourError } = await supabase
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  if (hourError) {
    console.warn('[rate-limiter] agent_runs hourly query error:', hourError.message)
    return { allowed: true, remaining, limit: dailyRuns, reason: null }
  }

  if ((count ?? 0) >= hourlyRuns) {
    return { allowed: false, remaining, limit: hourlyRuns, reason: 'hourly-runs' }
  }

  return { allowed: true, remaining, limit: dailyRuns, reason: null }
}
