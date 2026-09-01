'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function AgentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[agents/[slug]]', error)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <AlertTriangle className="size-8 text-muted-foreground/60" />
        </span>
        <p className="mt-4 text-sm font-medium text-foreground">
          Se rompió la pantalla del agente
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Fue un problema nuestro, no tuyo. Probá de nuevo y si sigue igual, volvé al catálogo de
          agentes.
        </p>
        <Button variant="outline" className="mt-4" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}
