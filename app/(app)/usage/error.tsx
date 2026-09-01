'use client'

import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'

export default function UsageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Uso" description="Tu consumo de tokens y costos este mes" />
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-4 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <AlertTriangle className="size-8 text-muted-foreground/60" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">No pudimos cargar tu uso</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Algo salió mal al traer tus datos de consumo. Probá de nuevo en un momento.
          </p>
        </div>
        <Button variant="outline" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}
