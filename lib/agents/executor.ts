import type { AgentDef } from './catalog'
import type { AIProvider, ProviderConfig } from './providers/base'
import { anthropicProvider } from './providers/anthropic'
import { openaiProvider } from './providers/openai'
import { googleProvider } from './providers/google'
import { openrouterProvider } from './providers/openrouter'

export type ProviderName = 'anthropic' | 'openai' | 'google' | 'openrouter'

/**
 * Determine which provider to use based on the model string prefix.
 */
export function resolveProvider(model: string): ProviderName {
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt')) return 'openai'
  if (model.startsWith('gemini')) return 'google'
  return 'openrouter'
}

/**
 * Get the AIProvider instance for a given provider name.
 */
function getProviderInstance(provider: ProviderName): AIProvider {
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
export function executeAgent(params: ExecuteAgentParams): ReadableStream<Uint8Array> {
  const model = params.model ?? params.agent.defaultModel
  const providerName = resolveProvider(model)
  const provider = getProviderInstance(providerName)

  const config: ProviderConfig = {
    apiKey: params.apiKey,
    model,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    maxTokens: 4096,
    temperature: 0.7,
  }

  return provider.stream(config)
}
