import { PageHeader } from '@/components/shared/PageHeader'
import { ListSkeleton, CardGridSkeleton } from '@/components/shared/skeletons'

export default function HubLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Hola" description="¿Qué vas a lanzar hoy?" />
      <ListSkeleton rows={3} />
      <CardGridSkeleton cards={6} />
    </div>
  )
}
