import { NextRequest } from 'next/server'
import { APICallError, LoadAPIKeyError } from 'ai'
import { getAgent } from '@/lib/agents/catalog'
import { executeAgent, resolveProvider, getProviderInstance } from '@/lib/agents/executor'
import { buildPrompts } from '@/lib/agents/prompt-builder'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getDevKey } from '@/lib/store/dev-keys'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'
import {
  checkHourlyRateLimit,
  rateLimitMessage,
  recordAgentUsage,
  reserveAgentRun,
  settleAgentRun,
  type ReservationResult,
} from '@/lib/agents/rate-limiter'
import type { TokenUsage } from '@/lib/agents/providers/base'

export const maxDuration = 300

/**
 * Tope por campo del formulario. `buildPrompts` manda el input entero al
 * proveedor, así que sin tope un solo campo de 5 MB se paga completo.
 */
const MAX_INPUT_FIELD_LENGTH = 20_000

/** Programa que habilita los agentes marcados `isPremium` en el catálogo. */
const PREMIUM_PROGRAM = 'elite'

const PROGRAM_LABELS: Record<string, string> = {
  trial: 'Trial',
  club: 'Club',
  elite: 'Elite',
}

interface RunRequestBody {
  agentSlug: string
  input: Record<string, string>
  modelOverride?: string
}

type ParsedBody =
  | { ok: true; value: RunRequestBody }
  | { ok: false; error: string }

/**
 * Valida la forma del body antes de tocar nada.
 *
 * Antes se hacía `as RunRequestBody` y se confiaba. Un `input: { niche: 42 }`
 * llegaba hasta `buildPrompts`, que hace `value.trim()`, y el usuario terminaba
 * viendo "value.trim is not a function" en su historial. Los errores de forma se
 * contestan acá, en español y con el nombre del campo.
 */
function parseRunBody(raw: unknown): ParsedBody {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'El cuerpo del pedido tiene que ser un objeto JSON.' }
  }

  const body = raw as Record<string, unknown>

  if (typeof body.agentSlug !== 'string' || body.agentSlug.trim() === '') {
    return { ok: false, error: 'Falta el campo agentSlug, o no es texto.' }
  }

  const rawInput = body.input
  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) {
    return {
      ok: false,
      error: 'El campo input tiene que ser un objeto con los datos del formulario.',
    }
  }

  const input: Record<string, string> = {}

  for (const [key, value] of Object.entries(rawInput as Record<string, unknown>)) {
    if (value === undefined || value === null) continue

    if (typeof value !== 'string') {
      return { ok: false, error: `El campo "${key}" tiene que ser texto.` }
    }

    if (value.length > MAX_INPUT_FIELD_LENGTH) {
      return {
        ok: false,
        error: `El campo "${key}" supera los ${MAX_INPUT_FIELD_LENGTH} caracteres. Acortalo y probá de nuevo.`,
      }
    }

    input[key] = value
  }

  if (Object.keys(input).length === 0) {
    return { ok: false, error: 'Completá al menos un campo del formulario.' }
  }

  const rawModel = body.modelOverride
  if (rawModel !== undefined && rawModel !== null && typeof rawModel !== 'string') {
    return { ok: false, error: 'El campo modelOverride tiene que ser texto.' }
  }

  return {
    ok: true,
    value: {
      agentSlug: body.agentSlug,
      input,
      modelOverride: typeof rawModel === 'string' ? rawModel : undefined,
    },
  }
}

/**
 * Si el corte lo pidió el cliente, no el proveedor.
 *
 * Importa distinguirlo por dos motivos: una cancelación no puede invalidar la
 * API key del usuario, y tampoco es un error que valga la pena mostrar como tal.
 */
function isClientCancellation(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true

  if (error instanceof DOMException && error.name === 'AbortError') return true

  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'ResponseAborted')
  )
}

/**
 * Si el proveedor rechazó la credencial.
 *
 * Antes esto se decidía con `errorMessage.includes('401')`, que marca como
 * inválida cualquier key cuyo error mencione esos dígitos en cualquier posición:
 * un request id, un "maximum context length is 8401 tokens", un trace. El AI SDK
 * ya expone el status HTTP real en `APICallError`, así que se usa eso.
 */
function isProviderAuthRejection(error: unknown): boolean {
  if (LoadAPIKeyError.isInstance(error)) return true

  if (APICallError.isInstance(error)) {
    return error.statusCode === 401 || error.statusCode === 403
  }

  return false
}

/** Texto en español para el usuario, a partir del tipo real del error. */
function streamErrorMessage(error: unknown): string {
  if (LoadAPIKeyError.isInstance(error)) {
    return 'Tu API key no se pudo usar. Volvé a configurarla en Configuración > API Keys.'
  }

  if (APICallError.isInstance(error)) {
    const status = error.statusCode ?? 0

    if (status === 401 || status === 403) {
      return 'El proveedor rechazó tu API key. Verificala en Configuración > API Keys.'
    }
    if (status === 429) {
      return 'El proveedor está limitando tu API key por exceso de pedidos. Probá de nuevo en unos minutos.'
    }
    if (status >= 500) {
      return 'El proveedor tuvo un error temporal. Probá de nuevo en unos minutos.'
    }
    if (status === 404) {
      return 'El proveedor no reconoce ese modelo. Elegí otro modelo y probá de nuevo.'
    }
  }

  return 'La ejecución se cortó antes de terminar. Probá de nuevo.'
}

/**
 * Espera el uso de tokens, pero no para siempre.
 *
 * Cuando el cliente corta, el stream del proveedor puede quedar drenando un
 * rato. Sin este tope, cerrar la reserva quedaría esperando la generación
 * completa que ya nadie está leyendo.
 */
async function usageWithin(
  promise: Promise<TokenUsage | null>,
  ms: number
): Promise<TokenUsage | null> {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return Response.json(
        { error: 'No pudimos leer el pedido: el cuerpo no es JSON válido.' },
        { status: 400 }
      )
    }

    const parsed = parseRunBody(rawBody)
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 })
    }

    const { agentSlug, input, modelOverride } = parsed.value

    const agent = getAgent(agentSlug)
    if (!agent) {
      return Response.json({ error: 'Agente no encontrado' }, { status: 404 })
    }

    // El catálogo define qué modelos puede usar cada agente y hasta ahora solo lo
    // respetaba la UI. Sin esta validación, un POST directo con
    // `modelOverride: 'openai/o1-pro'` caía en el proveedor por defecto de
    // `resolveProvider` (openrouter) contra un modelo arbitrario, con un
    // tarifario estimado que no tiene nada que ver con lo que cobran.
    if (modelOverride !== undefined && !agent.allowedModels.includes(modelOverride)) {
      return Response.json(
        {
          error: `El modelo "${modelOverride}" no está habilitado para "${agent.name}". Los modelos disponibles son: ${agent.allowedModels.join(', ')}.`,
        },
        { status: 400 }
      )
    }

    const model = modelOverride ?? agent.defaultModel
    const providerName = resolveProvider(model)

    const supabase = isSupabaseConfigured()
      ? await (await import('@/lib/supabase/server')).createClient()
      : null

    // ---- Programa del usuario ----
    //
    // Sin Supabase no hay perfil que consultar y `getUser()` solo devuelve el
    // usuario de dev fuera de producción, así que en local se trabaja con todos
    // los agentes desbloqueados.
    let program = PREMIUM_PROGRAM

    if (supabase) {
      const { data: profile, error: profileError } = await supabase
        .from('community_profiles')
        .select('program')
        .eq('id', user.id)
        .maybeSingle()

      // Antes el error se descartaba con destructuring y se caía a 'trial'. Un
      // timeout de Supabase dejaba a un Elite evaluado con límites de Trial y le
      // contestaba que llegó al límite de un plan que no es el suyo. No tener
      // fila (usuario nuevo) y no poder leerla son cosas distintas: la primera
      // es 'trial', la segunda es un error nuestro y se dice como tal.
      if (profileError) {
        console.error('[run] community_profiles query error:', profileError.message)
        return Response.json(
          {
            error:
              'No pudimos verificar tu plan en este momento. Probá de nuevo en unos segundos.',
          },
          { status: 503 }
        )
      }

      program = (profile?.program as string | null) ?? 'trial'
    }

    // ---- Gate de agentes Elite ----
    //
    // `isPremium` solo pintaba un badge: cualquier usuario que apretara Ejecutar
    // corría el agente igual. El badge es la señal visual, esto es el candado.
    if (agent.isPremium && program !== PREMIUM_PROGRAM) {
      return Response.json(
        {
          error: `"${agent.name}" es un agente Elite y tu cuenta está en el plan ${PROGRAM_LABELS[program] ?? program}. Pasate a Elite desde la comunidad de AntoEcom para desbloquearlo.`,
          requiresProgram: PREMIUM_PROGRAM,
        },
        { status: 403 }
      )
    }

    // ---- Límite de ritmo por hora ----
    //
    // El diario se resuelve más abajo, con la reserva atómica, para no gastarlo
    // si el usuario ni siquiera tiene la API key configurada.
    if (supabase) {
      const hourly = await checkHourlyRateLimit(user.id, program)

      if (!hourly.allowed) {
        return Response.json(
          {
            error: rateLimitMessage(hourly.reason, hourly.limit),
            rateLimited: true,
          },
          { status: 429 }
        )
      }
    }

    // ---- API key del usuario ----
    let apiKey: string | null = null

    if (supabase) {
      const { decryptApiKey } = await import('@/lib/crypto/key-manager')

      const { data: keyRow, error: keyError } = await supabase
        .from('user_api_keys')
        .select('encrypted_key, is_valid')
        .eq('user_id', user.id)
        .eq('provider', providerName)
        .maybeSingle()

      if (keyError) {
        console.error('[run] Error fetching API key:', keyError.message)
        return Response.json(
          { error: 'Error al buscar tu API key. Intentá de nuevo.' },
          { status: 500 }
        )
      }

      if (!keyRow) {
        return Response.json(
          {
            error: `No tenés una API key configurada para ${providerName}. Andá a Configuración > API Keys para agregarla.`,
            provider: providerName,
          },
          { status: 400 }
        )
      }

      if (!keyRow.is_valid) {
        return Response.json(
          {
            error: `Tu API key de ${providerName} está marcada como inválida. Verificala en Configuración > API Keys.`,
            provider: providerName,
          },
          { status: 400 }
        )
      }

      try {
        apiKey = decryptApiKey(keyRow.encrypted_key as string)
      } catch (decryptError) {
        console.error('[run] Decryption error:', decryptError)
        return Response.json(
          { error: 'Error al descifrar tu API key. Volvé a configurarla.' },
          { status: 500 }
        )
      }
    } else {
      const devKey = getDevKey(providerName)

      if (!devKey) {
        return Response.json(
          {
            error: `No tenés una API key configurada para ${providerName}. Andá a Configuración > API Keys para agregarla.`,
            provider: providerName,
          },
          { status: 400 }
        )
      }

      if (!devKey.isValid) {
        return Response.json(
          {
            error: `Tu API key de ${providerName} está marcada como inválida. Verificala en Configuración > API Keys.`,
            provider: providerName,
          },
          { status: 400 }
        )
      }

      apiKey = devKey.encryptedKey
    }

    const { systemPrompt, userPrompt } = buildPrompts(agent, input)

    // ---- Reservar la ejecución ANTES de streamear ----
    //
    // El orden es lo que arregla el agujero. Contabilizar al final significaba
    // que cerrar la pestaña apenas llegaba el primer token dejaba el contador en
    // cero, repetible sin tope; y entre el chequeo y la escritura pasaba una
    // generación entera, así que varias pestañas simultáneas leían el mismo
    // número y pasaban todas. `reserveAgentRun` decide y cuenta de una, y al
    // final `settleAgentRun` suma los tokens reales o devuelve la reserva si no
    // se generó ni un token.
    let reservation: ReservationResult | null = null

    if (supabase) {
      reservation = await reserveAgentRun(user.id, program, providerName)

      if (!reservation.allowed) {
        return Response.json(
          {
            error: rateLimitMessage(reservation.reason, reservation.limit),
            rateLimited: true,
          },
          { status: 429 }
        )
      }
    }

    /**
     * Cierra la contabilidad de la ejecución.
     *
     * `producedOutput` decide si la reserva se devuelve. Cero tokens y cero
     * salida significa que el proveedor rechazó la llamada antes de generar
     * nada: no hubo gasto y sería injusto cobrarle la ejecución. En cambio, si
     * alcanzó a generar algo (aunque se haya cancelado a los tres segundos) la
     * reserva se queda contada, que es justamente lo que impide volver a
     * regalar ejecuciones cancelando.
     *
     * Corre una sola vez por pedido. Cuando el cliente corta, la lectura termina
     * normalmente y recién falla el `controller.close()` sobre un stream ya
     * cerrado, así que el camino feliz y el `catch` se ejecutan los dos: sin este
     * candado, los tokens de esa ejecución se sumarían dos veces.
     */
    let accounted = false

    async function finishAccounting(
      usage: TokenUsage | null,
      cost: number,
      producedOutput: boolean
    ): Promise<void> {
      if (!supabase || accounted) return
      accounted = true

      if (reservation?.reserved) {
        if (usage) {
          await settleAgentRun(providerName, usage.inputTokens, usage.outputTokens, cost)
        } else if (!producedOutput) {
          await settleAgentRun(providerName, 0, 0, 0)
        }
        // Salida sin uso reportado: la reserva queda contada y los tokens sin
        // acumular. Se prefiere perder el detalle antes que regalar la corrida.
        return
      }

      // Camino heredado (la migración de la reserva todavía no corrió): acá sí
      // hay que sumar la ejecución además de los tokens.
      if (usage || producedOutput) {
        await recordAgentUsage(
          providerName,
          usage?.inputTokens ?? 0,
          usage?.outputTokens ?? 0,
          cost
        )
      }
    }

    // ---- Registrar la ejecución ----
    let runId: string | undefined

    if (supabase) {
      const { data: runRow, error: runInsertError } = await supabase
        .from('agent_runs')
        .insert({
          user_id: user.id,
          agent_slug: agent.slug,
          status: 'running',
          input,
          model_used: model,
          provider_used: providerName,
        })
        .select('id')
        .single()

      if (runInsertError) {
        console.warn('[run] Failed to insert agent_runs:', runInsertError.message)
      } else {
        runId = runRow.id as string
      }
    }

    let sourceStream: ReadableStream<Uint8Array>
    let usagePromise: Promise<TokenUsage | null>

    try {
      const result = executeAgent({
        agent,
        input,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
      })
      sourceStream = result.stream
      usagePromise = result.usage
    } catch (execError) {
      console.error('[run] Execution error:', execError)

      // No arrancó nada: la reserva se devuelve.
      await finishAccounting(null, 0, false)

      if (runId && supabase) {
        await supabase
          .from('agent_runs')
          .update({
            status: 'error',
            error_message: 'No se pudo iniciar la ejecución del agente.',
            completed_at: new Date().toISOString(),
          })
          .eq('id', runId)
      }

      return Response.json(
        { error: 'No pudimos iniciar la ejecución del agente. Probá de nuevo.' },
        { status: 500 }
      )
    }

    const decoder = new TextDecoder()
    let fullOutput = ''
    const reader = sourceStream.getReader()

    const trackedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let done = false
          while (!done) {
            const result = await reader.read()
            done = result.done
            if (result.value) {
              fullOutput += decoder.decode(result.value, { stream: true })
              controller.enqueue(result.value)
            }
          }

          fullOutput += decoder.decode()

          // Cuando el cliente se va, la lectura termina en `done` igual que un
          // final normal: el corte lo delata la señal del request, no el loop.
          // Sin esta distinción, una ejecución abandonada a la mitad quedaba en
          // el historial como 'success' con la salida truncada.
          const cancelled = request.signal.aborted
          const responseTimeMs = Date.now() - startTime

          const usage = cancelled
            ? await usageWithin(usagePromise, 5_000)
            : await usagePromise

          const cost = usage
            ? getProviderInstance(providerName).estimateCost(
                usage.inputTokens,
                usage.outputTokens,
                model
              )
            : 0

          if (supabase && runId) {
            await supabase
              .from('agent_runs')
              .update({
                status: cancelled ? 'cancelled' : 'success',
                output: fullOutput,
                error_message: cancelled ? 'Cancelaste la ejecución.' : null,
                response_time_ms: responseTimeMs,
                completed_at: new Date().toISOString(),
                tokens_input: usage?.inputTokens ?? null,
                tokens_output: usage?.outputTokens ?? null,
                tokens_total: usage?.totalTokens ?? null,
                cost_estimate_usd: usage ? cost : null,
              })
              .eq('id', runId)
          }

          await finishAccounting(usage, cost, fullOutput.length > 0)

          try {
            controller.close()
          } catch {
            // El cliente ya cerró la conexión. No es un error de la ejecución y
            // no puede caer al `catch` de abajo: ahí volvería a contabilizar.
          }
        } catch (streamError) {
          const cancelled = isClientCancellation(streamError, request.signal)

          // El detalle crudo queda en el log del servidor, nunca en la respuesta
          // ni en el historial del usuario.
          console.error('[run] Stream error:', { cancelled, error: streamError })

          const usage = await usageWithin(usagePromise, 5_000)

          const cost = usage
            ? getProviderInstance(providerName).estimateCost(
                usage.inputTokens,
                usage.outputTokens,
                model
              )
            : 0

          await finishAccounting(usage, cost, fullOutput.length > 0)

          if (supabase) {
            // Una cancelación del cliente no dice nada sobre la key: solo un
            // rechazo explícito del proveedor la invalida.
            if (!cancelled && isProviderAuthRejection(streamError)) {
              await supabase
                .from('user_api_keys')
                .update({
                  is_valid: false,
                  verification_error:
                    'El proveedor rechazó esta key durante una ejecución.',
                })
                .eq('user_id', user.id)
                .eq('provider', providerName)
            }

            if (runId) {
              await supabase
                .from('agent_runs')
                .update({
                  status: cancelled ? 'cancelled' : 'error',
                  error_message: cancelled
                    ? 'Cancelaste la ejecución.'
                    : streamErrorMessage(streamError),
                  response_time_ms: Date.now() - startTime,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', runId)
            }
          }

          controller.error(streamError)
        }
      },

      // El cliente se fue: se corta la lectura para que el provider aborte su
      // llamada en vez de seguir generando (y facturando) contra la key.
      cancel(reason) {
        void reader.cancel(reason)
      },
    })

    return new Response(trackedStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Agent-Slug': agent.slug,
        'X-Model-Used': model,
        'X-Provider': providerName,
        'X-Model-Tier': agent.modelTier,
        ...(runId ? { 'X-Run-Id': runId } : {}),
      },
    })
  } catch (error) {
    console.error('[run] Unhandled error:', error)
    return Response.json(
      { error: 'Error interno del servidor. Probá de nuevo en unos segundos.' },
      { status: 500 }
    )
  }
}
