'use client'

import { use, useCallback, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Crown } from 'lucide-react'

import { AgentRunForm } from '@/components/agents/AgentRunForm'
import { OutputPanel } from '@/components/agents/OutputPanel'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAgent, type AgentDef } from '@/lib/agents/catalog'
import { useAgentRunStore } from '@/lib/store/agent-runs'
import { tierBadgeClass, tierLabel } from '@/lib/utils/tier'

export default function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const agent = getAgent(slug)

  if (!agent) notFound()

  return <AgentScreen agent={agent} />
}

function AgentScreen({ agent }: { agent: AgentDef }) {
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(agent.inputSchema).map(([key, field]) => [key, field.default ?? ''])
    )
  )
  const [selectedModel, setSelectedModel] = useState(agent.defaultModel)
  const startRun = useAgentRunStore((state) => state.startRun)

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData((previous) => ({ ...previous, [key]: value }))
  }, [])

  const handleRun = useCallback(() => {
    startRun(agent.slug, {
      agentSlug: agent.slug,
      input: formData,
      modelOverride: selectedModel !== agent.defaultModel ? selectedModel : undefined,
    })

    // En mobile el output vive debajo del formulario: sin esto la ejecución
    // arranca fuera de la vista y parece que no pasó nada.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('output-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [agent.slug, agent.defaultModel, formData, selectedModel, startRun])

  const Icon = agent.icon

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <PageHeader
        title={agent.name}
        description={agent.description}
        leading={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" render={<Link href="/agents" />}>
              <ArrowLeft />
              <span className="sr-only">Volver a agentes</span>
            </Button>
            <span className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </span>
          </div>
        }
        actions={
          <>
            <Badge variant="outline" className={tierBadgeClass(agent.modelTier)}>
              {tierLabel(agent.modelTier)}
            </Badge>
            {agent.isPremium ? (
              <Badge variant="elite">
                <Crown />
                Elite
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[400px_1fr]">
        <AgentRunForm
          agent={agent}
          formData={formData}
          onFieldChange={handleFieldChange}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onRun={handleRun}
        />
        <OutputPanel agent={agent} onRerun={handleRun} />
      </div>
    </div>
  )
}
