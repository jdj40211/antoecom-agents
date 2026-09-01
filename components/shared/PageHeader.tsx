import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
  /** Acciones a la derecha. En mobile bajan debajo del título. */
  actions?: ReactNode
  /** Slot izquierdo antes del título: botón volver, icono del agente. */
  leading?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  leading,
  className,
}: PageHeaderProps): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {leading ? <div className="flex shrink-0 items-center pt-0.5">{leading}</div> : null}
        <div className="min-w-0">
          <h1 className="text-2xl text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
