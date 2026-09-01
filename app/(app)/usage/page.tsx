import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getAgent } from '@/lib/agents/catalog'
import { PageHeader } from '@/components/shared/PageHeader'
import { UsageDashboard, type UsageData } from './UsageDashboard'

export const dynamic = 'force-dynamic'

const EMPTY: UsageData = {
  totalTokens: 0,
  totalRuns: 0,
  totalCost: 0,
  tokensToday: 0,
  runsToday: 0,
  daily: [],
  byAgent: [],
  topAgent: null,
}

async function loadUsage(userId: string): Promise<UsageData> {
  if (!isSupabaseConfigured()) return EMPTY

  const supabase = await createClient()

  // Mes en curso. Los totales agregados (tokens, ejecuciones, costo) salen de
  // usage_daily porque es la única tabla que el cliente no puede manipular
  // (solo la escribe record_agent_usage, SECURITY DEFINER). El desglose por
  // agente sale de agent_runs, que sí tiene agent_slug pero es solo para
  // mostrar, nunca para límites de uso.
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const from = firstOfMonth.toISOString().slice(0, 10)
  const fromTimestamp = firstOfMonth.toISOString()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data, error }, { data: runsData, error: runsError }] = await Promise.all([
    supabase
      .from('usage_daily')
      .select('usage_date, total_runs, total_tokens_input, total_tokens_output, total_cost_estimate_usd')
      .eq('user_id', userId)
      .gte('usage_date', from),
    supabase
      .from('agent_runs')
      .select('agent_slug, tokens_total, cost_estimate_usd')
      .eq('user_id', userId)
      .eq('status', 'success')
      .gte('created_at', fromTimestamp),
  ])

  if (error) {
    console.error('[usage] load:', error.message)
    return EMPTY
  }

  const rows = data ?? []
  const byDateMap = new Map<string, { tokensInput: number; tokensOutput: number }>()

  let totalTokens = 0
  let totalRuns = 0
  let totalCost = 0
  let tokensToday = 0
  let runsToday = 0

  for (const row of rows) {
    const tokensInput = (row.total_tokens_input as number | null) ?? 0
    const tokensOutput = (row.total_tokens_output as number | null) ?? 0
    const tokens = tokensInput + tokensOutput
    const runs = (row.total_runs as number | null) ?? 0
    const date = row.usage_date as string

    totalTokens += tokens
    totalRuns += runs
    totalCost += Number(row.total_cost_estimate_usd ?? 0)

    const dayTotals = byDateMap.get(date) ?? { tokensInput: 0, tokensOutput: 0 }
    dayTotals.tokensInput += tokensInput
    dayTotals.tokensOutput += tokensOutput
    byDateMap.set(date, dayTotals)

    if (date === today) {
      tokensToday += tokens
      runsToday += runs
    }
  }

  const daily = [...byDateMap.entries()]
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date))

  let byAgent: UsageData['byAgent'] = []
  let topAgent: UsageData['topAgent'] = null

  if (runsError) {
    console.error('[usage] load runs:', runsError.message)
  } else if (runsData) {
    const perAgent = new Map<string, { tokens: number; cost: number; runs: number }>()
    for (const run of runsData) {
      const slug = run.agent_slug as string
      const entry = perAgent.get(slug) ?? { tokens: 0, cost: 0, runs: 0 }
      entry.tokens += (run.tokens_total as number | null) ?? 0
      entry.cost += Number(run.cost_estimate_usd ?? 0)
      entry.runs += 1
      perAgent.set(slug, entry)
    }

    const maxTokens = Math.max(0, ...[...perAgent.values()].map((v) => v.tokens))

    byAgent = [...perAgent.entries()]
      .map(([slug, totals]) => ({
        slug,
        name: getAgent(slug)?.name ?? slug,
        ...totals,
        percentage: maxTokens > 0 ? Math.round((totals.tokens / maxTokens) * 100) : 0,
      }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 8)

    if (byAgent.length > 0) {
      const top = byAgent[0]
      topAgent = { slug: top.slug, name: top.name, runs: top.runs }
    }
  }

  return { totalTokens, totalRuns, totalCost, tokensToday, runsToday, daily, byAgent, topAgent }
}

export default async function UsagePage() {
  const user = await getUser()
  const usage = user ? await loadUsage(user.id) : EMPTY

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Uso" description="Tu consumo de tokens y costos este mes" />
      <UsageDashboard usage={usage} />
    </div>
  )
}
