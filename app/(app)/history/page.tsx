'use client'

import { motion } from 'framer-motion'
import { Clock, Bot, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const MOCK_RUNS = [
  { id: '1', agentSlug: 'content-engine', agentName: 'Content Engine', status: 'success', preview: 'Generé 10 ideas de contenido para nicho de skincare...', tokens: 2340, createdAt: 'Hace 2 horas' },
  { id: '2', agentSlug: 'product-hunter', agentName: 'Product Hunter', status: 'success', preview: 'Análisis de producto: Lámpara LED Moon (Score: 87/120 - WINNER)...', tokens: 3120, createdAt: 'Hace 5 horas' },
  { id: '3', agentSlug: 'meta-doctor', agentName: 'Meta Doctor', status: 'error', preview: 'Error: API key de Anthropic sin créditos suficientes', tokens: 0, createdAt: 'Ayer' },
  { id: '4', agentSlug: 'hook-writer', agentName: 'Hook Writer', status: 'success', preview: '10 hooks virales generados para contenido de fitness...', tokens: 1580, createdAt: 'Ayer' },
  { id: '5', agentSlug: 'ugc-scripts', agentName: 'UGC Scripts', status: 'success', preview: 'Guión UGC testimonial de 30 segundos para serum facial...', tokens: 2890, createdAt: 'Hace 3 días' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
}

export default function HistoryPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
        {MOCK_RUNS.map((run) => (
          <motion.div key={run.id} variants={item}>
            <Link href={`/agents/${run.agentSlug}`}>
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
                            : 'bg-danger/20 text-danger text-[10px]'
                        }
                      >
                        {run.status === 'success' ? 'OK' : 'Error'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{run.preview}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {run.createdAt}
                    </div>
                    {run.tokens > 0 && (
                      <p className="text-[10px] text-muted-foreground/60">{run.tokens.toLocaleString()} tokens</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
