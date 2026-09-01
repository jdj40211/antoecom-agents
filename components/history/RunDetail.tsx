'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { fadeIn } from '@/lib/motion/variants'
import { formatTokens, formatCost } from '@/lib/utils/format'

export interface RunInput {
  label: string
  value: string
}

export interface RunDetailData {
  id: string
  agentSlug: string
  agentName: string
  status: string
  inputs: RunInput[]
  output: string
  errorMessage: string
  model: string
  provider: string
  tokensTotal: number
  cost: number
  responseTimeMs: number
  createdAt: string
  /** id en saved_outputs si el usuario ya lo guardó. */
  savedId: string | null
}

/** Fecha completa en español, sin depender de la hora del navegador. */
function formatFullDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RunDetail({ run }: { run: RunDetailData }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [savingState, setSavingState] = useState(false)

  const isError = run.status === 'error'
  const isRunning = run.status === 'running' || run.status === 'pending'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(run.output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Tu navegador no nos dejó copiar. Seleccioná el texto a mano.')
    }
  }

  function handleDownload() {
    const date = run.createdAt.slice(0, 10)
    const blob = new Blob([run.output], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${run.agentSlug}-${date}.md`
    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  async function handleToggleSave() {
    setSavingState(true)

    const response = run.savedId
      ? await fetch('/api/saved', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: run.savedId }),
        })
      : await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId: run.id, title: run.agentName }),
        })

    setSavingState(false)

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(data?.error ?? 'No pudimos hacerlo. Intentá de nuevo.')
      return
    }

    toast.success(run.savedId ? 'Sacado de Guardados' : 'Guardado. Lo encontrás en Guardados.')
    router.refresh()
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-8">
      <div className="space-y-3">
        <PageHeader
          leading={
            <Button variant="ghost" size="icon" render={<Link href="/history" />}>
              <ArrowLeft />
              <span className="sr-only">Volver al historial</span>
            </Button>
          }
          title={run.agentName}
          actions={
            isError ? (
              <Badge variant="destructive">Error</Badge>
            ) : isRunning ? (
              <Badge variant="secondary">En curso</Badge>
            ) : null
          }
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{formatFullDate(run.createdAt)}</span>
          {run.model ? <span className="font-mono">{run.model}</span> : null}
          {run.tokensTotal > 0 ? <span>{formatTokens(run.tokensTotal)} tokens</span> : null}
          {run.cost > 0 ? (
            <span className="font-mono text-foreground">{formatCost(run.cost)}</span>
          ) : null}
          {run.responseTimeMs > 0 ? <span>{(run.responseTimeMs / 1000).toFixed(1)}s</span> : null}
        </div>
      </div>

      {run.inputs.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-xs font-medium text-muted-foreground">Input</p>
            <div className="space-y-2">
              {run.inputs.map((field) => (
                <div key={field.label}>
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isError ? (
        <Card className="border-destructive/20">
          <CardContent className="flex items-start gap-2 p-6">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Esta ejecución falló</p>
              <p className="mt-1 text-sm break-words text-muted-foreground">
                {run.errorMessage || 'No quedó registrado el motivo.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between gap-2 px-6 py-4">
            <p className="text-xs font-medium text-muted-foreground">Output</p>
            <div className="flex flex-wrap items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download />
                Descargar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={savingState}
                onClick={handleToggleSave}
              >
                {run.savedId ? <BookmarkCheck /> : <Bookmark />}
                {run.savedId ? 'Guardado' : 'Guardar'}
              </Button>
              <Button variant="outline" size="sm" render={<Link href={`/agents/${run.agentSlug}`} />}>
                <RotateCcw />
                Volver a ejecutar
              </Button>
            </div>
          </div>

          <div className="border-t border-border p-6">
            {run.output ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{run.output}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isRunning
                  ? 'La ejecución todavía no terminó. Volvé en un momento.'
                  : 'Esta ejecución no dejó ningún resultado.'}
              </p>
            )}
          </div>
        </Card>
      )}
    </motion.div>
  )
}
