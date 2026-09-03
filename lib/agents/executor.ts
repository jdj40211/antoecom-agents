import type { AgentDef, TaskKind } from './catalog'
import type { AIProvider, ProviderConfig, StreamResult } from './providers/base'
import { anthropicProvider } from './providers/anthropic'
import { openaiProvider } from './providers/openai'
import { googleProvider } from './providers/google'
import { openrouterProvider } from './providers/openrouter'

import { resolveProvider, type ProviderName } from './resolve-provider'

// Se re-exportan para no tocar a quien ya los importaba desde acá.
export { resolveProvider }
export type { ProviderName }

type ModelTier = 'economy' | 'standard' | 'premium'

// `maxTokens` es un techo, no un consumo: el usuario paga lo que el modelo
// escribe, no lo que le dejamos escribir. Los valores viejos (2048 / 4096 /
// 6144) venían de modelos que ya no usamos y cortaban a mitad de frase a los
// agentes que piden varias variantes: 2048 tokens son unas 1500 palabras en
// español, y Caption Generator solo, con 5 captions de 300 palabras, ya las
// gastaba antes de los hashtags.
const MAX_TOKENS_BY_TIER: Record<ModelTier, number> = {
  economy: 4096,
  standard: 8192,
  premium: 16384,
}

// La temperatura depende de la tarea, no del tier. Antes iba atada al tier y
// Meta Doctor (standard) diagnosticaba a 0.6 mientras Hook Writer (economy)
// escribía a 0.7: el mismo dato podía dar dos veredictos distintos y las
// variantes creativas salían parecidas entre sí.
//
// Bajar la temperatura en tareas analíticas no las hace más precisas (el
// estudio jhu-llm-temperature no encontró diferencia significativa entre 0.0
// y 1.0 en precisión), las hace reproducibles: la misma campaña recibe el
// mismo diagnóstico. Subirla en tareas creativas sí cambia el resultado: a
// 0.6 las cinco variantes de un ad comparten estructura y adjetivos.
const TEMPERATURE_BY_TASK: Record<TaskKind, number> = {
  // Lee números y emite un veredicto. Mismo input, mismo veredicto.
  diagnostico: 0.3,
  // Liquid y JSON de settings: cualquier variación es un bug.
  codigo: 0.2,
  // Hipótesis con compromiso sobre datos que no tiene. Poca variación, sin rigidez.
  investigacion: 0.4,
  // Estructura fija con opciones: algo de variedad en las alternativas.
  planificacion: 0.5,
  // Se piden variantes distintas entre sí: hooks, copies, guiones, prompts de imagen.
  creativo: 0.8,
}

/**
 * Get the AIProvider instance for a given provider name.
 */
export function getProviderInstance(provider: ProviderName): AIProvider {
  const providers: Record<ProviderName, AIProvider> = {
    anthropic: anthropicProvider,
    openai: openaiProvider,
    google: googleProvider,
    openrouter: openrouterProvider,
  }
  return providers[provider]
}

export interface ExecuteAgentParams {
  agent: AgentDef
  input: Record<string, string>
  apiKey: string
  model?: string
  systemPrompt: string
  userPrompt: string
}

/**
 * Execute an agent by selecting the correct provider and streaming the response.
 */
export function executeAgent(params: ExecuteAgentParams): StreamResult {
  const model = params.model ?? params.agent.defaultModel
  const providerName = resolveProvider(model)
  const provider = getProviderInstance(providerName)

  const config: ProviderConfig = {
    apiKey: params.apiKey,
    model,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    maxTokens: MAX_TOKENS_BY_TIER[params.agent.modelTier],
    temperature: TEMPERATURE_BY_TASK[params.agent.taskKind],
  }

  return provider.stream(config)
}
