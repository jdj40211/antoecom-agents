'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, ExternalLink, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PROVIDERS } from '@/lib/utils/constants'

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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
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
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const didLoadRef = useRef(false)

  const applyServerKeys = useCallback((serverKeys: KeyFromServer[]) => {
    setKeys((prev) => {
      const next = { ...prev }
      serverKeys.forEach((serverKey) => {
        if (serverKey.provider in next) {
          next[serverKey.provider] = {
            status: serverKey.isValid ? 'connected' : 'error',
            hint: serverKey.hint,
            error: serverKey.isValid ? '' : 'Key guardada pero inválida',
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
      // Silently fail on load - keys will show as empty
    }
  }, [applyServerKeys])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true

    let cancelled = false

    async function fetchKeys() {
      try {
        const res = await fetch('/api/keys')
        if (!res.ok || cancelled) return
        const data: { keys: KeyFromServer[] } = await res.json()
        if (!cancelled) {
          applyServerKeys(data.keys)
        }
      } catch {
        // Silently fail on load
      }
    }

    fetchKeys()

    return () => {
      cancelled = true
    }
  }, [applyServerKeys])

  async function handleVerify(providerId: string) {
    const value = inputValues[providerId]
    if (!value?.trim()) return

    setKeys((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], status: 'verifying', error: '' },
    }))

    try {
      const res = await fetch('/api/keys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey: value }),
      })

      const data: { valid: boolean; error?: string; hint?: string } = await res.json()

      if (data.valid) {
        setKeys((prev) => ({
          ...prev,
          [providerId]: {
            status: 'connected',
            hint: data.hint ?? `...${value.slice(-6)}`,
            error: '',
            lastVerified: new Date().toLocaleString('es-CO'),
          },
        }))
        setInputValues((prev) => ({ ...prev, [providerId]: '' }))
      } else {
        setKeys((prev) => ({
          ...prev,
          [providerId]: {
            status: 'error',
            hint: '',
            error: data.error ?? 'API key inválida. Verifica que sea correcta.',
            lastVerified: '',
          },
        }))
      }
    } catch {
      setKeys((prev) => ({
        ...prev,
        [providerId]: {
          status: 'error',
          hint: '',
          error: 'Error de conexión al verificar la key.',
          lastVerified: '',
        },
      }))
    }
  }

  async function handleRemove(providerId: string) {
    // Optimistically update UI
    setKeys((prev) => ({
      ...prev,
      [providerId]: { status: 'empty', hint: '', error: '', lastVerified: '' },
    }))
    setInputValues((prev) => ({ ...prev, [providerId]: '' }))

    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })

      if (!res.ok) {
        // Revert on failure - reload from server
        await loadKeys()
      }
    } catch {
      // Revert on network failure - reload from server
      await loadKeys()
    }
  }

  const connectedCount = Object.values(keys).filter((k) => k.status === 'connected').length

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-brand" />
          <h2 className="text-xl font-bold">API Keys</h2>
        </div>
        <Badge
          variant={connectedCount > 0 ? 'default' : 'secondary'}
          className={connectedCount > 0 ? 'bg-active/20 text-active border-active/30' : ''}
        >
          {connectedCount}/{PROVIDERS.length} conectados
        </Badge>
      </motion.div>

      <p className="text-sm text-muted-foreground">
        Conecta tus APIs para usar los agentes. Tus keys se encriptan y solo se usan server-side al ejecutar agentes.
      </p>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        {PROVIDERS.map((provider) => {
          const state = keys[provider.id]
          const inputVal = inputValues[provider.id] || ''

          return (
            <motion.div key={provider.id} variants={item}>
              <Card className={
                state.status === 'connected'
                  ? 'border-active/30 bg-active/5'
                  : state.status === 'error'
                    ? 'border-danger/30 bg-danger/5'
                    : ''
              }>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-sm">{provider.name}</h3>
                          <p className="text-xs text-muted-foreground">{provider.description}</p>
                        </div>
                        <StatusBadge status={state.status} />
                      </div>

                      {state.status === 'connected' ? (
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>Key: <code className="text-foreground">{state.hint}</code></p>
                            <p>Verificada: {state.lastVerified}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(provider.id)}
                            className="text-danger hover:text-danger hover:bg-danger/10 h-8"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remover
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={showKey[provider.id] ? 'text' : 'password'}
                                placeholder={provider.placeholder}
                                value={inputVal}
                                onChange={(e) =>
                                  setInputValues((prev) => ({ ...prev, [provider.id]: e.target.value }))
                                }
                                className="pr-9 h-9 text-sm font-mono"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowKey((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                                }
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showKey[provider.id] ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <Button
                              onClick={() => handleVerify(provider.id)}
                              disabled={!inputVal.trim() || state.status === 'verifying'}
                              size="sm"
                              className="bg-brand hover:bg-brand-dark text-white h-9 px-4"
                            >
                              {state.status === 'verifying' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Verificar'
                              )}
                            </Button>
                          </div>

                          {state.error && (
                            <p className="text-xs text-danger flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {state.error}
                            </p>
                          )}

                          <a
                            href={provider.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-brand flex items-center gap-1 w-fit"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Obtener API key
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

function StatusBadge({ status }: { status: KeyStatus }) {
  switch (status) {
    case 'connected':
      return (
        <Badge className="bg-active/20 text-active border-active/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Conectado
        </Badge>
      )
    case 'verifying':
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificando
        </Badge>
      )
    case 'error':
      return (
        <Badge className="bg-danger/20 text-danger border-danger/30 gap-1">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Sin configurar
        </Badge>
      )
  }
}
