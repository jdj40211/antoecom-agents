import type { AgentDef } from './catalog'
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

interface TierConfig {
  maxTokens: number
  temperature: number
}

// `maxTokens` es un techo, no un consumo: el usuario paga lo que el modelo
// escribe, no lo que le dejamos escribir. Los valores viejos (2048 / 4096 /
// 6144) venían de modelos que ya no usamos y cortaban a mitad de frase a los
// agentes que piden varias variantes: 2048 tokens son unas 1500 palabras en
// español, y Caption Generator solo, con 5 captions de 300 palabras, ya las
// gastaba antes de los hashtags.
const TIER_CONFIGS: Record<ModelTier, TierConfig> = {
  economy: { maxTokens: 4096, temperature: 0.7 },
  standard: { maxTokens: 8192, temperature: 0.6 },
  premium: { maxTokens: 16384, temperature: 0.4 },
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

  const tierConfig = TIER_CONFIGS[params.agent.modelTier]

  const config: ProviderConfig = {
    apiKey: params.apiKey,
    model,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    maxTokens: tierConfig.maxTokens,
    temperature: tierConfig.temperature,
  }

  return provider.stream(config)
}
