'use client'

import { use, useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Loader2, Copy, Check, ArrowLeft, Crown } from 'lucide-react'
import Link from 'next/link'
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
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  const Icon = agent.icon

  function updateField(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const [error, setError] = useState('')

  async function handleRun() {
    setRunning(true)
    setOutput('')
    setError('')

    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentSlug: agent.slug,
          input: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error ?? `Error ${response.status}: Algo salio mal`

        // Add helpful context for specific error types
        if (response.status === 429) {
          setError(`${errorMessage}`)
        } else if (response.status === 400 && errorData?.provider) {
          setError(`${errorMessage}`)
        } else {
          setError(errorMessage)
        }
        setRunning(false)
        return
      }

      const body = response.body
      if (!body) {
        setError('No se recibio respuesta del servidor')
        setRunning(false)
        return
      }

      const reader = body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      let done = false
      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          const chunk = decoder.decode(result.value, { stream: true })
          accumulated += chunk
          setOutput(accumulated)
        }
      }

      // Flush remaining bytes
      const remaining = decoder.decode()
      if (remaining) {
        accumulated += remaining
        setOutput(accumulated)
      }
    } catch (fetchError) {
      const message = fetchError instanceof Error
        ? fetchError.message
        : 'Error de conexion'
      setError(`No se pudo conectar con el servidor: ${message}`)
    } finally {
      setRunning(false)
    }
  }

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const requiredFields = Object.entries(agent.inputSchema).filter(([, f]) => f.required)
  const allRequiredFilled = requiredFields.every(([key]) => formData[key]?.trim())

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
                />
              ))}

              <Separator />

              <Button
                onClick={handleRun}
                disabled={running || !allRequiredFilled}
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
        >
          <Card className="min-h-[400px] flex flex-col">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Output</CardTitle>
              {output && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs"
                >
                  {copied ? (
                    <Check className="h-3 w-3 mr-1 text-active" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              {error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive max-w-sm text-center space-y-2">
                    <p className="font-medium">Error</p>
                    <p className="text-destructive/80">{error}</p>
                  </div>
                </div>
              ) : output ? (
                <div className="prose prose-sm prose-invert max-w-none text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </div>
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
        </motion.div>
      </div>
    </div>
  )
}

function DynamicField({
  fieldKey,
  field,
  value,
  onChange,
}: {
  fieldKey: string
  field: InputField
  value: string
  onChange: (v: string) => void
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

  const isLongText = field.description?.includes('Pega') || fieldKey.includes('Data') || fieldKey.includes('data') || fieldKey === 'context' || fieldKey === 'benefits' || fieldKey === 'question'

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
    </div>
  )
}
