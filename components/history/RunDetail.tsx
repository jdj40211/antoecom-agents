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
import { Separator } from '@/components/ui/separator'
import { relativeTime, formatTokens, formatCost } from '@/lib/utils/format'

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Historial
        </Link>

        <Link href={`/agents/${run.agentSlug}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Volver a ejecutar
          </Button>
        </Link>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{run.agentName}</h1>
          {isError && (
            <Badge variant="secondary" className="bg-danger/20 text-danger text-[10px]">
              Error
            </Badge>
          )}
          {isRunning && (
            <Badge variant="secondary" className="text-[10px]">
              En curso
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
          <span>{relativeTime(run.createdAt)}</span>
          {run.model && <span>{run.model}</span>}
          {run.tokensTotal > 0 && <span>{formatTokens(run.tokensTotal)} tokens</span>}
          {run.cost > 0 && <span>{formatCost(run.cost)}</span>}
          {run.responseTimeMs > 0 && <span>{(run.responseTimeMs / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      {run.inputs.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Lo que enviaste</p>
            <div className="space-y-2">
              {run.inputs.map((field) => (
                <div key={field.label} className="text-sm">
                  <span className="text-muted-foreground">{field.label}: </span>
                  <span className="whitespace-pre-wrap break-words">{field.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isError ? (
        <Card className="border-danger/30">
          <CardContent className="p-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Esta ejecución falló</p>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {run.errorMessage || 'No quedó registrado el motivo.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Resultado</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleDownload}>
                  <Download className="h-3 w-3 mr-1" />
                  Descargar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={savingState}
                  onClick={handleToggleSave}
                >
                  {run.savedId ? (
                    <>
                      <BookmarkCheck className="h-3 w-3 mr-1" />
                      Guardado
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3 w-3 mr-1" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="p-4">
              {run.output ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
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
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
