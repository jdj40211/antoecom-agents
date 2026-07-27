import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { UsageDashboard, type UsageData } from './UsageDashboard'

export const dynamic = 'force-dynamic'

const EMPTY: UsageData = {
  totalTokens: 0,
  totalRuns: 0,
  totalCost: 0,
  tokensToday: 0,
  runsToday: 0,
  byProvider: [],
}

async function loadUsage(userId: string): Promise<UsageData> {
  if (!isSupabaseConfigured()) return EMPTY

  const supabase = await createClient()

  // Mes en curso.
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const from = firstOfMonth.toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('usage_daily')
    .select('usage_date, provider, total_runs, total_tokens_input, total_tokens_output, total_cost_estimate_usd')
    .eq('user_id', userId)
    .gte('usage_date', from)

  if (error) {
    console.error('[usage] load:', error.message)
    return EMPTY
  }

  const rows = data ?? []
  const byProviderMap = new Map<string, number>()

  let totalTokens = 0
  let totalRuns = 0
  let totalCost = 0
  let tokensToday = 0
  let runsToday = 0

  for (const row of rows) {
    const tokens =
      ((row.total_tokens_input as number | null) ?? 0) +
      ((row.total_tokens_output as number | null) ?? 0)
    const runs = (row.total_runs as number | null) ?? 0
    const provider = row.provider as string

    totalTokens += tokens
    totalRuns += runs
    totalCost += Number(row.total_cost_estimate_usd ?? 0)
    byProviderMap.set(provider, (byProviderMap.get(provider) ?? 0) + tokens)

    if (row.usage_date === today) {
      tokensToday += tokens
      runsToday += runs
    }
  }

  const byProvider = [...byProviderMap.entries()]
    .map(([provider, tokens]) => ({
      provider,
      tokens,
      percentage: totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens)

  return { totalTokens, totalRuns, totalCost, tokensToday, runsToday, byProvider }
}

export default async function UsagePage() {
  const user = await getUser()
  const usage = user ? await loadUsage(user.id) : EMPTY

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <UsageDashboard usage={usage} />
    </div>
  )
}
