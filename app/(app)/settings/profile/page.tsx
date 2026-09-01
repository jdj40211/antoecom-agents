import Link from 'next/link'
import type { ReactNode } from 'react'
import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { ProfileForm, type ProfileData } from '@/components/settings/ProfileForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Perfil" description="Tu información en la comunidad AntoEcom." />

      <Tabs value="profile">
        <TabsList>
          <TabsTrigger value="keys" render={<Link href="/settings/keys" />}>
            API Keys
          </TabsTrigger>
          <TabsTrigger value="profile" render={<Link href="/settings/profile" />}>
            Perfil
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {children}
    </div>
  )
}

export default async function ProfilePage() {
  const user = await getUser()

  const base: ProfileData = {
    email: user?.email ?? '',
    displayName: '',
    avatarUrl: '',
    runsToday: 0,
    editable: false,
  }

  if (!user || !isSupabaseConfigured()) {
    return (
      <SettingsShell>
        <ProfileForm profile={base} />
      </SettingsShell>
    )
  }

  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('community_profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (error) console.error('[profile] load:', error.message)

  // Acá se leía `program` y con eso se buscaba el límite diario en
  // `rate_limit_config`. Ya no hay programas y el límite es uno solo para todos,
  // así que mostrarlo era presentar un freno técnico como si fuera un plan. En
  // su lugar va lo que el usuario sí puede accionar: cuánto lleva usado hoy.
  //
  // En UTC, igual que el CURRENT_DATE de `reserve_agent_run`, para que el
  // contador que se muestra y el que aplica el límite corten el día igual.
  const today = new Date().toISOString().slice(0, 10)

  // Una fila por proveedor, así que hay que sumarlas.
  const { data: usageRows, error: usageError } = await supabase
    .from('usage_daily')
    .select('total_runs')
    .eq('user_id', user.id)
    .eq('usage_date', today)

  if (usageError) console.error('[profile] uso del día:', usageError.message)

  const runsToday = (usageRows ?? []).reduce(
    (total, row) => total + ((row.total_runs as number | null) ?? 0),
    0
  )

  const data: ProfileData = {
    email: user.email,
    displayName: (profile?.display_name as string | null) ?? '',
    avatarUrl: (profile?.avatar_url as string | null) ?? '',
    runsToday,
    editable: true,
  }

  return (
    <SettingsShell>
      <ProfileForm profile={data} />
    </SettingsShell>
  )
}
