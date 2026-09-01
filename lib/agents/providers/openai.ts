import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { toStreamResult, type AIProvider, type ProviderConfig } from './base'

export const openaiProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',

  async verifyKey(apiKey: string) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (res.ok) return { valid: true }

      // 401/403 = key mala. Cualquier otro código (429, 5xx, etc.) no dice
      // nada sobre la validez de la key: no la marcamos mal.
      if (res.status === 401 || res.status === 403) {
        return { valid: false, error: `OpenAI: ${res.status} ${res.statusText}` }
      }

      return { valid: true, error: `OpenAI respondió ${res.status}, la key parece válida` }
    } catch {
      return { valid: false, error: 'Connection failed' }
    }
  },

  stream(config: ProviderConfig) {
    const openai = createOpenAI({ apiKey: config.apiKey })
    const abortController = new AbortController()

    const result = streamText({
      model: openai(config.model),
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
      { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra' },
      { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna' },
    ]
  },

  estimateCost(inputTokens: number, outputTokens: number, model: string) {
    // Precios por millón de tokens, de la tabla oficial de OpenAI.
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-5.6-sol': { input: 4 / 1_000_000, output: 20 / 1_000_000 },
      'gpt-5.6-terra': { input: 2 / 1_000_000, output: 12 / 1_000_000 },
      'gpt-5.6-luna': { input: 0.2 / 1_000_000, output: 1.2 / 1_000_000 },
    }
    const p = pricing[model] || pricing['gpt-5.6-terra']
    return inputTokens * p.input + outputTokens * p.output
  },
}
