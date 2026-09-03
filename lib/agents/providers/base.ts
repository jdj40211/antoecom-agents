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
  finishReason: PromiseLike<string>
}

/**
 * Nota que se agrega al final cuando el modelo se quedó sin tokens.
 *
 * Nadie leía `finishReason`, así que una respuesta cortada a mitad de frase
 * llegaba a la pantalla igual que una completa: el usuario se llevaba tres de
 * las cinco variantes que pidió sin enterarse de que faltaban dos.
 */
const TRUNCATED_NOTICE =
  '\n\n---\n\n**La respuesta se cortó**: el modelo llegó al límite de longitud. ' +
  'Pedí menos variantes, acortá el texto que pegaste, o volvé a ejecutarlo por partes.'

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

        // Va dentro del try y antes del close: si el modelo se quedó sin
        // tokens, el aviso viaja por el mismo stream que el texto y aparece
        // pegado al final, sin tocar la UI.
        try {
          if ((await result.finishReason) === 'length') {
            controller.enqueue(encoder.encode(TRUNCATED_NOTICE))
          }
        } catch {
          // Si el provider no lo reporta, no avisamos. No es motivo de error.
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
