import { createAnthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { toByteStream, type AIProvider, type ProviderConfig } from './base'

/** Modelo barato usado solo para validar que la key funciona. */
const VERIFY_MODEL = 'claude-haiku-4-5'

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  name: 'Anthropic',

  async verifyKey(apiKey: string) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: VERIFY_MODEL,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })

      if (res.ok) return { valid: true }

      // 401/403 = key mala. Cualquier otro código (404 por modelo retirado,
      // 429, 5xx) no dice nada sobre la validez de la key: no la marcamos mal.
      if (res.status === 401 || res.status === 403) {
        return { valid: false, error: `Anthropic: ${res.status} ${res.statusText}` }
      }

      return { valid: true, error: `Anthropic respondió ${res.status}, la key parece válida` }
    } catch {
      return { valid: false, error: 'Connection failed' }
    }
  },

  stream(config: ProviderConfig) {
    const anthropic = createAnthropic({ apiKey: config.apiKey })

    const result = streamText({
      model: anthropic(config.model),
      system: config.systemPrompt,
      prompt: config.userPrompt,
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    })

    return toByteStream(result.textStream)
  },

  listModels() {
    return [
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
      { id: 'claude-opus-5', name: 'Claude Opus 5' },
    ]
  },

  estimateCost(inputTokens: number, outputTokens: number, model: string) {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-sonnet-5': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
      'claude-haiku-4-5': { input: 1 / 1_000_000, output: 5 / 1_000_000 },
      'claude-opus-5': { input: 5 / 1_000_000, output: 25 / 1_000_000 },
    }
    const p = pricing[model] || pricing['claude-sonnet-5']
    return inputTokens * p.input + outputTokens * p.output
  },
}
