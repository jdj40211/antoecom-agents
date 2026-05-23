import { createClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
}

/**
 * Check whether a user can execute another agent run today.
 * Queries `usage_daily` for today's count and `rate_limit_config`
 * for the user's program-based limits.
 *
 * Fails open: if the tables don't exist yet, the user is allowed.
 */
export async function checkRateLimit(
  userId: string,
  program: string
): Promise<RateLimitResult> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: usageRow, error: usageError } = await supabase
    .from('usage_daily')
    .select('total_runs')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle()

  if (usageError) {
    console.warn('[rate-limiter] usage_daily query error:', usageError.message)
    return { allowed: true, remaining: 999, limit: 999 }
  }

  const currentRuns = (usageRow?.total_runs as number | null) ?? 0

  const { data: limitRow, error: limitError } = await supabase
    .from('rate_limit_config')
    .select('max_runs_per_day')
    .eq('program', program)
    .maybeSingle()

  if (limitError) {
    console.warn('[rate-limiter] rate_limit_config query error:', limitError.message)
    return { allowed: true, remaining: 999, limit: 999 }
  }

  const dailyLimit = (limitRow?.max_runs_per_day as number | null) ?? 50
  const remaining = Math.max(0, dailyLimit - currentRuns)

  return {
    allowed: remaining > 0,
    remaining,
    limit: dailyLimit,
  }
}
