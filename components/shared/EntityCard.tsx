import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface EntityCardProps {
  /** Destino del click. Toda la card es el link. */
  href: string
  /** Icono lucide. Se renderiza monocromo dentro de un tile `bg-muted`. */
  icon: LucideIcon
  title: string
  /** Descripción secundaria. Se recorta a 2 líneas en tile, 1 en row. */
  description?: string
  /** Badges (tier, Elite). Van en la fila del título. */
  badges?: ReactNode
  /** Meta a la derecha en row (timestamp, modelo). En mobile baja bajo el título. */
  meta?: ReactNode
  /**
   * Acción secundaria que no navega (por ejemplo, quitar de guardados).
   * Se renderiza fuera del link para no anidar elementos interactivos.
   */
  action?: ReactNode
  /** 'tile' = vertical para grids; 'row' = horizontal para listas. */
  layout?: 'tile' | 'row'
  className?: string
}

const SURFACE =
  'group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-card-hover focus-within:border-border-strong'

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
    </span>
  )
}

export function EntityCard({
  href,
  icon,
  title,
  description,
  badges,
  meta,
  action,
  layout = 'row',
  className,
}: EntityCardProps): ReactNode {
  // El link cubre la card entera. El contenido queda debajo y no es
  // interactivo, así que no hay anidamiento de controles.
  const overlay = (
    <Link href={href} className="absolute inset-0 rounded-lg">
      <span className="sr-only">{title}</span>
    </Link>
  )

  if (layout === 'tile') {
    return (
      <div className={cn(SURFACE, 'flex flex-col gap-3', className)}>
        {overlay}
        <div className="flex items-start justify-between gap-2">
          <IconTile icon={icon} />
          {action ? <div className="relative z-10">{action}</div> : null}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {badges || meta ? (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            {badges}
            {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn(SURFACE, 'flex items-start gap-3', className)}>
      {overlay}
      <IconTile icon={icon} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{title}</p>
          {badges}
        </div>
        {description ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
        {meta ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:hidden">
            {meta}
          </div>
        ) : null}
      </div>
      {meta ? (
        <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
          {meta}
        </div>
      ) : null}
      {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
    </div>
  )
}
