import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { ProfileForm, type ProfileData } from '@/components/settings/ProfileForm'

export const dynamic = 'force-dynamic'

type Program = ProfileData['program']

const PROGRAMS: Program[] = ['club', 'elite', 'trial']

function toProgram(value: unknown): Program {
  return PROGRAMS.includes(value as Program) ? (value as Program) : 'trial'
}

export default async function ProfilePage() {
  const user = await getUser()

  const base: ProfileData = {
    email: user?.email ?? '',
    displayName: '',
    avatarUrl: '',
    program: 'trial',
    dailyLimit: 0,
    editable: false,
  }

  if (!user || !isSupabaseConfigured()) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
        <ProfileForm profile={base} />
      </div>
    )
  }

  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('community_profiles')
    .select('display_name, avatar_url, program')
    .eq('id', user.id)
    .maybeSingle()

  if (error) console.error('[profile] load:', error.message)

  const program = toProgram(profile?.program)

  // El límite sale de la misma tabla que usa el rate limiter, así que lo que ve
  // el usuario y lo que se le aplica no pueden separarse.
  const { data: limit } = await supabase
    .from('rate_limit_config')
    .select('max_runs_per_day')
    .eq('program', program)
    .maybeSingle()

  const data: ProfileData = {
    email: user.email,
    displayName: (profile?.display_name as string | null) ?? '',
    avatarUrl: (profile?.avatar_url as string | null) ?? '',
    program,
    dailyLimit: (limit?.max_runs_per_day as number | null) ?? 0,
    editable: true,
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <ProfileForm profile={data} />
    </div>
  )
}
