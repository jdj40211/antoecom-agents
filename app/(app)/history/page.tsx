import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getAgent } from '@/lib/agents/catalog'
import { PageHeader } from '@/components/shared/PageHeader'
import { HistoryList, type HistoryItem } from './HistoryList'

export const dynamic = 'force-dynamic'

async function loadRuns(userId: string): Promise<HistoryItem[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, agent_slug, status, output, error_message, model_used, tokens_total, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[history] load runs:', error.message)
    return []
  }

  return (data ?? []).map((row) => {
    const slug = row.agent_slug as string
    const status = row.status as string
    const output = (row.output as string | null) ?? ''
    const errorMessage = (row.error_message as string | null) ?? ''

    return {
      id: row.id as string,
      agentSlug: slug,
      agentName: getAgent(slug)?.name ?? slug,
      status,
      preview:
        status === 'error'
          ? `Error: ${errorMessage || 'la ejecución falló'}`
          : output.slice(0, 140).replace(/\s+/g, ' ').trim() || 'Sin salida',
      model: (row.model_used as string | null) ?? '',
      tokens: (row.tokens_total as number | null) ?? 0,
      createdAt: row.created_at as string,
    }
  })
}

export default async function HistoryPage() {
  const user = await getUser()
  const runs = user ? await loadRuns(user.id) : []

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Historial" description="Tus ejecuciones recientes" />
      <HistoryList runs={runs} />
    </div>
  )
}
