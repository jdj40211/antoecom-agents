import { FormSkeleton } from '@/components/shared/skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function RunDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <FormSkeleton fields={2} />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
