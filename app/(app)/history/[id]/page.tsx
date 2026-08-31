import { notFound } from 'next/navigation'
import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getAgent } from '@/lib/agents/catalog'
import { RunDetail, type RunDetailData, type RunInput } from '@/components/history/RunDetail'

export const dynamic = 'force-dynamic'

/** Un id que no es UUID hace fallar la query de Postgres, así que se corta antes. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Rearma los inputs con los títulos del catálogo. Si el agente cambió su
 * formulario desde que se ejecutó, las claves sin título se muestran igual con
 * su nombre crudo, que es preferible a esconder lo que el usuario escribió.
 */
function buildInputs(agentSlug: string, raw: unknown): RunInput[] {
  if (typeof raw !== 'object' || raw === null) return []

  const schema = getAgent(agentSlug)?.inputSchema ?? {}

  return Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string' && value.trim() !== '')
    .map(([key, value]) => ({
      label: schema[key]?.title ?? key,
      value: value as string,
    }))
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!UUID.test(id)) notFound()

  const user = await getUser()
  if (!user || !isSupabaseConfigured()) notFound()

  const supabase = await createClient()

  const { data: run, error } = await supabase
    .from('agent_runs')
    .select(
      'id, agent_slug, status, input, output, error_message, model_used, provider_used, tokens_total, cost_estimate_usd, response_time_ms, created_at'
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[history/:id] load run:', error.message)
    notFound()
  }

  if (!run) notFound()

  const { data: saved } = await supabase
    .from('saved_outputs')
    .select('id')
    .eq('run_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const slug = run.agent_slug as string

  const data: RunDetailData = {
    id: run.id as string,
    agentSlug: slug,
    agentName: getAgent(slug)?.name ?? slug,
    status: run.status as string,
    inputs: buildInputs(slug, run.input),
    output: (run.output as string | null) ?? '',
    errorMessage: (run.error_message as string | null) ?? '',
    model: (run.model_used as string | null) ?? '',
    provider: (run.provider_used as string | null) ?? '',
    tokensTotal: (run.tokens_total as number | null) ?? 0,
    cost: Number(run.cost_estimate_usd ?? 0),
    responseTimeMs: (run.response_time_ms as number | null) ?? 0,
    createdAt: run.created_at as string,
    savedId: (saved?.id as string | undefined) ?? null,
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <RunDetail run={data} />
    </div>
  )
}
