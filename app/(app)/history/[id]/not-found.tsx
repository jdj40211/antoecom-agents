import { FileSearch } from 'lucide-react'

import { EmptyState } from '@/components/shared/EmptyState'

export default function RunNotFound() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <EmptyState
        icon={FileSearch}
        title="Esta ejecución no existe"
        description="Puede que se haya eliminado o que el enlace esté mal escrito."
        action={{ label: 'Ver historial', href: '/history' }}
      />
    </div>
  )
}
