'use client'

import { use, useState, useCallback, useRef, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Loader2, Copy, Check, ArrowLeft, Crown, Wand2, Eye, Code2, Smartphone, Monitor, Bookmark, BookmarkCheck, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getAgent, type InputField } from '@/lib/agents/catalog'
import { getModelInfo, TIER_LABELS } from '@/lib/agents/model-info'
import { useAgentRunStore } from '@/lib/store/agent-runs'
import { useUserKeys } from '@/lib/store/user-keys'
import { resolveProvider } from '@/lib/agents/resolve-provider'
import { PROVIDERS } from '@/lib/utils/constants'

function providerLabel(provider: string): string {
  return PROVIDERS.find((p) => p.id === provider)?.name ?? provider
}

export default function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const agent = getAgent(slug)

  if (!agent) return notFound()

  return <AgentExecutor agent={agent} />
}

function AgentExecutor({ agent }: { agent: ReturnType<typeof getAgent> & {} }) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    Object.entries(agent.inputSchema).forEach(([key, field]) => {
      initial[key] = field.default || ''
    })
    return initial
  })
  const [selectedModel, setSelectedModel] = useState(agent.defaultModel)
  const [copied, setCopied] = useState(false)

  const { runs, startRun } = useAgentRunStore()
  const { ready: keysReady, hasValidKey } = useUserKeys()
  const run = runs[agent.slug]
  const output = run?.output ?? ''
  const error = run?.error ?? ''
  const running = run?.running ?? false
  const runId = run?.runId ?? null

  const Icon = agent.icon

  function updateField(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function handleRun() {
    startRun(agent.slug, {
      agentSlug: agent.slug,
      input: formData,
      modelOverride: selectedModel !== agent.defaultModel ? selectedModel : undefined,
    })
  }

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const requiredFields = Object.entries(agent.inputSchema).filter(([, f]) => f.required)
  const allRequiredFilled = requiredFields.every(([key]) => formData[key]?.trim())

  // Cada modelo se ejecuta con la key del usuario para ese proveedor. Sin esto
  // el formulario se llenaba entero y el "no tenés API key" recién aparecía
  // después de apretar Ejecutar.
  const neededProvider = resolveProvider(selectedModel)
  const missingKey = keysReady && !hasValidKey(neededProvider)

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/agents">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${agent.color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: agent.color }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{agent.name}</h2>
            {agent.isPremium && (
              <Badge className="bg-elite/20 text-elite border-elite/30 gap-1 text-[10px]">
                <Crown className="h-3 w-3" />
                Elite
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{agent.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(agent.inputSchema).map(([key, field]) => (
                <DynamicField
                  key={key}
                  fieldKey={key}
                  field={field}
                  value={formData[key] || ''}
                  onChange={(v) => updateField(key, v)}
                  agentSlug={agent.slug}
                  formData={formData}
                />
              ))}

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Modelo</Label>
                <Select value={selectedModel} onValueChange={(v) => v && setSelectedModel(v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <span className="truncate">{getModelInfo(selectedModel)?.name ?? selectedModel}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {agent.allowedModels.map((modelId) => {
                      const info = getModelInfo(modelId)
                      const noKey = keysReady && !hasValidKey(resolveProvider(modelId))
                      return (
                        <SelectItem key={modelId} value={modelId}>
                          {info ? `${info.name}  ${info.costLabel}` : modelId}
                          {noKey ? '  (sin key)' : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {(() => {
                  const info = getModelInfo(selectedModel)
                  const tierInfo = info ? TIER_LABELS[info.tier] : null
                  return tierInfo ? (
                    <p className="text-[10px] text-muted-foreground">
                      Costo estimado: <span className="font-medium text-foreground">{info?.costLabel}</span>
                      {' '}&middot;{' '}
                      <span className={
                        info?.tier === 'economy' ? 'text-green-500' :
                        info?.tier === 'premium' ? 'text-purple-400' : 'text-blue-400'
                      }>
                        {tierInfo.label}
                      </span>
                    </p>
                  ) : null
                })()}
              </div>

              {missingKey && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <KeyRound className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium">
                      Te falta la API key de {providerLabel(neededProvider)}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      Este modelo corre con tu propia key.{' '}
                      <Link href="/settings/keys" className="text-brand hover:underline">
                        Agregala en Configuración
                      </Link>{' '}
                      o elegí un modelo de un proveedor que ya tengas.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleRun}
                disabled={running || !allRequiredFilled || missingKey}
                className="w-full bg-brand hover:bg-brand-dark text-white h-10"
              >
                {running ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ejecutando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Ejecutar agente
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          <OutputPanel
            output={output}
            error={error}
            running={running}
            copied={copied}
            onCopy={handleCopy}
            agentSlug={agent.slug}
            agentName={agent.name}
            runId={runId}
          />
          {agent.slug === 'shopify-section-builder' && output && !error && (
            <InstallInstructions />
          )}
        </motion.div>
      </div>
    </div>
  )
}

const PREVIEWABLE_AGENTS = new Set(['shopify-section-builder', 'landing-page-builder'])

function extractLiquidCode(markdown: string): string | null {
  const taggedMatch = markdown.match(/```(?:liquid|html)\n([\s\S]*?)```/)
  if (taggedMatch) return taggedMatch[1].trim()

  const untaggedMatch = markdown.match(/```\n([\s\S]*?)```/)
  if (untaggedMatch) return untaggedMatch[1].trim()

  const allBlocks = [...markdown.matchAll(/```(?:\w*)\n([\s\S]*?)```/g)]
  if (allBlocks.length > 1) {
    return allBlocks.map((m) => m[1].trim()).join('\n\n')
  }

  if (markdown.includes('{% schema %}') || markdown.includes('<style>') || markdown.includes('<section')) {
    return markdown.trim()
  }

  return null
}

function extractSchemaDefaults(liquidCode: string): Record<string, string> {
  const defaults: Record<string, string> = {}
  const schemaMatch = liquidCode.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/)
  if (!schemaMatch) return defaults

  try {
    const schema: {
      settings?: Array<{ id?: string; default?: string | number | boolean }>
      presets?: Array<{ settings?: Record<string, string | number | boolean> }>
    } = JSON.parse(schemaMatch[1])

    if (Array.isArray(schema.settings)) {
      for (const setting of schema.settings) {
        if (setting.id && setting.default !== undefined) {
          defaults[setting.id] = String(setting.default)
        }
      }
    }
    if (Array.isArray(schema.presets) && schema.presets[0]?.settings) {
      const presetSettings = schema.presets[0].settings
      for (const [key, value] of Object.entries(presetSettings)) {
        defaults[key] = String(value)
      }
    }
  } catch {
    // Schema JSON parse failed
  }

  return defaults
}

function resolveExpression(expr: string, defaults: Record<string, string>): string {
  const parts = expr.split('|')
  const cleanExpr = parts[0].trim()
  const hasImageTag = parts.some((f) => f.trim().startsWith('image_tag'))

  let resolved = ''

  if (cleanExpr === 'section.id') {
    resolved = 'preview-section'
  } else {
    const stringLiteral = cleanExpr.match(/^['"](.*)['"]$/)
    if (stringLiteral) {
      resolved = stringLiteral[1]
    } else {
      const sectionMatch = cleanExpr.match(/^section\.settings\.(\w+)$/)
      if (sectionMatch) {
        const key = sectionMatch[1]
        if (defaults[key] !== undefined) resolved = defaults[key]
        else if (/title|heading/i.test(key)) resolved = 'Título de ejemplo'
        else if (/description|text|subtitle|content/i.test(key)) resolved = 'Descripción de ejemplo para esta sección'
        else if (/button|cta/i.test(key)) resolved = 'Comprar ahora'
        else if (/image/i.test(key)) resolved = 'https://placehold.co/800x600/e2e8f0/64748b?text=Imagen'
        else if (/color/i.test(key)) resolved = '#1a1a2e'
        else if (/url|link/i.test(key)) resolved = '#'
        else if (/spacing|padding/i.test(key)) resolved = '50'
      } else {
        const blockMatch = cleanExpr.match(/^block\.settings\.(\w+)$/)
        if (blockMatch) {
          const key = blockMatch[1]
          if (/title|heading/i.test(key)) resolved = 'Elemento'
          else if (/text|description|content/i.test(key)) resolved = 'Texto de ejemplo'
          else if (/image/i.test(key)) resolved = 'https://placehold.co/400x400/e2e8f0/64748b?text=Imagen'
          else if (/icon/i.test(key)) resolved = ''
          else if (/url|link/i.test(key)) resolved = '#'
        }
      }
    }
  }

  if (hasImageTag && resolved) {
    return `<img src="${resolved}" alt="" style="max-width:100%;height:auto;" loading="lazy">`
  }

  return resolved
}

function buildPreviewHtml(liquidCode: string): string {
  const defaults = extractSchemaDefaults(liquidCode)
  let html = liquidCode

  html = html.replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, '')
  html = html.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
  html = html.replace(/\{%-?\s*style\s*-?%\}/g, '<style>')
  html = html.replace(/\{%-?\s*endstyle\s*-?%\}/g, '</style>')

  html = html.replace(/\{\{-?\s*([\s\S]*?)\s*-?\}\}/g, (_, expr: string) => {
    return resolveExpression(expr.trim(), defaults)
  })

  html = html.replace(/\{%-?[\s\S]*?-?%\}/g, '')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #1a1a1a; }
  img { max-width: 100%; height: auto; }
  a { color: inherit; text-decoration: none; }
  :root { --rpn: 0px; --rpp: 0px; }
</style>
</head>
<body>
<div id="shopify-section-preview-section">
${html}
</div>
</body>
</html>`
}

function OutputPanel({
  output,
  error,
  running,
  copied,
  onCopy,
  agentSlug,
  agentName,
  runId,
}: {
  output: string
  error: string
  running: boolean
  copied: boolean
  onCopy: () => void
  agentSlug: string
  agentName: string
  runId: string | null
}) {
  const canPreview = PREVIEWABLE_AGENTS.has(agentSlug)
  const [saving, setSaving] = useState(false)
  const [savedRunId, setSavedRunId] = useState<string | null>(null)

  // Derivado en vez de resetear con un efecto: cada ejecución nueva trae otro
  // runId, así que el botón vuelve a habilitarse solo.
  const saved = runId !== null && savedRunId === runId

  async function handleSave() {
    if (!runId) return
    setSaving(true)

    const response = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, title: agentName }),
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
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const previewRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [activeTab])

  const iframeBaseWidth = viewport === 'desktop' ? 1280 : 375
  const previewScale = containerSize.width > 0 ? containerSize.width / iframeBaseWidth : (viewport === 'desktop' ? 0.35 : 1)
  const iframeHeight = containerSize.height > 0 ? Math.round(containerSize.height / previewScale) : 900

  const liquidCode = canPreview && output ? extractLiquidCode(output) : null
  const showPreviewTab = canPreview && !!liquidCode

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Output</CardTitle>
          {showPreviewTab && (
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  activeTab === 'code'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code2 className="h-3 w-3" />
                Código
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>
          )}
          {activeTab === 'preview' && showPreviewTab && (
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
              <button
                onClick={() => setViewport('desktop')}
                className={`p-1 rounded transition-colors ${
                  viewport === 'desktop'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="h-3 w-3" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={`p-1 rounded transition-colors ${
                  viewport === 'mobile'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {output && (
          <div className="flex items-center gap-1">
            {runId && !error && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={saving || saved}
                className="h-7 px-2 text-xs"
              >
                {saved ? (
                  <BookmarkCheck className="h-3 w-3 mr-1 text-active" />
                ) : (
                  <Bookmark className="h-3 w-3 mr-1" />
                )}
                {saved ? 'Guardado' : 'Guardar'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1 text-active" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive max-w-sm text-center space-y-2">
              <p className="font-medium">Error</p>
              <p className="text-destructive/80">{error}</p>
            </div>
          </div>
        ) : output ? (
          activeTab === 'preview' && liquidCode ? (
            <div ref={previewRef} className="w-full h-full overflow-hidden">
              <iframe
                ref={iframeRef}
                srcDoc={buildPreviewHtml(liquidCode)}
                className="border-0 bg-white origin-top-left"
                style={{
                  width: `${iframeBaseWidth}px`,
                  height: `${iframeHeight}px`,
                  transform: `scale(${previewScale})`,
                }}
                sandbox="allow-scripts"
                title="Preview de sección"
              />
            </div>
          ) : (
            <div className="h-full overflow-y-auto pr-2 scrollbar-thin">
              <div className="prose prose-sm prose-invert max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {running ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
                <p>Generando...</p>
              </div>
            ) : (
              <p>El resultado aparecerá aquí</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InstallInstructions() {
  return (
    <Card className="p-4">
      <details>
        <summary className="cursor-pointer text-sm font-medium hover:text-brand transition-colors select-none">
          Cómo instalar en Shopify
        </summary>
        <ol className="mt-3 space-y-2 pl-5 list-decimal text-sm text-muted-foreground">
          <li>Copia el código completo usando el botón <strong className="text-foreground">&quot;Copiar&quot;</strong> de arriba</li>
          <li>En tu tienda Shopify, ve a <strong className="text-foreground">Tienda online → Temas → Personalizar</strong></li>
          <li>Clic en <strong className="text-foreground">&quot;Agregar sección&quot;</strong></li>
          <li>Busca <strong className="text-foreground">&quot;Custom Liquid&quot;</strong> (o &quot;Liquid personalizado&quot;)</li>
          <li>Pega el código en el campo de texto y guarda los cambios</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground/70 border-t border-border/50 pt-2">
          Alternativa: sube el archivo .liquid directamente en <strong>Editar código → sections/</strong> para tener una sección nativa con schema editable.
        </p>
      </details>
    </Card>
  )
}

function DynamicField({
  fieldKey,
  field,
  value,
  onChange,
  agentSlug,
  formData,
}: {
  fieldKey: string
  field: InputField
  value: string
  onChange: (v: string) => void
  agentSlug: string
  formData: Record<string, string>
}) {
  const isRequired = field.required

  if (field.enum) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {field.title}{isRequired && <span className="text-brand ml-0.5">*</span>}
        </Label>
        <Select value={value || field.default || ''} onValueChange={(v) => onChange(v ?? '')}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={`Selecciona ${field.title.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.enum.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const isLongText = field.description?.includes('Pega') || field.description?.includes('Describe') || fieldKey.includes('Data') || fieldKey.includes('data') || fieldKey === 'context' || fieldKey === 'benefits' || fieldKey === 'question' || fieldKey === 'description' || fieldKey === 'currentStructure' || fieldKey === 'issues'

  const nonEnhanceableFields = new Set([
    'colorScheme', 'brandColors', 'url', 'storeUrl', 'price', 'cost',
    'shipping', 'adSpend', 'other', 'budget', 'aov', 'currentCR', 'date',
    'keywords', 'paymentMethods', 'ready', 'references',
  ])
  const showEnhance = !field.enum && !nonEnhanceableFields.has(fieldKey)

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {field.title}{isRequired && <span className="text-brand ml-0.5">*</span>}
      </Label>
      {isLongText ? (
        <Textarea
          placeholder={field.description || ''}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
      ) : (
        <Input
          placeholder={field.description || ''}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}
      {showEnhance && (
        <EnhanceButton
          agentSlug={agentSlug}
          fieldKey={fieldKey}
          fieldTitle={field.title}
          currentValue={value}
          context={formData}
          onEnhanced={onChange}
        />
      )}
    </div>
  )
}

function EnhanceButton({
  agentSlug,
  fieldKey,
  fieldTitle,
  currentValue,
  context,
  onEnhanced,
}: {
  agentSlug: string
  fieldKey: string
  fieldTitle: string
  currentValue: string
  context: Record<string, string>
  onEnhanced: (v: string) => void
}) {
  const [enhancing, setEnhancing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleEnhance() {
    setEnhancing(true)
    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/agents/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSlug, fieldKey, fieldTitle, currentValue, context }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        setEnhancing(false)
        return
      }

      const body = response.body
      if (!body) { setEnhancing(false); return }

      const reader = body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      let done = false
      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          accumulated += decoder.decode(result.value, { stream: true })
          onEnhanced(accumulated)
        }
      }
      const remaining = decoder.decode()
      if (remaining) {
        accumulated += remaining
        onEnhanced(accumulated)
      }
    } catch {
      // aborted or network error
    } finally {
      setEnhancing(false)
      abortRef.current = null
    }
  }

  const isEmpty = currentValue.trim().length < 3

  return (
    <button
      type="button"
      onClick={handleEnhance}
      disabled={enhancing || isEmpty}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 hover:border-brand/30 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {enhancing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Wand2 className="h-3 w-3" />
      )}
      {enhancing ? 'Mejorando...' : 'Mejorar con IA'}
    </button>
  )
}
