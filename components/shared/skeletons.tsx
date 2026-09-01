import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Filas de lista: historial, guardados, providers de settings. */
export function ListSkeleton({
  rows,
  className,
}: {
  rows: number
  className?: string
}): ReactNode {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}

/** Grid de cards: catálogo de agentes, accesos rápidos del hub. */
export function CardGridSkeleton({
  cards,
  className,
}: {
  cards: number
  className?: string
}): ReactNode {
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
      aria-hidden="true"
    >
      {Array.from({ length: cards }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  )
}

/** Formularios: perfil, ejecución de agente. */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number
  className?: string
}): ReactNode {
  return (
    <div className={cn('space-y-4', className)} aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}
