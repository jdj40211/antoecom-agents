import { create } from 'zustand'

interface AgentRun {
  output: string
  error: string
  running: boolean
  /** id de la fila en agent_runs, para poder guardar el output. */
  runId: string | null
}

const abortControllers = new Map<string, AbortController>()

interface AgentRunStore {
  runs: Record<string, AgentRun>
  startRun: (slug: string, body: Record<string, unknown>) => void
  stopRun: (slug: string) => void
}

export const useAgentRunStore = create<AgentRunStore>((set) => ({
  runs: {},

  startRun: (slug, body) => {
    const existing = abortControllers.get(slug)
    if (existing) existing.abort()

    const controller = new AbortController()
    abortControllers.set(slug, controller)

    set((state) => ({
      runs: {
        ...state.runs,
        [slug]: { output: '', error: '', running: true, runId: null },
      },
    }))

    void (async () => {
      try {
        const response = await fetch('/api/agents/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          const errorMessage =
            (errorData as Record<string, string> | null)?.error ??
            `Error ${response.status}: Algo salió mal`
          set((state) => ({
            runs: {
              ...state.runs,
              [slug]: { output: '', error: errorMessage, running: false, runId: null },
            },
          }))
          return
        }

        const runId = response.headers.get('X-Run-Id')

        const reader = response.body?.getReader()
        if (!reader) {
          set((state) => ({
            runs: {
              ...state.runs,
              [slug]: {
                output: '',
                error: 'No se recibió respuesta del servidor',
                running: false,
                runId: null,
              },
            },
          }))
          return
        }

        const decoder = new TextDecoder()
        let accumulated = ''

        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) {
            accumulated += decoder.decode(result.value, { stream: true })
            set((state) => ({
              runs: {
                ...state.runs,
                [slug]: { ...state.runs[slug], output: accumulated },
              },
            }))
          }
        }

        const remaining = decoder.decode()
        if (remaining) {
          accumulated += remaining
        }

        set((state) => ({
          runs: {
            ...state.runs,
            [slug]: { output: accumulated, error: '', running: false, runId },
          },
        }))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        const message =
          err instanceof Error ? err.message : 'Error de conexión'
        set((state) => ({
          runs: {
            ...state.runs,
            [slug]: {
              output: '',
              error: `No se pudo conectar: ${message}`,
              running: false,
              runId: null,
            },
          },
        }))
      } finally {
        abortControllers.delete(slug)
      }
    })()
  },

  stopRun: (slug) => {
    const controller = abortControllers.get(slug)
    if (controller) controller.abort()
    abortControllers.delete(slug)
    set((state) => ({
      runs: {
        ...state.runs,
        [slug]: { ...state.runs[slug], running: false },
      },
    }))
  },
}))
