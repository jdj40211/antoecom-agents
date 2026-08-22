'use client'

import { motion } from 'framer-motion'
import { Clock, Bot, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { relativeTime, formatTokens } from '@/lib/utils/format'

export interface HistoryItem {
  id: string
  agentSlug: string
  agentName: string
  status: string
  preview: string
  tokens: number
  createdAt: string
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
}

export function HistoryList({ runs }: { runs: HistoryItem[] }) {
  if (runs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <History className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Todavía no ejecutaste ningún agente</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Cuando ejecutes uno, vas a ver acá el historial completo con tokens y costo
        </p>
        <Link
          href="/agents"
          className="mt-4 text-sm text-brand hover:underline"
        >
          Ver agentes disponibles
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
      {runs.map((run) => (
        <motion.div key={run.id} variants={item}>
          <Link href={`/history/${run.id}`}>
            <Card className="hover:border-brand/20 transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{run.agentName}</span>
                    <Badge
                      variant="secondary"
                      className={
                        run.status === 'success'
                          ? 'bg-active/20 text-active text-[10px]'
                          : run.status === 'running'
                            ? 'bg-muted text-muted-foreground text-[10px]'
                            : 'bg-danger/20 text-danger text-[10px]'
                      }
                    >
                      {run.status === 'success'
                        ? 'OK'
                        : run.status === 'running'
                          ? 'En curso'
                          : 'Error'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{run.preview}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {relativeTime(run.createdAt)}
                  </div>
                  {run.tokens > 0 && (
                    <p className="text-[10px] text-muted-foreground/60">
                      {formatTokens(run.tokens)} tokens
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
