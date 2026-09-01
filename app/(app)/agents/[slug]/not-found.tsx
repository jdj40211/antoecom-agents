import { SearchX } from 'lucide-react'

import { EmptyState } from '@/components/shared/EmptyState'

export default function AgentNotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <EmptyState
        icon={SearchX}
        title="Este agente no existe"
        description="Puede que haya cambiado de nombre o que el link esté mal escrito."
        action={{ label: 'Ver todos los agentes', href: '/agents' }}
      />
    </div>
  )
}
