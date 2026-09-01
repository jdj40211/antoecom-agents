import { createClient } from '@/lib/supabase/server'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

/** Qué límite se alcanzó, para poder explicárselo al usuario. */
export type RateLimitReason = 'daily-runs' | 'hourly-runs' | 'daily-tokens'

export interface RateLimitResult {
  allowed: boolean
  /** Ejecuciones que le quedan hoy. */
  remaining: number
  /** Límite que se evaluó, para poder nombrarlo en el mensaje. */
  limit: number
  reason: RateLimitReason | null
}

export interface ReservationResult extends RateLimitResult {
  /**
   * true cuando la ejecución quedó efectivamente reservada en `usage_daily` y
   * hay que cerrarla con `settleAgentRun` al terminar el stream.
   *
   * false cuando se decidió por el camino heredado (la migración con
   * `reserve_agent_run` todavía no está aplicada). En ese caso el uso se
   * contabiliza al final con `recordAgentUsage`, como antes.
   */
  reserved: boolean
}

interface ProgramLimits {
  dailyRuns: number
  hourlyRuns: number
  dailyTokens: number
}

/**
 * Valores por defecto cuando `rate_limit_config` no tiene fila para el programa.
 * Tienen que coincidir con los de `reserve_agent_run` en la migración: si los
 * dos lados asumen cosas distintas, el límite que ve la ruta y el que aplica la
 * base dejan de ser el mismo.
 */
const DEFAULT_LIMITS: ProgramLimits = {
  dailyRuns: 50,
  hourlyRuns: 20,
  dailyTokens: 500_000,
}

/** Todo permitido: se usa cuando una consulta falla y preferimos no bloquear. */
const ALLOWED: RateLimitResult = {
  allowed: true,
  remaining: 999,
  limit: 999,
  reason: null,
}

/**
 * Texto en español para cada límite. Vive acá para que `/api/agents/run` y
 * `/api/agents/enhance` le digan exactamente lo mismo al usuario.
 */
export function rateLimitMessage(reason: RateLimitReason | null, limit: number): string {
  switch (reason) {
    case 'daily-runs':
      return `Llegaste al límite de ${limit} ejecuciones por día de tu plan. Se renueva mañana.`
    case 'hourly-runs':
      return `Llegaste al límite de ${limit} ejecuciones por hora de tu plan. Probá de nuevo en un rato.`
    case 'daily-tokens':
      return 'Llegaste al límite de tokens por día de tu plan. Se renueva mañana.'
    default:
      return 'Llegaste al límite de uso de tu plan. Se renueva mañana.'
  }
}

async function fetchProgramLimits(
  supabase: ServerSupabase,
  program: string
): Promise<ProgramLimits | null> {
  const { data, error } = await supabase
    .from('rate_limit_config')
    .select('max_runs_per_day, max_runs_per_hour, max_tokens_per_day')
    .eq('program', program)
    .maybeSingle()

  if (error) {
    console.warn('[rate-limiter] rate_limit_config query error:', error.message)
    return null
  }

  return {
    dailyRuns: (data?.max_runs_per_day as number | null) ?? DEFAULT_LIMITS.dailyRuns,
    hourlyRuns: (data?.max_runs_per_hour as number | null) ?? DEFAULT_LIMITS.hourlyRuns,
    dailyTokens: (data?.max_tokens_per_day as number | null) ?? DEFAULT_LIMITS.dailyTokens,
  }
}

/**
 * Límite de ritmo: cuántas ejecuciones arrancó el usuario en la última hora.
 *
 * Se cuenta sobre `agent_runs`, que la ruta inserta antes de streamear, así que
 * ya es inmune a la cancelación. Entran también las que fallaron: un bucle de
 * ejecuciones fallidas igual pega contra el proveedor.
 *
 * Falla abierto: si la consulta no responde, se deja pasar. El límite diario, que
 * es el que protege la cuota de verdad, se resuelve aparte y de forma atómica en
 * `reserveAgentRun`.
 */
export async function checkHourlyRateLimit(
  userId: string,
  program: string
): Promise<RateLimitResult> {
  const supabase = await createClient()

  const limits = await fetchProgramLimits(supabase, program)
  if (!limits) return ALLOWED

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  if (error) {
    console.warn('[rate-limiter] agent_runs hourly query error:', error.message)
    return ALLOWED
  }

  const used = count ?? 0

  if (used >= limits.hourlyRuns) {
    return {
      allowed: false,
      remaining: 0,
      limit: limits.hourlyRuns,
      reason: 'hourly-runs',
    }
  }

  return {
    allowed: true,
    remaining: limits.hourlyRuns - used,
    limit: limits.hourlyRuns,
    reason: null,
  }
}

/**
 * Camino heredado: lee los contadores del día y decide, sin reservar nada.
 *
 * Solo se usa como red cuando `reserve_agent_run` no está disponible (la
 * migración todavía no corrió). Tiene los dos agujeros que la reserva cierra:
 * entre esta lectura y la escritura del final pasa el stream entero, y una
 * ejecución cancelada nunca llega a contarse. Se prefiere igual a no aplicar
 * ningún límite.
 */
async function checkDailyRateLimitLegacy(
  userId: string,
  program: string
): Promise<RateLimitResult> {
  const supabase = await createClient()

  // En UTC, igual que el CURRENT_DATE de las funciones SQL. Si acá se usara la
  // fecha local del server, cerca de medianoche se contaría contra un día que la
  // base nunca escribe.
  const today = new Date().toISOString().slice(0, 10)

  // `usage_daily` tiene una fila por (usuario, día, provider), así que hay que
  // sumarlas todas.
  const { data: usageRows, error: usageError } = await supabase
    .from('usage_daily')
    .select('total_runs, total_tokens_input, total_tokens_output')
    .eq('user_id', userId)
    .eq('usage_date', today)

  if (usageError) {
    console.warn('[rate-limiter] usage_daily query error:', usageError.message)
    return ALLOWED
  }

  const limits = await fetchProgramLimits(supabase, program)
  if (!limits) return ALLOWED

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

  const remaining = Math.max(0, limits.dailyRuns - runsToday)

  if (remaining === 0) {
    return { allowed: false, remaining: 0, limit: limits.dailyRuns, reason: 'daily-runs' }
  }

  if (tokensToday >= limits.dailyTokens) {
    return { allowed: false, remaining, limit: limits.dailyTokens, reason: 'daily-tokens' }
  }

  return { allowed: true, remaining, limit: limits.dailyRuns, reason: null }
}

/** Fila que devuelve `reserve_agent_run`. */
interface ReserveRow {
  allowed: boolean
  reason: string | null
  runs_today: number
  runs_limit: number
  tokens_today: number
  tokens_limit: number
}

function toReserveRow(value: unknown): ReserveRow | null {
  if (typeof value !== 'object' || value === null) return null

  const row = value as Record<string, unknown>

  if (
    typeof row.allowed !== 'boolean' ||
    typeof row.runs_today !== 'number' ||
    typeof row.runs_limit !== 'number' ||
    typeof row.tokens_today !== 'number' ||
    typeof row.tokens_limit !== 'number'
  ) {
    return null
  }

  return {
    allowed: row.allowed,
    reason: typeof row.reason === 'string' ? row.reason : null,
    runs_today: row.runs_today,
    runs_limit: row.runs_limit,
    tokens_today: row.tokens_today,
    tokens_limit: row.tokens_limit,
  }
}

function toReason(raw: string | null): RateLimitReason | null {
  if (raw === 'daily-runs' || raw === 'hourly-runs' || raw === 'daily-tokens') return raw
  return null
}

/**
 * Reserva una ejecución ANTES de streamear.
 *
 * Este es el arreglo de fondo de dos agujeros que en realidad eran el mismo:
 *
 *  - Contabilizar después del stream significaba que cancelar la ejecución no
 *    contaba, así que el límite diario se evadía cerrando la pestaña apenas
 *    llegaba el primer token, indefinidamente.
 *  - Entre el chequeo y la escritura pasaba una generación entera de LLM, sin
 *    lock ni contador optimista: seis pestañas disparadas a la vez en la
 *    ejecución 9 de 10 leían 9, pasaban las seis y terminaban en 15.
 *
 * `reserve_agent_run` decide y cuenta en una sola llamada atómica, serializada
 * por un advisory lock por usuario, y devuelve los contadores post incremento.
 *
 * Al terminar el stream hay que llamar a `settleAgentRun` con los tokens reales:
 * si la ejecución no produjo ni uno, la reserva se devuelve.
 */
export async function reserveAgentRun(
  userId: string,
  program: string,
  provider: string
): Promise<ReservationResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('reserve_agent_run', {
    p_provider: provider,
  })

  if (!error) {
    const rows: unknown = data
    const first = Array.isArray(rows) ? rows[0] : rows
    const row = toReserveRow(first)

    if (row) {
      const reason = toReason(row.reason)

      return {
        allowed: row.allowed,
        remaining: Math.max(0, row.runs_limit - row.runs_today),
        limit: reason === 'daily-tokens' ? row.tokens_limit : row.runs_limit,
        reason: row.allowed ? null : (reason ?? 'daily-runs'),
        reserved: row.allowed,
      }
    }

    console.warn('[rate-limiter] reserve_agent_run devolvió una forma inesperada')
  } else {
    console.warn('[rate-limiter] reserve_agent_run:', error.message)
  }

  // La reserva no está disponible. Antes que dejar de aplicar el límite del
  // todo, se cae al chequeo heredado: no es atómico, pero sigue frenando al
  // usuario que ya se pasó de la cuota del día.
  const legacy = await checkDailyRateLimitLegacy(userId, program)
  return { ...legacy, reserved: false }
}

/**
 * Cierra la reserva al terminar el stream.
 *
 * Suma los tokens y el costo reales sin volver a contar la ejecución. Con cero
 * tokens devuelve la reserva, porque cero tokens significa que el proveedor
 * rechazó la llamada antes de generar nada y no hubo gasto que cobrarle.
 *
 * Nunca lanza: el contador es importante, pero no tanto como para tumbar una
 * respuesta que el usuario ya recibió.
 */
export async function settleAgentRun(
  provider: string,
  tokensInput: number,
  tokensOutput: number,
  cost: number
): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('settle_agent_run', {
      p_provider: provider,
      p_tokens_input: Math.max(0, Math.round(tokensInput)),
      p_tokens_output: Math.max(0, Math.round(tokensOutput)),
      p_cost: Math.max(0, cost),
    })

    if (error) {
      console.warn('[rate-limiter] settle_agent_run:', error.message)
    }
  } catch (error) {
    console.warn('[rate-limiter] settle_agent_run falló:', error)
  }
}

/**
 * Contabiliza una ejecución terminada por el camino heredado.
 *
 * Suma 1 a `total_runs` además de los tokens, así que SOLO se llama cuando la
 * reserva no se pudo tomar (`reserved: false`). Mezclarla con `settleAgentRun`
 * en la misma ejecución la contaría dos veces.
 */
export async function recordAgentUsage(
  provider: string,
  tokensInput: number,
  tokensOutput: number,
  cost: number
): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('record_agent_usage', {
      p_provider: provider,
      p_tokens_input: Math.max(0, Math.round(tokensInput)),
      p_tokens_output: Math.max(0, Math.round(tokensOutput)),
      p_cost: Math.max(0, cost),
    })

    if (error) {
      console.warn('[rate-limiter] record_agent_usage:', error.message)
    }
  } catch (error) {
    console.warn('[rate-limiter] record_agent_usage falló:', error)
  }
}
