'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

export interface UserKey {
  provider: string
  hint: string
  isValid: boolean
  lastVerified: string | null
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface UserKeysStore {
  keys: UserKey[]
  status: Status
  /** Carga una sola vez por sesión de navegación. */
  load: () => Promise<void>
  /** Vuelve a pedirlas, para después de agregar o borrar una key. */
  refresh: () => Promise<void>
}

async function fetchKeys(): Promise<UserKey[]> {
  const response = await fetch('/api/keys')
  if (!response.ok) throw new Error(`GET /api/keys devolvió ${response.status}`)

  const data = (await response.json()) as { keys?: UserKey[] }
  return data.keys ?? []
}

export const useUserKeysStore = create<UserKeysStore>((set, get) => ({
  keys: [],
  status: 'idle',

  load: async () => {
    if (get().status !== 'idle') return
    set({ status: 'loading' })

    try {
      set({ keys: await fetchKeys(), status: 'ready' })
    } catch (error) {
      console.warn('[user-keys]', error)
      set({ status: 'error' })
    }
  },

  refresh: async () => {
    try {
      set({ keys: await fetchKeys(), status: 'ready' })
    } catch (error) {
      console.warn('[user-keys]', error)
      set({ status: 'error' })
    }
  },
}))

export interface UserKeysView {
  keys: UserKey[]
  /** Ya sabemos qué keys tiene. Antes de esto no hay que afirmar que le falta ninguna. */
  ready: boolean
  hasAnyValidKey: boolean
  hasValidKey: (provider: string) => boolean
}

/**
 * Qué API keys tiene cargadas el usuario.
 *
 * Si la consulta falla, `ready` queda en false a propósito: preferimos dejarlo
 * ejecutar y que el error venga del servidor antes que bloquearle el botón por
 * una lista que no pudimos leer.
 */
export function useUserKeys(): UserKeysView {
  const keys = useUserKeysStore((state) => state.keys)
  const status = useUserKeysStore((state) => state.status)
  const load = useUserKeysStore((state) => state.load)

  useEffect(() => {
    void load()
  }, [load])

  return {
    keys,
    ready: status === 'ready',
    hasAnyValidKey: keys.some((key) => key.isValid),
    hasValidKey: (provider) => keys.some((key) => key.provider === provider && key.isValid),
  }
}
