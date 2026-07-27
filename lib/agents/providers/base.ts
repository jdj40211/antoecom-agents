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

/**
 * El `textStream` del AI SDK emite strings, pero el body de una Response
 * necesita bytes. Sin esta conversión, devolver el stream directo a
 * `new Response()` falla en runtime.
 */
export function toByteStream(
  textStream: AsyncIterable<string>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of textStream) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}
