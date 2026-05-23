'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Coins, Zap, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATS = [
  { label: 'Tokens usados', value: '12,450', icon: Zap, color: '#9500FF', change: '+2,300 hoy' },
  { label: 'Ejecuciones', value: '34', icon: TrendingUp, color: '#22C55E', change: '+5 hoy' },
  { label: 'Costo estimado', value: '$0.42', icon: Coins, color: '#F59E0B', change: 'USD este mes' },
  { label: 'Tiempo ahorrado', value: '~4h', icon: Clock, color: '#3B82F6', change: 'estimado' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export default function UsagePage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {STATS.map((stat) => {
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
          <div className="space-y-3">
            {[
              { provider: 'Anthropic', tokens: 8200, percentage: 66 },
              { provider: 'OpenAI', tokens: 3100, percentage: 25 },
              { provider: 'Google', tokens: 1150, percentage: 9 },
            ].map((p) => (
              <div key={p.provider} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{p.provider}</span>
                  <span className="text-muted-foreground">{p.tokens.toLocaleString()} tokens</span>
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
        </CardContent>
      </Card>
    </div>
  )
}
