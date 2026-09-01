'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { KeyRound, Loader2, Play, Square, Wand2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { AgentDef, InputField } from '@/lib/agents/catalog'
import { getModelInfo } from '@/lib/agents/model-info'
import { resolveProvider } from '@/lib/agents/resolve-provider'
import { useAgentRunStore } from '@/lib/store/agent-runs'
import { useUserKeys } from '@/lib/store/user-keys'
import { PROVIDERS } from '@/lib/utils/constants'
import { tierLabel, tierTextClass } from '@/lib/utils/tier'

export interface AgentRunFormProps {
  agent: AgentDef
  formData: Record<string, string>
  onFieldChange: (key: string, value: string) => void
  selectedModel: string
  onModelChange: (model: string) => void
  onRun: () => void
}

function providerLabel(provider: string): string {
  return PROVIDERS.find((p) => p.id === provider)?.name ?? provider
}

export function AgentRunForm({
  agent,
  formData,
  onFieldChange,
  selectedModel,
  onModelChange,
  onRun,
}: AgentRunFormProps) {
  const running = useAgentRunStore((state) => state.runs[agent.slug]?.running ?? false)
  const stopRun = useAgentRunStore((state) => state.stopRun)
  const { ready: keysReady, hasValidKey } = useUserKeys()

  const modelInfo = getModelInfo(selectedModel)

  // Cada modelo se ejecuta con la key del usuario para ese proveedor. Sin esto
  // el formulario se llenaba entero y el aviso de key faltante recién aparecía
  // después de apretar Ejecutar.
  const neededProvider = resolveProvider(selectedModel)
  const missingKey = keysReady && !hasValidKey(neededProvider)

  const requiredFields = Object.entries(agent.inputSchema).filter(([, field]) => field.required)
  const allRequiredFilled = requiredFields.every(([key]) => formData[key]?.trim())

  return (
    <Card className="py-6">
      <CardContent className="space-y-5 px-6">
        {Object.entries(agent.inputSchema).map(([key, field]) => (
          <DynamicField
            key={key}
            fieldKey={key}
            field={field}
            value={formData[key] ?? ''}
            onChange={(value) => onFieldChange(key, value)}
            agentSlug={agent.slug}
            formData={formData}
          />
        ))}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="model-select" className="text-sm font-medium text-foreground">
            Modelo
          </Label>
          <Select
            value={selectedModel}
            onValueChange={(value: unknown) => {
              if (typeof value === 'string') onModelChange(value)
            }}
          >
            <SelectTrigger id="model-select" className="w-full">
              <span className="truncate">{modelInfo?.name ?? selectedModel}</span>
            </SelectTrigger>
            <SelectContent>
              {agent.allowedModels.map((modelId) => {
                const info = getModelInfo(modelId)
                const noKey = keysReady && !hasValidKey(resolveProvider(modelId))
                return (
                  <SelectItem key={modelId} value={modelId}>
                    {info ? `${info.name} · ${info.costLabel}` : modelId}
                    {noKey ? ' (sin key)' : ''}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {modelInfo ? (
            <p className="text-xs text-muted-foreground">
              Costo estimado:{' '}
              <span className="font-mono text-foreground">{modelInfo.costLabel}</span>
              {' · '}
              <span className={tierTextClass(modelInfo.tier)}>{tierLabel(modelInfo.tier)}</span>
            </p>
          ) : null}
        </div>

        {missingKey ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="space-y-1 text-xs">
              <p className="font-medium text-warning">
                Te falta la API key de {providerLabel(neededProvider)}
              </p>
              <p className="text-muted-foreground">
                Este modelo corre con tu propia key.{' '}
                <Link href="/settings/keys" className="text-primary hover:underline">
                  Agregala en Configuración
                </Link>{' '}
                o elegí un modelo de un proveedor que ya tengas.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Button
            onClick={onRun}
            disabled={running || !allRequiredFilled || missingKey}
            className="h-11 w-full lg:h-10"
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Ejecutar agente
              </>
            )}
          </Button>
          {running ? (
            <Button
              variant="secondary"
              onClick={() => stopRun(agent.slug)}
              className="h-11 w-full lg:h-10"
            >
              <Square className="size-4" />
              Detener
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

const LONG_TEXT_FIELDS = new Set([
  'context',
  'benefits',
  'question',
  'description',
  'currentStructure',
  'issues',
])

const NON_ENHANCEABLE_FIELDS = new Set([
  'colorScheme', 'brandColors', 'url', 'storeUrl', 'price', 'cost',
  'shipping', 'adSpend', 'other', 'budget', 'aov', 'currentCR', 'date',
  'keywords', 'paymentMethods', 'ready', 'references',
])

function isLongText(fieldKey: string, field: InputField): boolean {
  if (LONG_TEXT_FIELDS.has(fieldKey)) return true
  if (fieldKey.toLowerCase().includes('data')) return true
  const hint = field.description ?? ''
  return hint.includes('Pega') || hint.includes('Describe')
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
  onChange: (value: string) => void
  agentSlug: string
  formData: Record<string, string>
}) {
  const inputId = `field-${fieldKey}`
  const label = (
    <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
      {field.title}
      {field.required ? null : (
        <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
      )}
    </Label>
  )

  if (field.enum) {
    return (
      <div className="space-y-2">
        {label}
        <Select
          value={value || field.default || ''}
          onValueChange={(next: unknown) => {
            if (typeof next === 'string') onChange(next)
          }}
        >
          <SelectTrigger id={inputId} className="w-full">
            <span className="truncate">
              {value || field.default || `Elegí ${field.title.toLowerCase()}`}
            </span>
          </SelectTrigger>
          <SelectContent>
            {field.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const showEnhance = !NON_ENHANCEABLE_FIELDS.has(fieldKey)

  return (
    <div className="space-y-2">
      {label}
      {isLongText(fieldKey, field) ? (
        <Textarea
          id={inputId}
          placeholder={field.description ?? ''}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-24"
        />
      ) : (
        <Input
          id={inputId}
          placeholder={field.description ?? ''}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {showEnhance ? (
        <EnhanceButton
          agentSlug={agentSlug}
          fieldKey={fieldKey}
          fieldTitle={field.title}
          currentValue={value}
          context={formData}
          onEnhanced={onChange}
        />
      ) : null}
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
  onEnhanced: (value: string) => void
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

      if (!response.ok) return

      const body = response.body
      if (!body) return

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
      // Cancelado o error de red: el campo queda como estaba.
    } finally {
      setEnhancing(false)
      abortRef.current = null
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
      onClick={() => void handleEnhance()}
      disabled={enhancing || currentValue.trim().length < 3}
    >
      {enhancing ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Wand2 className="size-3.5" />
      )}
      {enhancing ? 'Mejorando...' : 'Mejorar con IA'}
    </Button>
  )
}
