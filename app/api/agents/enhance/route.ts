import { NextRequest } from 'next/server'
import { getAgent, type AgentDef } from '@/lib/agents/catalog'
import { getProviderInstance } from '@/lib/agents/executor'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getDevKey } from '@/lib/store/dev-keys'
import { ENHANCE_PROMPT_CRITERIA } from '@/lib/agents/knowledge/ecommerce-ux'
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

/** Proveedores que saben mejorar un campo, con su modelo barato. */
const ECONOMY_MODELS = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-5.6-luna',
  google: 'gemini-2.5-flash',
} as const

type EnhanceProvider = keyof typeof ECONOMY_MODELS

const PROVIDER_FALLBACK_ORDER: EnhanceProvider[] = ['anthropic', 'openai', 'google']

/** Tope por campo, igual que en `/api/agents/run`. */
const MAX_FIELD_LENGTH = 20_000

interface EnhanceRequestBody {
  agentSlug: string
  fieldKey: string
  fieldTitle: string
  currentValue: string
  context: Record<string, string>
}

type ParsedBody =
  | { ok: true; value: EnhanceRequestBody }
  | { ok: false; error: string }

function readString(
  body: Record<string, unknown>,
  key: string
): { ok: true; value: string } | { ok: false; error: string } {
  const value = body[key]

  if (value === undefined || value === null) return { ok: true, value: '' }

  if (typeof value !== 'string') {
    return { ok: false, error: `El campo "${key}" tiene que ser texto.` }
  }

  if (value.length > MAX_FIELD_LENGTH) {
    return {
      ok: false,
      error: `El campo "${key}" supera los ${MAX_FIELD_LENGTH} caracteres. Acortalo y probá de nuevo.`,
    }
  }

  return { ok: true, value }
}

/**
 * Valida la forma del body.
 *
 * Sin esto, un `context: { niche: 42 }` llegaba hasta el `v.trim()` que arma el
 * contexto y el usuario recibía el mensaje interno de JavaScript, en inglés.
 */
function parseEnhanceBody(raw: unknown): ParsedBody {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'El cuerpo del pedido tiene que ser un objeto JSON.' }
  }

  const body = raw as Record<string, unknown>

  if (typeof body.agentSlug !== 'string' || body.agentSlug.trim() === '') {
    return { ok: false, error: 'Falta el campo agentSlug, o no es texto.' }
  }

  const fieldKey = readString(body, 'fieldKey')
  if (!fieldKey.ok) return fieldKey

  const fieldTitle = readString(body, 'fieldTitle')
  if (!fieldTitle.ok) return fieldTitle

  const currentValue = readString(body, 'currentValue')
  if (!currentValue.ok) return currentValue

  if (currentValue.value.trim() === '') {
    return { ok: false, error: 'Escribí algo en el campo antes de pedir que lo mejore.' }
  }

  const rawContext = body.context
  const context: Record<string, string> = {}

  if (rawContext !== undefined && rawContext !== null) {
    if (typeof rawContext !== 'object' || Array.isArray(rawContext)) {
      return {
        ok: false,
        error: 'El campo context tiene que ser un objeto con los datos del formulario.',
      }
    }

    for (const [key, value] of Object.entries(rawContext as Record<string, unknown>)) {
      if (value === undefined || value === null) continue

      if (typeof value !== 'string') {
        return { ok: false, error: `El campo "${key}" tiene que ser texto.` }
      }

      if (value.length > MAX_FIELD_LENGTH) {
        return {
          ok: false,
          error: `El campo "${key}" supera los ${MAX_FIELD_LENGTH} caracteres. Acortalo y probá de nuevo.`,
        }
      }

      context[key] = value
    }
  }

  return {
    ok: true,
    value: {
      agentSlug: body.agentSlug,
      fieldKey: fieldKey.value,
      fieldTitle: fieldTitle.value,
      currentValue: currentValue.value,
      context,
    },
  }
}

/**
 * Espera el uso de tokens, pero no para siempre: si el cliente corta, el stream
 * del proveedor puede quedar drenando y cerrar la reserva no puede depender de
 * que termine una generación que ya nadie está leyendo.
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

function isEnhanceProvider(value: string): value is EnhanceProvider {
  return value === 'anthropic' || value === 'openai' || value === 'google'
}

/**
 * Orden en el que se buscan las keys del usuario.
 *
 * Antes era una lista fija que ignoraba al agente. Ahora se prueban primero los
 * proveedores que el agente declara en `requiredProviders`, así el texto se
 * mejora con el mismo proveedor con el que después se va a ejecutar.
 */
function candidateProviders(agent: AgentDef): EnhanceProvider[] {
  const preferred = agent.requiredProviders.filter(isEnhanceProvider)
  const rest = PROVIDER_FALLBACK_ORDER.filter((provider) => !preferred.includes(provider))
  return [...preferred, ...rest]
}

export async function POST(request: NextRequest) {
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

    const parsed = parseEnhanceBody(rawBody)
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 })
    }

    const { agentSlug, fieldKey, fieldTitle, currentValue, context } = parsed.value

    const agent = getAgent(agentSlug)
    if (!agent) {
      return Response.json({ error: 'Agente no encontrado' }, { status: 404 })
    }

    const supabase = isSupabaseConfigured()
      ? await (await import('@/lib/supabase/server')).createClient()
      : null

    // Acá vivía el mismo gate de agentes Elite que en `/api/agents/run`. Se fue
    // con los programas: mejorar un campo está disponible para todos.

    // ---- Límite de ritmo ----
    //
    // Este endpoint no tenía ningún límite ni contabilizaba nada, y el botón
    // "Mejorar con IA" está en cada campo de cada formulario: era generación
    // ilimitada para alguien que ya se quedó sin ejecuciones del día. Consume la
    // misma cuota que un run porque es la misma llamada al mismo proveedor con
    // la misma key.
    if (supabase) {
      const hourly = await checkHourlyRateLimit(user.id)

      if (!hourly.allowed) {
        return Response.json(
          { error: rateLimitMessage(hourly.reason, hourly.limit), rateLimited: true },
          { status: 429 }
        )
      }
    }

    // ---- Key del usuario ----
    let apiKey: string | null = null
    let providerName: EnhanceProvider | null = null

    for (const provider of candidateProviders(agent)) {
      if (supabase) {
        const { decryptApiKey } = await import('@/lib/crypto/key-manager')

        const { data: keyRow, error: keyError } = await supabase
          .from('user_api_keys')
          .select('encrypted_key, is_valid')
          .eq('user_id', user.id)
          .eq('provider', provider)
          .eq('is_valid', true)
          .maybeSingle()

        if (keyError) {
          console.error('[enhance] Error fetching API key:', keyError.message)
          return Response.json(
            { error: 'Error al buscar tu API key. Intentá de nuevo.' },
            { status: 500 }
          )
        }

        if (keyRow) {
          try {
            apiKey = decryptApiKey(keyRow.encrypted_key as string)
            providerName = provider
            break
          } catch (decryptError) {
            console.error('[enhance] Decryption error:', decryptError)
          }
        }
      } else {
        const devKey = getDevKey(provider)
        if (devKey?.isValid) {
          apiKey = devKey.encryptedKey
          providerName = provider
          break
        }
      }
    }

    if (!apiKey || !providerName) {
      return Response.json(
        { error: 'No tenés API keys configuradas. Andá a Configuración > API Keys.' },
        { status: 400 }
      )
    }

    const provider = providerName
    const model = ECONOMY_MODELS[provider]

    // ---- Reservar antes de generar ----
    let reservation: ReservationResult | null = null

    if (supabase) {
      reservation = await reserveAgentRun(user.id, provider)

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

    const contextLines = Object.entries(context)
      .filter(([key, value]) => key !== fieldKey && value.trim().length > 0)
      .map(([key, value]) => {
        const fieldDef = agent.inputSchema[key]
        return `- ${fieldDef?.title ?? key}: ${value}`
      })

    const userPrompt = `AGENTE: ${agent.name} — ${agent.description}

CAMPO A MEJORAR: "${fieldTitle || fieldKey}"
TEXTO ORIGINAL DEL USUARIO:
${currentValue}

${contextLines.length > 0 ? `CONTEXTO ADICIONAL DEL FORMULARIO:\n${contextLines.join('\n')}` : ''}

Mejora el texto del usuario para que sea más específico, accionable y optimizado para el agente "${agent.name}". Mantén la intención original pero hazlo más detallado y profesional.`

    const providerInstance = getProviderInstance(provider)

    /**
     * Cierra la contabilidad, igual que en `/api/agents/run`.
     *
     * Corre una sola vez: si el cliente corta, la lectura termina normalmente y
     * el `controller.close()` posterior falla, así que el camino feliz y el
     * `catch` se ejecutan los dos.
     */
    let accounted = false

    async function finishAccounting(
      usage: TokenUsage | null,
      producedOutput: boolean
    ): Promise<void> {
      if (!supabase || accounted) return
      accounted = true

      const cost = usage
        ? providerInstance.estimateCost(usage.inputTokens, usage.outputTokens, model)
        : 0

      if (reservation?.reserved) {
        if (usage) {
          await settleAgentRun(provider, usage.inputTokens, usage.outputTokens, cost)
        } else if (!producedOutput) {
          await settleAgentRun(provider, 0, 0, 0)
        }
        return
      }

      if (usage || producedOutput) {
        await recordAgentUsage(
          provider,
          usage?.inputTokens ?? 0,
          usage?.outputTokens ?? 0,
          cost
        )
      }
    }

    let sourceStream: ReadableStream<Uint8Array>
    let usagePromise: Promise<TokenUsage | null>

    try {
      const result = providerInstance.stream({
        apiKey,
        model,
        systemPrompt: ENHANCE_PROMPT_CRITERIA,
        userPrompt,
        maxTokens: 1024,
        temperature: 0.5,
      })
      sourceStream = result.stream
      usagePromise = result.usage
    } catch (execError) {
      console.error('[enhance] Execution error:', execError)
      await finishAccounting(null, false)
      return Response.json(
        { error: 'No pudimos mejorar el texto. Probá de nuevo.' },
        { status: 500 }
      )
    }

    let produced = false
    const reader = sourceStream.getReader()

    const trackedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let done = false
          while (!done) {
            const result = await reader.read()
            done = result.done
            if (result.value) {
              produced = true
              controller.enqueue(result.value)
            }
          }

          const usage = request.signal.aborted
            ? await usageWithin(usagePromise, 5_000)
            : await usagePromise

          await finishAccounting(usage, produced)

          try {
            controller.close()
          } catch {
            // El cliente ya cerró la conexión.
          }
        } catch (streamError) {
          console.error('[enhance] Stream error:', streamError)
          await finishAccounting(null, produced)
          controller.error(streamError)
        }
      },

      cancel(reason) {
        void reader.cancel(reason)
      },
    })

    return new Response(trackedStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Provider': provider,
        'X-Model-Used': model,
      },
    })
  } catch (error) {
    // El detalle queda en el log; al cliente le va un texto fijo en español.
    console.error('[enhance] Unhandled error:', error)
    return Response.json(
      { error: 'Error interno del servidor. Probá de nuevo en unos segundos.' },
      { status: 500 }
    )
  }
}
