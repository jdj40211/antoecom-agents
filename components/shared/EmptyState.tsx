import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateLinkAction {
  label: string
  href: string
}

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Un link simple `{ label, href }` o un nodo propio si hace falta otra cosa. */
  action?: EmptyStateLinkAction | ReactNode
  className?: string
}

function isLinkAction(value: EmptyStateProps['action']): value is EmptyStateLinkAction {
  return typeof value === 'object' && value !== null && 'href' in value && 'label' in value
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-16 text-center',
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-8 text-muted-foreground/60" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-4">
          {isLinkAction(action) ? (
            <Button variant="outline" render={<Link href={action.href} />}>
              {action.label}
            </Button>
          ) : (
            action
          )}
        </div>
      ) : null}
    </div>
  )
}
