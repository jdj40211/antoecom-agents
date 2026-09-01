export interface ProviderConfig {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  maxTokens: number
  temperature: number
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface StreamResult {
  stream: ReadableStream<Uint8Array>
  /**
   * Resuelve cuando el stream termina. Da null si el provider no reportó uso
   * o si la generación falló antes de emitirlo.
   */
  usage: Promise<TokenUsage | null>
}

export interface AIProvider {
  id: string
  name: string
  verifyKey(apiKey: string): Promise<{ valid: boolean; error?: string }>
  stream(config: ProviderConfig): StreamResult
  listModels(): { id: string; name: string }[]
  estimateCost(inputTokens: number, outputTokens: number, model: string): number
}

/** Forma mínima del resultado de `streamText` del AI SDK que necesitamos. */
interface AiSdkStreamLike {
  textStream: AsyncIterable<string>
  // El AI SDK lo tipa como PromiseLike, no Promise.
  usage: PromiseLike<{
    inputTokens: number | undefined
    outputTokens: number | undefined
    totalTokens: number | undefined
  }>
}

/**
 * Convierte el resultado de `streamText` en bytes y expone el uso de tokens.
 *
 * El `textStream` del AI SDK emite strings, pero el body de una Response
 * necesita bytes. Sin esta conversión, devolver el stream directo a
 * `new Response()` falla en runtime.
 *
 * `abortController`, si se pasa, se aborta cuando alguien cancela el
 * `ReadableStream` devuelto (por ejemplo porque el cliente cerró la
 * conexión). Los providers crean el controller y le pasan `signal` a
 * `streamText`, así el abort corta la llamada real al proveedor en vez de
 * dejarla corriendo (y facturando) hasta el final aunque nadie la escuche.
 */
export function toStreamResult(
  result: AiSdkStreamLike,
  abortController?: AbortController
): StreamResult {
  const encoder = new TextEncoder()

  let resolveUsage: (usage: TokenUsage | null) => void = () => {}
  const usage = new Promise<TokenUsage | null>((resolve) => {
    resolveUsage = resolve
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      } finally {
        // El uso se resuelve siempre, incluso si el stream falló, para que
        // quien lo espere no quede colgado indefinidamente.
        try {
          const raw = await result.usage
          const inputTokens = raw.inputTokens ?? 0
          const outputTokens = raw.outputTokens ?? 0
          resolveUsage({
            inputTokens,
            outputTokens,
            totalTokens: raw.totalTokens ?? inputTokens + outputTokens,
          })
        } catch {
          resolveUsage(null)
        }
      }
    },
    cancel(reason) {
      abortController?.abort(reason)
    },
  })

  return { stream, usage }
}
