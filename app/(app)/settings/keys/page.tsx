'use client'

import Link from 'next/link'
import { ApiKeyManager } from '@/components/settings/ApiKeyManager'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function KeysPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader
        title="API Keys"
        description="Conectá tus proveedores. Las keys se encriptan y nunca se muestran completas."
      />

      <Tabs value="keys">
        <TabsList>
          <TabsTrigger value="keys" render={<Link href="/settings/keys" />}>
            API Keys
          </TabsTrigger>
          <TabsTrigger value="profile" render={<Link href="/settings/profile" />}>
            Perfil
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ApiKeyManager />
    </div>
  )
}
