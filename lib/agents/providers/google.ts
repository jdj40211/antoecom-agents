import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'
import { toByteStream, type AIProvider, type ProviderConfig } from './base'

export const googleProvider: AIProvider = {
  id: 'google',
  name: 'Google AI',

  async verifyKey(apiKey: string) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      return { valid: res.ok, error: res.ok ? undefined : `${res.status} ${res.statusText}` }
    } catch {
      return { valid: false, error: 'Connection failed' }
    }
  },

  stream(config: ProviderConfig) {
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey })

    const result = streamText({
      model: google(config.model),
      system: config.systemPrompt,
      prompt: config.userPrompt,
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    })

    return toByteStream(result.textStream)
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
