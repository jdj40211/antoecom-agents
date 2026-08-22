'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

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

const PROGRAM_LABELS: Record<ProfileData['program'], { label: string; className: string }> = {
  club: { label: 'Club', className: 'bg-club/20 text-club' },
  elite: { label: 'Elite', className: 'bg-elite/20 text-elite' },
  trial: { label: 'Prueba', className: '' },
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

  const program = PROGRAM_LABELS[profile.program]
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tu perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
              <AvatarFallback className="bg-brand/20 text-brand text-xl font-semibold">
                {initials(profile.displayName, profile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {profile.displayName || 'Sin nombre'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={program.className}>
                  {program.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {profile.dailyLimit} ejecuciones por día
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Nombre</Label>
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email} disabled />
              <p className="text-[10px] text-muted-foreground">
                Es con el que iniciás sesión, así que no se puede cambiar desde acá.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              className="bg-brand hover:bg-brand-dark text-white"
              disabled={!profile.editable || saving || !dirty}
              onClick={handleSave}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
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

          <p className="text-xs text-muted-foreground">
            Tu programa lo asigna el equipo de AntoEcom y define cuántas ejecuciones
            tenés por día. Si creés que el tuyo está mal, escribinos.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
