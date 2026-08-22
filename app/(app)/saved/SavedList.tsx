'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookmarkX, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookmarkX className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Sin outputs guardados</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Cuando ejecutes un agente, podés guardar el resultado para acceder a él después
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((entry) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/history/${entry.runId}`}
                    className="text-sm font-medium hover:text-brand transition-colors"
                  >
                    {entry.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {entry.preview}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeTime(entry.createdAt)}
                    </span>
                    {entry.tokens > 0 && <span>{formatTokens(entry.tokens)} tokens</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={deleting === entry.id}
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
