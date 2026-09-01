'use client'

import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { listContainer, listItem } from '@/lib/motion/variants'
import { formatCost, formatTokens } from '@/lib/utils/format'

export interface DailyUsagePoint {
  date: string
  tokensInput: number
  tokensOutput: number
}

export interface AgentUsage {
  slug: string
  name: string
  tokens: number
  cost: number
  runs: number
  percentage: number
}

export interface TopAgent {
  slug: string
  name: string
  runs: number
}

export interface UsageData {
  totalTokens: number
  totalRuns: number
  totalCost: number
  tokensToday: number
  runsToday: number
  daily: DailyUsagePoint[]
  byAgent: AgentUsage[]
  topAgent: TopAgent | null
}

function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })
}

interface ChartTooltipPayloadItem {
  dataKey?: string | number
  value?: number
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const input = payload.find((p) => p.dataKey === 'tokensInput')?.value ?? 0
  const output = payload.find((p) => p.dataKey === 'tokensOutput')?.value ?? 0

  return (
    <div className="rounded-md border border-border bg-popover p-2.5 text-xs shadow-overlay">
      <p className="font-medium text-foreground">{label ? formatDayLabel(label) : ''}</p>
      <p className="mt-1 text-muted-foreground">Entrada: {formatTokens(input)}</p>
      <p className="text-muted-foreground">Salida: {formatTokens(output)}</p>
    </div>
  )
}

export function UsageDashboard({ usage }: { usage: UsageData }) {
  if (usage.totalRuns === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin consumo todavía"
        description="Cuando ejecutes un agente, acá vas a ver tokens, costos y el desglose por agente."
        action={{ label: 'Ejecutar un agente', href: '/agents' }}
      />
    )
  }

  return (
    <motion.div variants={listContainer} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={listItem} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ejecuciones este mes" value={String(usage.totalRuns)} />
        <StatCard label="Tokens" value={formatTokens(usage.totalTokens)} mono />
        <StatCard label="Costo estimado" value={formatCost(usage.totalCost)} mono />
        <StatCard
          label="Agente más usado"
          value={usage.topAgent ? usage.topAgent.name : 'Sin datos'}
          hint={usage.topAgent ? `${usage.topAgent.runs} ejecuciones` : undefined}
        />
      </motion.div>

      {usage.daily.length > 0 ? (
        <motion.div variants={listItem}>
          <Card>
            <CardHeader>
              <CardTitle>Consumo diario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usage.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tokensInputFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tokensOutputFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDayLabel}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
                    <Area
                      type="monotone"
                      dataKey="tokensInput"
                      stroke="var(--chart-1)"
                      fill="url(#tokensInputFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="tokensOutput"
                      stroke="var(--chart-2)"
                      fill="url(#tokensOutputFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: 'var(--chart-1)' }}
                    aria-hidden="true"
                  />
                  Tokens de entrada
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: 'var(--chart-2)' }}
                    aria-hidden="true"
                  />
                  Tokens de salida
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {usage.byAgent.length > 0 ? (
        <motion.div variants={listItem}>
          <Card>
            <CardHeader>
              <CardTitle>Desglose por agente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {usage.byAgent.map((agent) => (
                <div key={agent.slug} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground">{agent.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {formatCost(agent.cost)}
                    </span>
                  </div>
                  <Progress value={agent.percentage} />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </motion.div>
  )
}
