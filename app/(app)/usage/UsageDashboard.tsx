'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Coins, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTokens, formatCost } from '@/lib/utils/format'

export interface UsageData {
  totalTokens: number
  totalRuns: number
  totalCost: number
  tokensToday: number
  runsToday: number
  byProvider: { provider: string; tokens: number; percentage: number }[]
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  openrouter: 'OpenRouter',
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export function UsageDashboard({ usage }: { usage: UsageData }) {
  const stats = [
    {
      label: 'Tokens usados',
      value: formatTokens(usage.totalTokens),
      icon: Zap,
      color: '#9500FF',
      change: usage.tokensToday > 0 ? `+${formatTokens(usage.tokensToday)} hoy` : 'Sin uso hoy',
    },
    {
      label: 'Ejecuciones',
      value: String(usage.totalRuns),
      icon: TrendingUp,
      color: '#22C55E',
      change: usage.runsToday > 0 ? `+${usage.runsToday} hoy` : 'Sin uso hoy',
    },
    {
      label: 'Costo estimado',
      value: formatCost(usage.totalCost),
      icon: Coins,
      color: '#F59E0B',
      change: 'USD este mes',
    },
  ]

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} variants={item}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Uso por proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.byProvider.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Todavía no hay consumo este mes. Ejecutá un agente y acá vas a ver el desglose.
            </p>
          ) : (
            <div className="space-y-3">
              {usage.byProvider.map((p) => (
                <div key={p.provider} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{PROVIDER_LABELS[p.provider] ?? p.provider}</span>
                    <span className="text-muted-foreground">
                      {formatTokens(p.tokens)} tokens
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-brand"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
