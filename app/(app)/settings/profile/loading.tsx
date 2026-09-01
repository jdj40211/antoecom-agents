import { PageHeader } from '@/components/shared/PageHeader'
import { FormSkeleton } from '@/components/shared/skeletons'

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Perfil" description="Tu información y el programa que te asignó AntoEcom." />
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <FormSkeleton fields={2} />
      </div>
    </div>
  )
}
