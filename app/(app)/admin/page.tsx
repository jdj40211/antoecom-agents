import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { getUser } from '@/lib/auth/dal'
import { cargarPanel } from '@/lib/admin/queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await getUser()

  // notFound y no un redirect: quien no es admin ve exactamente lo mismo que
  // vería con una URL inventada. Decirle "no tenés permiso" le confirmaría que
  // acá hay un panel de administración.
  if (!user?.isAdmin) notFound()

  const { codigos, canjes, configurado } = await cargarPanel()

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Administración"
        description="Códigos de invitación para entrar a la comunidad."
      />

      {configurado ? (
        <AdminPanel codigosIniciales={codigos} canjesIniciales={canjes} />
      ) : (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/10 p-4">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium">Falta configurar la instancia</p>
            <p className="mt-1 text-muted-foreground">
              No está cargada la service role key de Supabase, así que no se pueden
              leer ni crear códigos. Se configura en las variables de entorno del
              proyecto.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
