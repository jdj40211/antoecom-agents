'use client'

import { motion } from 'framer-motion'
import { Bot, History } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityCard } from '@/components/shared/EntityCard'
import { listContainer, listItem } from '@/lib/motion/variants'
import { relativeTime, formatTokens } from '@/lib/utils/format'

export interface HistoryItem {
  id: string
  agentSlug: string
  agentName: string
  status: string
  preview: string
  model: string
  tokens: number
  createdAt: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'error') {
    return <Badge variant="destructive">Error</Badge>
  }
  if (status === 'running' || status === 'pending') {
    return <Badge variant="secondary">En curso</Badge>
  }
  return null
}

export function HistoryList({ runs }: { runs: HistoryItem[] }) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Todavía no ejecutaste ningún agente"
        description="Cuando ejecutes uno, vas a ver acá el historial completo con tokens y costo."
        action={{ label: 'Explorar agentes', href: '/agents' }}
      />
    )
  }

  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {runs.map((run) => (
        <motion.div key={run.id} variants={listItem}>
          <EntityCard
            layout="row"
            href={`/history/${run.id}`}
            icon={Bot}
            title={run.agentName}
            description={run.preview}
            badges={<StatusBadge status={run.status} />}
            meta={
              <>
                {run.model ? <span className="font-mono">{run.model}</span> : null}
                <span>{relativeTime(run.createdAt)}</span>
                {run.tokens > 0 ? <span>{formatTokens(run.tokens)} tokens</span> : null}
              </>
            }
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
