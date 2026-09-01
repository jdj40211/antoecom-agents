import { PageHeader } from '@/components/shared/PageHeader'
import { ListSkeleton } from '@/components/shared/skeletons'

export default function SavedLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Guardados" description="Outputs que guardaste" />
      <ListSkeleton rows={6} />
    </div>
  )
}
