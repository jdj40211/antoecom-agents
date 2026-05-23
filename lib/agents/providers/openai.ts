import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import type { AIProvider, ProviderConfig } from './base'

export const openaiProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',

  async verifyKey(apiKey: string) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return { valid: res.ok, error: res.ok ? undefined : `${res.status} ${res.statusText}` }
    } catch {
      return { valid: false, error: 'Connection failed' }
    }
  },

  stream(config: ProviderConfig) {
    const openai = createOpenAI({ apiKey: config.apiKey })

    const result = streamText({
      model: openai(config.model),
      system: config.systemPrompt,
      prompt: config.userPrompt,
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    })

    return result.textStream as unknown as ReadableStream<Uint8Array>
  },

  listModels() {
    return [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ]
  },

  estimateCost(inputTokens: number, outputTokens: number, model: string) {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
      'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    }
    const p = pricing[model] || pricing['gpt-4o']
    return inputTokens * p.input + outputTokens * p.output
  },
}
