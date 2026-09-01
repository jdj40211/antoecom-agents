import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { toStreamResult, type AIProvider, type ProviderConfig } from './base'

export const openrouterProvider: AIProvider = {
  id: 'openrouter',
  name: 'OpenRouter',

  async verifyKey(apiKey: string) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (res.ok) return { valid: true }

      // 401/403 = key mala. Cualquier otro código (429, 5xx, etc.) no dice
      // nada sobre la validez de la key: no la marcamos mal.
      if (res.status === 401 || res.status === 403) {
        return { valid: false, error: `OpenRouter: ${res.status} ${res.statusText}` }
      }

      return { valid: true, error: `OpenRouter respondió ${res.status}, la key parece válida` }
    } catch {
      return { valid: false, error: 'Connection failed' }
    }
  },

  stream(config: ProviderConfig) {
    const openrouter = createOpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    })
    const abortController = new AbortController()

    const result = streamText({
      model: openrouter(config.model),
      system: config.systemPrompt,
      prompt: config.userPrompt,
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
      abortSignal: abortController.signal,
    })

    return toStreamResult(result, abortController)
  },

  listModels() {
    return [
      { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 405B' },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
    ]
  },

  estimateCost(inputTokens: number, outputTokens: number) {
    return (inputTokens * 0.5 + outputTokens * 1.5) / 1_000_000
  },
}
