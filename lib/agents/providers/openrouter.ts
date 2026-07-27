import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { toByteStream, type AIProvider, type ProviderConfig } from './base'

export const openrouterProvider: AIProvider = {
  id: 'openrouter',
  name: 'OpenRouter',

  async verifyKey(apiKey: string) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return { valid: res.ok, error: res.ok ? undefined : `${res.status} ${res.statusText}` }
    } catch {
      return { valid: false, error: 'Connection failed' }
    }
  },

  stream(config: ProviderConfig) {
    const openrouter = createOpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    })

    const result = streamText({
      model: openrouter(config.model),
      system: config.systemPrompt,
      prompt: config.userPrompt,
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    })

    return toByteStream(result.textStream)
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
