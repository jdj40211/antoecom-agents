'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { KeyRound, Plus, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { listContainer, listItem } from '@/lib/motion/variants'
import type { CodigoVista, CanjeVista } from '@/lib/admin/queries'

const ESTADO_CLASE: Record<CodigoVista['estado'], string> = {
  activo: 'bg-success/10 text-success border-success/20',
  vencido: 'bg-muted text-muted-foreground border-border',
  agotado: 'bg-warning/10 text-warning border-warning/20',
}

function fecha(iso: string | null): string {
  if (!iso) return 'sin vencimiento'
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AdminPanel({
  codigosIniciales,
  canjesIniciales,
}: {
  codigosIniciales: CodigoVista[]
  canjesIniciales: CanjeVista[]
}) {
  const router = useRouter()
  const [refrescando, startTransition] = useTransition()

  const [creando, setCreando] = useState(false)
  const [dandoBaja, setDandoBaja] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  // Los datos llegan resueltos desde el servidor y se refrescan desde ahí
  // después de cada cambio. Mantener una copia en estado obligaría a replicar
  // acá reglas que ya viven en un solo lugar, como cuándo un código pasa a
  // vencido.
  const codigos = codigosIniciales
  const canjes = canjesIniciales

  function refrescar() {
    startTransition(() => router.refresh())
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length < 6) {
      toast.error('El código tiene que ser de al menos 6 caracteres.')
      return
    }

    setCreando(true)
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          label: label || null,
          maxUses: maxUses || null,
          expiresAt: expiresAt || null,
        }),
      })

      const d = (await res.json().catch(() => ({}))) as {
        code?: CodigoVista
        error?: string
      }

      if (!res.ok || !d.code) {
        toast.error(d.error ?? 'No se pudo crear el código.')
        return
      }

      setCode('')
      setLabel('')
      setMaxUses('')
      setExpiresAt('')
      toast.success(`Código ${d.code.code} creado.`)
      refrescar()
    } catch {
      toast.error('No pudimos conectar con el servidor.')
    } finally {
      setCreando(false)
    }
  }

  async function darDeBaja(c: CodigoVista) {
    // Confirmación antes de cerrar la puerta: si el código está circulando en
    // la comunidad, darlo de baja deja afuera a todos los que todavía no
    // entraron, hasta que se reparta otro.
    const ok = window.confirm(
      `Dar de baja ${c.code}. Nadie más va a poder registrarse con ese código. ¿Seguimos?`
    )
    if (!ok) return

    setDandoBaja(c.code)
    try {
      const res = await fetch(`/api/admin/codes/${encodeURIComponent(c.code)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(d.error ?? 'No se pudo dar de baja.')
        return
      }

      toast.success(`${c.code} dado de baja.`)
      refrescar()
    } catch {
      toast.error('No pudimos conectar con el servidor.')
    } finally {
      setDandoBaja(null)
    }
  }

  const activos = codigos.filter((c) => c.estado === 'activo').length
  const usosTotales = codigos.reduce((n, c) => n + c.uses, 0)

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Códigos activos" value={String(activos)} mono />
        <StatCard label="Códigos en total" value={String(codigos.length)} mono />
        <StatCard
          label="Personas que entraron"
          value={String(usosTotales)}
          mono
          hint="Canjes contados sobre todos los códigos"
        />
      </div>

      <Tabs defaultValue="codigos">
        <TabsList>
          <TabsTrigger value="codigos">Códigos</TabsTrigger>
          <TabsTrigger value="canjes">Quién entró</TabsTrigger>
        </TabsList>

        <TabsContent value="codigos" className="mt-5 space-y-6">
          <Card className="p-4 md:p-5">
            <h2 className="text-base font-medium">Crear un código</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sin vencimiento no caduca. Sin tope, no se agota.
            </p>

            <form onSubmit={crear} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CAMADA-MARZO"
                  autoComplete="off"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Etiqueta</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Para acordarte de qué era"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Tope de usos</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="sin tope"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Vence el</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={creando || refrescando}
                  className="w-full sm:w-auto h-11"
                >
                  {creando ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Creando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="size-4" />
                      Crear código
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {codigos.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Todavía no hay códigos"
              description="Creá el primero para que la comunidad pueda registrarse."
            />
          ) : (
            <motion.ul
              variants={listContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {codigos.map((c) => (
                <motion.li key={c.code} variants={listItem}>
                  <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">{c.code}</span>
                        <Badge variant="outline" className={ESTADO_CLASE[c.estado]}>
                          {c.estado}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {c.label ? `${c.label} · ` : ''}
                        {c.uses}
                        {c.maxUses !== null ? ` de ${c.maxUses}` : ''} usos ·{' '}
                        {fecha(c.expiresAt)}
                      </p>
                    </div>

                    {c.estado !== 'vencido' && (
                      <Button
                        variant="outline"
                        onClick={() => void darDeBaja(c)}
                        disabled={dandoBaja === c.code}
                        className="h-11 shrink-0 sm:h-9"
                      >
                        {dandoBaja === c.code ? 'Dando de baja...' : 'Dar de baja'}
                      </Button>
                    )}
                  </Card>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </TabsContent>

        <TabsContent value="canjes" className="mt-5">
          {canjes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nadie se registró todavía"
              description="Acá vas a ver quién entró y con qué código."
            />
          ) : (
            <div className="scrollbar-subtle overflow-x-auto">
              <ul className="min-w-[420px] space-y-2">
                {canjes.map((r) => (
                  <li
                    key={r.email}
                    className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3"
                  >
                    <span className="truncate text-sm">{r.email}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {r.code}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fecha(r.redeemedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
