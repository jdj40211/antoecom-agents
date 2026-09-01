'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Bookmark, Loader2, Bot } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityCard } from '@/components/shared/EntityCard'
import { listContainer, listItem } from '@/lib/motion/variants'
import { relativeTime, formatTokens } from '@/lib/utils/format'

export interface SavedItem {
  id: string
  /** id del agent_run, que es lo que abre la vista del output. */
  runId: string
  agentSlug: string
  agentName: string
  title: string
  preview: string
  tokens: number
  createdAt: string
}

export function SavedList({ items }: { items: SavedItem[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)

    const response = await fetch('/api/saved', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    setDeleting(null)

    if (!response.ok) {
      toast.error('No pudimos eliminarlo. Intentá de nuevo.')
      return
    }

    toast.success('Output eliminado')
    router.refresh()
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Nada guardado todavía"
        description="Cuando un output te sirva, guardalo para volver rápido."
        action={{ label: 'Ver historial', href: '/history' }}
      />
    )
  }

  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {items.map((entry) => (
        <motion.div key={entry.id} variants={listItem}>
          <EntityCard
            layout="row"
            href={`/history/${entry.runId}`}
            icon={Bot}
            title={entry.title}
            description={entry.preview}
            meta={
              <>
                <span>{relativeTime(entry.createdAt)}</span>
                {entry.tokens > 0 ? <span>{formatTokens(entry.tokens)} tokens</span> : null}
              </>
            }
            action={
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={deleting === entry.id}
                onClick={() => handleDelete(entry.id)}
                aria-label="Quitar de guardados"
              >
                {deleting === entry.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Bookmark className="fill-current" />
                )}
              </Button>
            }
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
