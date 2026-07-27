import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getAgent } from '@/lib/agents/catalog'
import { HistoryList, type HistoryItem } from './HistoryList'

export const dynamic = 'force-dynamic'

async function loadRuns(userId: string): Promise<HistoryItem[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, agent_slug, status, output, error_message, tokens_total, created_at')
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
      tokens: (row.tokens_total as number | null) ?? 0,
      createdAt: row.created_at as string,
    }
  })
}

export default async function HistoryPage() {
  const user = await getUser()
  const runs = user ? await loadRuns(user.id) : []

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <HistoryList runs={runs} />
    </div>
  )
}
