import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { toStreamResult, type AIProvider, type ProviderConfig } from './base'

export const googleProvider: AIProvider = {
  id: 'google',
  name: 'Google AI',

  async verifyKey(apiKey: string) {
    try {
      // La key va por header, no por query string: en la URL queda expuesta
      // en logs de acceso y proxies intermedios.
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': apiKey },
      })

      if (res.ok) return { valid: true }

      // 401/403 = key mala. Cualquier otro código (429, 5xx, etc.) no dice
      // nada sobre la validez de la key: no la marcamos mal.
      if (res.status === 401 || res.status === 403) {
        return { valid: false, error: `Google AI: ${res.status} ${res.statusText}` }
      }

      return { valid: true, error: `Google AI respondió ${res.status}, la key parece válida` }
    } catch {
      return { valid: false, error: 'Connection failed' }
    }
  },

  stream(config: ProviderConfig) {
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey })
    const abortController = new AbortController()

    const result = streamText({
      model: google(config.model),
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
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ]
  },

  estimateCost(inputTokens: number, outputTokens: number, model: string) {
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-2.5-pro': { input: 1.25 / 1_000_000, output: 10 / 1_000_000 },
      'gemini-2.5-flash': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    }
    const p = pricing[model] || pricing['gemini-2.5-pro']
    return inputTokens * p.input + outputTokens * p.output
  },
}
