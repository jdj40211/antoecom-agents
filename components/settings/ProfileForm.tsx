'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fadeIn } from '@/lib/motion/variants'

export interface ProfileData {
  email: string
  displayName: string
  avatarUrl: string
  program: 'club' | 'elite' | 'trial'
  /** Cuántas ejecuciones por día le tocan según su programa. */
  dailyLimit: number
  /** false en dev sin Supabase: se muestra el perfil pero no se puede guardar. */
  editable: boolean
}

const PROGRAM_LABELS: Record<ProfileData['program'], string> = {
  club: 'Club',
  elite: 'Elite',
  trial: 'Prueba',
}

function initials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? 'U').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
}

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter()
  const [name, setName] = useState(profile.displayName)
  const [saving, setSaving] = useState(false)

  const programLabel = PROGRAM_LABELS[profile.program]
  const dirty = name.trim() !== profile.displayName.trim()

  async function handleSave() {
    setSaving(true)

    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    })

    setSaving(false)

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(data?.error ?? 'No pudimos guardar los cambios.')
      return
    }

    toast.success('Perfil actualizado')
    router.refresh()
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible">
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg text-foreground">Tu perfil</h2>

        <div className="mt-6 flex items-center gap-4">
          <Avatar size="lg">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
            <AvatarFallback className="text-lg">
              {initials(profile.displayName, profile.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {profile.displayName || 'Sin nombre'}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={profile.program === 'elite' ? 'elite' : 'secondary'}
              >
                {programLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {profile.dailyLimit} ejecuciones por día
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name" className="text-sm font-medium text-foreground">
              Nombre
            </Label>
            <Input
              id="display-name"
              placeholder="Tu nombre"
              value={name}
              maxLength={200}
              disabled={!profile.editable || saving}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <Input id="email" type="email" value={profile.email} disabled />
            <p className="text-xs text-muted-foreground">
              Es con el que iniciás sesión, así que no se puede cambiar desde acá.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="default"
            disabled={!profile.editable || saving || !dirty}
            onClick={handleSave}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Guardando...
              </span>
            ) : (
              'Guardar cambios'
            )}
          </Button>
          {!profile.editable && (
            <p className="text-xs text-muted-foreground">
              Sin Supabase configurado, el perfil es de solo lectura.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Tu programa lo asigna el equipo de AntoEcom y define cuántas ejecuciones tenés por día.
          Si creés que el tuyo está mal, escribinos.
        </p>
      </div>
    </motion.div>
  )
}
