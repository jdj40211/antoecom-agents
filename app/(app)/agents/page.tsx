'use client'

import { Suspense, useMemo, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, SearchX } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EntityCard } from '@/components/shared/EntityCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { getAllAgents, type AgentDef } from '@/lib/agents/catalog'
import { AGENT_CATEGORIES } from '@/lib/utils/constants'
import { TIER_LABELS, tierBadgeClass } from '@/lib/utils/tier'
import { listContainer, listItem } from '@/lib/motion/variants'
import { cn } from '@/lib/utils'

export default function AgentsPage() {
  return (
    <Suspense>
      <AgentsPageContent />
    </Suspense>
  )
}

function AgentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category') || 'all'
  const [search, setSearch] = useState('')
  const agents = getAllAgents()

  function setCategory(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'all') {
      params.delete('category')
    } else {
      params.set('category', id)
    }
    const query = params.toString()
    router.push(query ? `/agents?${query}` : '/agents')
  }

  const filtered = useMemo(() => {
    let result = agents
    if (activeCategory !== 'all') {
      result = result.filter((agent) => agent.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(q) || agent.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [agents, activeCategory, search])

  function clearFilters() {
    setSearch('')
    setCategory('all')
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Agentes" description="28 agentes especializados para tu ecommerce" />

      <div className="space-y-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar agente..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryPill active={activeCategory === 'all'} onClick={() => setCategory('all')}>
            Todos
          </CategoryPill>
          {AGENT_CATEGORIES.map((category) => (
            <CategoryPill
              key={category.id}
              active={activeCategory === category.id}
              onClick={() => setCategory(category.id)}
            >
              {category.label}
            </CategoryPill>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Ningún agente coincide"
          description="Probá con otra categoría o borrá la búsqueda."
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <motion.div
          key={`${activeCategory}-${search}`}
          variants={listContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((agent) => (
            <motion.div key={agent.slug} variants={listItem}>
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 shrink-0 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-transparent bg-muted text-foreground'
          : 'border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function AgentCard({ agent }: { agent: AgentDef }) {
  return (
    <EntityCard
      layout="tile"
      href={`/agents/${agent.slug}`}
      icon={agent.icon}
      title={agent.name}
      description={agent.description}
      badges={
        <>
          {agent.isPremium ? <Badge variant="elite">Elite</Badge> : null}
          <Badge variant="outline" className={tierBadgeClass(agent.modelTier)}>
            {TIER_LABELS[agent.modelTier].label}
          </Badge>
        </>
      }
    />
  )
}
