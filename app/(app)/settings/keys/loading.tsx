import { PageHeader } from '@/components/shared/PageHeader'
import { ListSkeleton } from '@/components/shared/skeletons'

export default function KeysLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader
        title="API Keys"
        description="Conectá tus proveedores. Las keys se encriptan y nunca se muestran completas."
      />
      <ListSkeleton rows={6} />
    </div>
  )
}
