import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getAgent } from '@/lib/agents/catalog'
import { PageHeader } from '@/components/shared/PageHeader'
import { SavedList, type SavedItem } from './SavedList'

export const dynamic = 'force-dynamic'

interface SavedRow {
  id: string
  run_id: string
  title: string | null
  created_at: string
  agent_runs: {
    agent_slug: string
    output: string | null
    tokens_total: number | null
  } | null
}

async function loadSaved(userId: string): Promise<SavedItem[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('saved_outputs')
    .select('id, run_id, title, created_at, agent_runs(agent_slug, output, tokens_total)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
    .overrideTypes<SavedRow[]>()

  if (error) {
    console.error('[saved] load:', error.message)
    return []
  }

  return (data ?? []).map((row) => {
    const slug = row.agent_runs?.agent_slug ?? ''
    const output = row.agent_runs?.output ?? ''

    return {
      id: row.id,
      runId: row.run_id,
      agentSlug: slug,
      agentName: getAgent(slug)?.name ?? slug,
      title: row.title ?? getAgent(slug)?.name ?? 'Output guardado',
      preview: output.slice(0, 200).replace(/\s+/g, ' ').trim(),
      tokens: row.agent_runs?.tokens_total ?? 0,
      createdAt: row.created_at,
    }
  })
}

export default async function SavedPage() {
  const user = await getUser()
  const saved = user ? await loadSaved(user.id) : []

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Guardados" description="Outputs que guardaste" />
      <SavedList items={saved} />
    </div>
  )
}
