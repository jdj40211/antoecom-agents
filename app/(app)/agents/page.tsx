'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Search, Crown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAllAgents, type AgentDef } from '@/lib/agents/catalog'
import { AGENT_CATEGORIES } from '@/lib/utils/constants'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export default function AgentsPage() {
  return (
    <Suspense>
      <AgentsPageContent />
    </Suspense>
  )
}

function AgentsPageContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') || 'all'
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [search, setSearch] = useState('')
  const agents = getAllAgents()

  const filtered = useMemo(() => {
    let result = agents
    if (activeCategory !== 'all') {
      result = result.filter((a) => a.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [agents, activeCategory, search])

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar agente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="data-[state=active]:bg-brand/20 data-[state=active]:text-brand">
            Todos ({agents.length})
          </TabsTrigger>
          {AGENT_CATEGORIES.map((cat) => {
            const count = agents.filter((a) => a.category === cat.id).length
            return (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="data-[state=active]:bg-brand/20 data-[state=active]:text-brand"
              >
                {cat.label} ({count})
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <motion.div
        key={activeCategory + search}
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {filtered.map((agent) => (
          <AgentGridCard key={agent.slug} agent={agent} />
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron agentes
        </div>
      )}
    </div>
  )
}

function AgentGridCard({ agent }: { agent: AgentDef }) {
  const Icon = agent.icon
  return (
    <motion.div variants={item}>
      <Link href={`/agents/${agent.slug}`}>
        <Card className="group hover:border-brand/30 transition-all duration-200 hover:shadow-lg hover:shadow-brand/5 cursor-pointer h-full">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${agent.color}15` }}
              >
                <Icon className="h-5 w-5" style={{ color: agent.color }} />
              </div>
              {agent.isPremium && (
                <Badge className="bg-elite/20 text-elite border-elite/30 gap-1 text-[10px]">
                  <Crown className="h-3 w-3" />
                  Elite
                </Badge>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm group-hover:text-brand transition-colors">
                {agent.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {agent.description}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {agent.requiredProviders.slice(0, 3).map((p) => (
                <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
