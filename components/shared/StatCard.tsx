import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface StatCardProps {
  label: string
  value: string
  hint?: string
  /** Activar en montos, tokens y cualquier valor que se compare de un vistazo. */
  mono?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  mono = false,
  className,
}: StatCardProps): ReactNode {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl text-foreground tabular-nums',
          mono && 'font-mono'
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
