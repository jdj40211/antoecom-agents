import { PageHeader } from '@/components/shared/PageHeader'
import { ListSkeleton } from '@/components/shared/skeletons'

export default function HistoryLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Historial" description="Tus ejecuciones recientes" />
      <ListSkeleton rows={8} />
    </div>
  )
}
