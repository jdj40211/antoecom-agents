'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-5 text-destructive" />
      </div>
      <div>
        <h1 className="text-lg font-medium">No pudimos abrir la administración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Puede ser algo momentáneo. Probá de nuevo.
        </p>
      </div>
      <Button onClick={reset} className="h-11">
        Reintentar
      </Button>
    </div>
  )
}
