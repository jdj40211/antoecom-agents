'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function RunDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[history/:id] error de ruta:', error)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <AlertTriangle className="size-8 text-muted-foreground/60" />
        </span>
        <p className="text-sm font-medium text-foreground">No pudimos cargar esta ejecución</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Algo falló al traer los detalles. Probá de nuevo en un momento.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            Reintentar
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/history" />}>
            Volver al historial
          </Button>
        </div>
      </div>
    </div>
  )
}
