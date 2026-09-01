'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ExternalLink, KeyRound, Loader2, MoreVertical, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { listContainer, listItem } from '@/lib/motion/variants'
import { useUserKeysStore } from '@/lib/store/user-keys'
import { PROVIDERS } from '@/lib/utils/constants'

type Provider = (typeof PROVIDERS)[number]
type KeyStatus = 'empty' | 'verifying' | 'connected' | 'error'

interface KeyState {
  status: KeyStatus
  hint: string
  error: string
  lastVerified: string
}

interface KeyFromServer {
  provider: string
  hint: string
  isValid: boolean
  lastVerified: string | null
}

function buildInitialKeys(): Record<string, KeyState> {
  const initial: Record<string, KeyState> = {}
  PROVIDERS.forEach((p) => {
    initial[p.id] = { status: 'empty', hint: '', error: '', lastVerified: '' }
  })
  return initial
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<Record<string, KeyState>>(buildInitialKeys)
  const [dialogProvider, setDialogProvider] = useState<Provider | null>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const didLoadRef = useRef(false)

  const applyServerKeys = useCallback((serverKeys: KeyFromServer[]) => {
    setKeys((prev) => {
      const next = { ...prev }
      serverKeys.forEach((serverKey) => {
        if (serverKey.provider in next) {
          next[serverKey.provider] = {
            status: serverKey.isValid ? 'connected' : 'error',
            hint: serverKey.hint,
            error: serverKey.isValid ? '' : 'Key guardada pero inválida.',
            lastVerified: serverKey.lastVerified
              ? new Date(serverKey.lastVerified).toLocaleString('es-CO')
              : '',
          }
        }
      })
      return next
    })
  }, [])

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys')
      if (!res.ok) return
      const data: { keys: KeyFromServer[] } = await res.json()
      applyServerKeys(data.keys)
    } catch {
      // Falla silenciosa: las keys quedan como vacías.
    }
  }, [applyServerKeys])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    void loadKeys()
  }, [loadKeys])

  function openDialog(provider: Provider) {
    setDialogProvider(provider)
    setDialogValue('')
    setShowValue(false)
  }

  function closeDialog() {
    setDialogProvider(null)
    setDialogValue('')
  }

  async function handleSave() {
    const provider = dialogProvider
    if (!provider || !dialogValue.trim()) return

    setKeys((prev) => ({
      ...prev,
      [provider.id]: { ...prev[provider.id], status: 'verifying', error: '' },
    }))

    try {
      const res = await fetch('/api/keys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id, apiKey: dialogValue }),
      })

      const data: { valid: boolean; error?: string; hint?: string } = await res.json()

      if (data.valid) {
        setKeys((prev) => ({
          ...prev,
          [provider.id]: {
            status: 'connected',
            hint: data.hint ?? `...${dialogValue.slice(-6)}`,
            error: '',
            lastVerified: new Date().toLocaleString('es-CO'),
          },
        }))
        closeDialog()
        // El resto de la app (hub y la pantalla del agente) lee las keys de
        // este store, así que hay que avisarle del cambio.
        void useUserKeysStore.getState().refresh()
      } else {
        setKeys((prev) => ({
          ...prev,
          [provider.id]: {
            status: 'error',
            hint: '',
            error: data.error ?? 'API key inválida, revisala e intentá de nuevo.',
            lastVerified: '',
          },
        }))
      }
    } catch {
      setKeys((prev) => ({
        ...prev,
        [provider.id]: {
          status: 'error',
          hint: '',
          error: 'Error de conexión al verificar la key.',
          lastVerified: '',
        },
      }))
    }
  }

  async function handleRemove(providerId: string) {
    setKeys((prev) => ({
      ...prev,
      [providerId]: { status: 'empty', hint: '', error: '', lastVerified: '' },
    }))

    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      if (!res.ok) await loadKeys()
    } catch {
      await loadKeys()
    }

    // Después del DELETE, no antes: si no, el store se recargaría con la key
    // todavía presente. El resto de la app lee las keys de acá.
    void useUserKeysStore.getState().refresh()
  }

  const connectedCount = Object.values(keys).filter((k) => k.status === 'connected').length
  const dialogState = dialogProvider ? keys[dialogProvider.id] : null
  const isReplacing = dialogState?.status === 'connected'
  const isSaving = dialogState?.status === 'verifying'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {connectedCount} de {PROVIDERS.length} proveedores conectados
        </p>
      </div>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        {PROVIDERS.map((provider) => {
          const state = keys[provider.id]

          return (
            <motion.div
              key={provider.id}
              variants={listItem}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                </div>

                {state.status === 'connected' ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{state.hint}</span>
                    <Badge variant="success">Activa</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" className="size-11 md:size-8" />
                        }
                      >
                        <MoreVertical />
                        <span className="sr-only">Acciones de {provider.name}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(provider)}>
                          Reemplazar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleRemove(provider.id)}
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {state.status === 'error' && <Badge variant="destructive">Error</Badge>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 md:h-8"
                      onClick={() => openDialog(provider)}
                    >
                      {state.status === 'error' ? 'Reintentar' : 'Agregar'}
                    </Button>
                  </div>
                )}
              </div>

              {state.status === 'error' && state.error ? (
                <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                  <XCircle className="size-3" />
                  {state.error}
                </p>
              ) : null}
            </motion.div>
          )
        })}
      </motion.div>

      <Dialog open={dialogProvider !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {dialogProvider ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {isReplacing
                    ? `Reemplazar la key de ${dialogProvider.name}`
                    : `Conectar ${dialogProvider.name}`}
                </DialogTitle>
                <DialogDescription>{dialogProvider.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showValue ? 'text' : 'password'}
                    placeholder={dialogProvider.placeholder}
                    value={dialogValue}
                    onChange={(e) => setDialogValue(e.target.value)}
                    className="pr-9 font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowValue((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showValue ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span className="sr-only">{showValue ? 'Ocultar key' : 'Mostrar key'}</span>
                  </button>
                </div>

                {dialogState?.status === 'error' && dialogState.error ? (
                  <p className="text-xs text-destructive">{dialogState.error}</p>
                ) : null}

                <a
                  href={dialogProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Conseguí tu key en {dialogProvider.name}
                </a>
              </div>

              <DialogFooter>
                <Button variant="outline" className="h-11 md:h-9" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  className="h-11 md:h-9"
                  disabled={!dialogValue.trim() || isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
