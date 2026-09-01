import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getAgent } from '@/lib/agents/catalog'
import { PageHeader } from '@/components/shared/PageHeader'
import { EntityCard } from '@/components/shared/EntityCard'
import { StatCard } from '@/components/shared/StatCard'
import { KeysBanner } from '@/components/onboarding/KeysBanner'
import { relativeTime, formatTokens, formatCost } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

/** Se usan cuando el usuario todavía no tiene historial propio. */
const FEATURED_SLUGS = [
  'content-engine',
  'product-hunter',
  'meta-doctor',
  'ugc-scripts',
  'image-prompts',
  'shopify-assistant',
]

interface ContinueItem {
  id: string
  slug: string
  name: string
  icon: LucideIcon
  preview: string
  createdAt: string
}

interface UsageSummary {
  totalRuns: number
  totalTokens: number
  totalCost: number
}

/** Últimas ejecuciones, para "Continuar donde quedaste". */
async function loadContinueItems(userId: string): Promise<ContinueItem[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, agent_slug, status, output, error_message, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('[hub] cargar continuar:', error.message)
    return []
  }

  return (data ?? []).flatMap((row) => {
    const slug = row.agent_slug as string
    const agent = getAgent(slug)
    if (!agent) return []

    const status = row.status as string
    const output = (row.output as string | null) ?? ''
    const errorMessage = (row.error_message as string | null) ?? ''

    return [
      {
        id: row.id as string,
        slug,
        name: agent.name,
        icon: agent.icon,
        preview:
          status === 'error'
            ? `Error: ${errorMessage || 'la ejecución falló'}`
            : output.slice(0, 140).replace(/\s+/g, ' ').trim() || 'Sin salida',
        createdAt: row.created_at as string,
      },
    ]
  })
}

/**
 * Los agentes que más corrió el usuario, para "Acceso rápido". Se mira una
 * ventana de las últimas 200 ejecuciones: alcanza para un ranking estable sin
 * escanear toda la tabla.
 */
async function loadTopSlugs(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_runs')
    .select('agent_slug')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[hub] cargar más usados:', error.message)
    return []
  }

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const slug = row.agent_slug as string
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([slug]) => slug)
}

/** Consumo del mes en curso, para el resumen de uso. */
async function loadUsageSummary(userId: string): Promise<UsageSummary | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const from = firstOfMonth.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('usage_daily')
    .select('total_runs, total_tokens_input, total_tokens_output, total_cost_estimate_usd')
    .eq('user_id', userId)
    .gte('usage_date', from)

  if (error) {
    console.error('[hub] cargar resumen de uso:', error.message)
    return null
  }

  let totalRuns = 0
  let totalTokens = 0
  let totalCost = 0

  for (const row of data ?? []) {
    totalRuns += (row.total_runs as number | null) ?? 0
    totalTokens +=
      ((row.total_tokens_input as number | null) ?? 0) +
      ((row.total_tokens_output as number | null) ?? 0)
    totalCost += Number(row.total_cost_estimate_usd ?? 0)
  }

  return totalRuns > 0 ? { totalRuns, totalTokens, totalCost } : null
}

/** "juan.perez@x.com" -> "Juan Perez". Sin nombre real guardado, el email alcanza. */
function firstNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[._-]+/g, ' ').trim()
  if (!cleaned) return 'ahí'

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default async function HubPage() {
  const user = await getUser()

  const [continueItems, topSlugs, usage] = user
    ? await Promise.all([
        loadContinueItems(user.id),
        loadTopSlugs(user.id),
        loadUsageSummary(user.id),
      ])
    : [[], [], null]

  const quickAccessSlugs = topSlugs.length > 0 ? topSlugs : FEATURED_SLUGS
  const quickAccessAgents = quickAccessSlugs.flatMap((slug) => {
    const agent = getAgent(slug)
    return agent ? [agent] : []
  })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader
        title={`Hola, ${user ? firstNameFromEmail(user.email) : 'ahí'}`}
        description="¿Qué vas a lanzar hoy?"
      />

      <KeysBanner />

      {continueItems.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Continuar donde quedaste
          </h2>
          <div className="space-y-2">
            {continueItems.map((run) => (
              <EntityCard
                key={run.id}
                href={`/history/${run.id}`}
                icon={run.icon}
                title={run.name}
                description={run.preview}
                meta={relativeTime(run.createdAt)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Acceso rápido
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickAccessAgents.map((agent) => (
            <EntityCard
              key={agent.slug}
              href={`/agents/${agent.slug}`}
              icon={agent.icon}
              title={agent.name}
              description={agent.description}
            />
          ))}
        </div>
      </section>

      {usage ? (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Resumen de uso
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Ejecuciones" value={String(usage.totalRuns)} />
            <StatCard label="Tokens" value={formatTokens(usage.totalTokens)} mono />
            <StatCard label="Costo estimado" value={formatCost(usage.totalCost)} mono />
          </div>
          <Link href="/usage" className="inline-block text-sm text-primary hover:underline">
            Ver uso completo
          </Link>
        </section>
      ) : null}
    </div>
  )
}
