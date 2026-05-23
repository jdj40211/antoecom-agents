export interface StreamChunk {
  text: string
  finishReason?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ProviderConfig {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  maxTokens: number
  temperature: number
}

export interface AIProvider {
  id: string
  name: string
  verifyKey(apiKey: string): Promise<{ valid: boolean; error?: string }>
  stream(config: ProviderConfig): ReadableStream<Uint8Array>
  listModels(): { id: string; name: string }[]
  estimateCost(inputTokens: number, outputTokens: number, model: string): number
}
