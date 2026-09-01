'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Code2,
  Copy,
  Eye,
  Monitor,
  RotateCcw,
  Smartphone,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AgentDef } from '@/lib/agents/catalog'
import {
  PREVIEWABLE_AGENTS,
  buildPreviewHtml,
  extractLiquidCode,
} from '@/lib/agents/liquid-preview'
import { useAgentRunStore } from '@/lib/store/agent-runs'

export interface OutputPanelProps {
  agent: AgentDef
  /** Vuelve a lanzar la ejecución con los datos que hay en el formulario. */
  onRerun: () => void
}

const OUTPUT_FORMAT_HINT: Record<AgentDef['outputFormat'], string> = {
  markdown: 'Un texto en markdown, listo para copiar y pegar.',
  chat: 'Una respuesta directa a tu consulta, en lenguaje claro.',
  structured: 'Un análisis ordenado por secciones, con conclusiones al final.',
}

/** Tres cosas concretas que el usuario va a recibir, derivadas del agente. */
function expectations(agent: AgentDef): string[] {
  const firstSentence = agent.description.split('. ')[0].replace(/\.$/, '')
  return [
    firstSentence,
    OUTPUT_FORMAT_HINT[agent.outputFormat],
    'Lo podés copiar o guardar apenas termine.',
  ]
}

export function OutputPanel({ agent, onRerun }: OutputPanelProps) {
  const run = useAgentRunStore((state) => state.runs[agent.slug])
  const output = run?.output ?? ''
  const error = run?.error ?? ''
  const running = run?.running ?? false
  const runId = run?.runId ?? null

  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedRunId, setSavedRunId] = useState<string | null>(null)
  const [tab, setTab] = useState<'code' | 'preview'>('code')
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const desktopRef = useRef<HTMLDivElement | null>(null)
  const [frameWidth, setFrameWidth] = useState(0)

  // Derivado en vez de resetear con un efecto: cada ejecución nueva trae otro
  // runId, así que el botón vuelve a habilitarse solo.
  const saved = runId !== null && savedRunId === runId

  const liquidCode =
    PREVIEWABLE_AGENTS.has(agent.slug) && output && !running ? extractLiquidCode(output) : null
  const canPreview = liquidCode !== null

  useEffect(() => {
    const element = desktopRef.current
    if (!element) return

    const update = () => setFrameWidth(element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [tab, viewport, canPreview])

  async function handleCopy() {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    if (!runId) return
    setSaving(true)

    const response = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, title: agent.name }),
    })

    setSaving(false)

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(data?.error ?? 'No pudimos guardarlo. Intentá de nuevo.')
      return
    }

    setSavedRunId(runId)
    toast.success('Guardado. Lo encontrás en Guardados.')
  }

  const showToolbar = Boolean(output) && !running && !error
  const Icon = agent.icon
  const previewScale = frameWidth > 0 ? frameWidth / 1280 : 0.35

  const markdown = (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
    </div>
  )

  return (
    <Card id="output-panel" className="min-h-[480px] scroll-mt-20 py-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-6">
        <div className="flex items-center gap-2">
          <CardTitle>Resultado</CardTitle>
          {running ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Generando
            </span>
          ) : null}
        </div>
        {showToolbar ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => void handleCopy()}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            {runId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || saved}
              >
                {saved ? (
                  <BookmarkCheck className="size-3.5" />
                ) : (
                  <Bookmark className="size-3.5" />
                )}
                {saved ? 'Guardado' : 'Guardar'}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onRerun}>
              <RotateCcw className="size-3.5" />
              Re-ejecutar
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 px-6">
        {error ? (
          <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">No pudimos completar la ejecución</p>
            <p className="text-xs text-destructive/80">{error}</p>
            <Button variant="outline" size="sm" onClick={onRerun}>
              Reintentar
            </Button>
          </div>
        ) : output ? (
          canPreview ? (
            <Tabs
              value={tab}
              onValueChange={(value: unknown) => setTab(value === 'preview' ? 'preview' : 'code')}
            >
              <TabsList>
                <TabsTrigger value="code">
                  <Code2 />
                  Código
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye />
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="code">{markdown}</TabsContent>
              <TabsContent value="preview">
                <Tabs
                  value={viewport}
                  onValueChange={(value: unknown) =>
                    setViewport(value === 'mobile' ? 'mobile' : 'desktop')
                  }
                >
                  <TabsList>
                    <TabsTrigger value="desktop">
                      <Monitor />
                      Escritorio
                    </TabsTrigger>
                    <TabsTrigger value="mobile">
                      <Smartphone />
                      Mobile
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="desktop">
                    <div
                      ref={desktopRef}
                      className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border"
                    >
                      <iframe
                        srcDoc={buildPreviewHtml(liquidCode)}
                        className="origin-top-left border-0"
                        style={{
                          width: '1280px',
                          height: '960px',
                          transform: `scale(${previewScale})`,
                        }}
                        sandbox="allow-scripts"
                        title="Vista previa de la sección"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="mobile">
                    <div className="mx-auto h-[560px] w-full max-w-[375px] overflow-hidden rounded-md border border-border">
                      <iframe
                        srcDoc={buildPreviewHtml(liquidCode)}
                        className="size-full border-0"
                        sandbox="allow-scripts"
                        title="Vista previa de la sección en mobile"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          ) : (
            markdown
          )
        ) : (
          <div className="space-y-4">
            <span className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Vas a recibir
            </p>
            <ul className="space-y-2">
              {expectations(agent).map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              El resultado aparece acá en tiempo real.
            </p>
          </div>
        )}

        {agent.slug === 'shopify-section-builder' && output && !error ? (
          <InstallInstructions />
        ) : null}
      </CardContent>
    </Card>
  )
}

function InstallInstructions() {
  return (
    <details className="mt-6 rounded-lg border border-border p-4">
      <summary className="cursor-pointer text-sm font-medium text-foreground select-none">
        Cómo instalar en Shopify
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          Copiá el código completo con el botón{' '}
          <span className="text-foreground">Copiar</span> de arriba.
        </li>
        <li>
          En tu tienda, entrá a{' '}
          <span className="text-foreground">Tienda online, Temas, Personalizar</span>.
        </li>
        <li>
          Tocá <span className="text-foreground">Agregar sección</span>.
        </li>
        <li>
          Buscá <span className="text-foreground">Custom Liquid</span> o Liquid personalizado.
        </li>
        <li>Pegá el código en el campo de texto y guardá los cambios.</li>
      </ol>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Alternativa: subí el archivo .liquid en Editar código, carpeta sections, para tener una
        sección nativa con schema editable.
      </p>
    </details>
  )
}
