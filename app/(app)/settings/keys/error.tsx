'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'

export default function KeysError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[settings/keys] error de ruta:', error)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader
        title="API Keys"
        description="Conectá tus proveedores. Las keys se encriptan y nunca se muestran completas."
      />
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <AlertTriangle className="size-8 text-muted-foreground/60" />
        </span>
        <p className="text-sm font-medium text-foreground">No pudimos cargar tus API keys</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Algo falló al traer tu información. Probá de nuevo en un momento.
        </p>
        <Button variant="outline" size="sm" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}
