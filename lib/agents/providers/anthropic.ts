import { createAnthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import type { AIProvider, ProviderConfig } from './base'

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
      return { valid: res.ok, error: res.ok ? undefined : `${res.status} ${res.statusText}` }
    } catch (err) {
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

    return result.textStream as unknown as ReadableStream<Uint8Array>
  },

  listModels() {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4' },
    ]
  },

  estimateCost(inputTokens: number, outputTokens: number, model: string) {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
      'claude-haiku-4-20250414': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
    }
    const p = pricing[model] || pricing['claude-sonnet-4-20250514']
    return inputTokens * p.input + outputTokens * p.output
  },
}
