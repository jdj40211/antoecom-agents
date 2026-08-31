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

const TIER_CONFIGS: Record<ModelTier, TierConfig> = {
  economy: { maxTokens: 2048, temperature: 0.7 },
  standard: { maxTokens: 4096, temperature: 0.6 },
  premium: { maxTokens: 6144, temperature: 0.4 },
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
