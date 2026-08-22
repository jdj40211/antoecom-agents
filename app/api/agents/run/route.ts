import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents/catalog'
import { executeAgent, resolveProvider, getProviderInstance } from '@/lib/agents/executor'
import { buildPrompts } from '@/lib/agents/prompt-builder'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getDevKey } from '@/lib/store/dev-keys'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'
import { checkRateLimit } from '@/lib/agents/rate-limiter'

export const maxDuration = 300

interface RunRequestBody {
  agentSlug: string
  input: Record<string, string>
  modelOverride?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    const body = (await request.json()) as RunRequestBody
    const { agentSlug, input, modelOverride } = body

    if (!agentSlug || !input) {
      return Response.json(
        { error: 'Faltan campos requeridos: agentSlug e input' },
        { status: 400 }
      )
    }

    const agent = getAgent(agentSlug)
    if (!agent) {
      return Response.json({ error: 'Agente no encontrado' }, { status: 404 })
    }

    const model = modelOverride ?? agent.defaultModel
    const providerName = resolveProvider(model)

    const supabase = isSupabaseConfigured()
      ? await (await import('@/lib/supabase/server')).createClient()
      : null

    // Rate limit por programa. Falla abierto si las tablas no responden.
    if (supabase) {
      const { data: profile } = await supabase
        .from('community_profiles')
        .select('program')
        .eq('id', user.id)
        .maybeSingle()

      const limit = await checkRateLimit(user.id, (profile?.program as string) ?? 'trial')

      if (!limit.allowed) {
        const messages: Record<string, string> = {
          'daily-runs': `Llegaste al límite de ${limit.limit} ejecuciones por día. Se renueva mañana.`,
          'hourly-runs': `Llegaste al límite de ${limit.limit} ejecuciones por hora. Probá de nuevo en un rato.`,
          'daily-tokens': `Llegaste al límite de tokens por día de tu plan. Se renueva mañana.`,
        }

        return Response.json(
          {
            error:
              messages[limit.reason ?? ''] ??
              'Llegaste al límite de uso de tu plan. Se renueva mañana.',
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
    let usagePromise: Promise<import('@/lib/agents/providers/base').TokenUsage | null>

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
      const errorMessage = execError instanceof Error ? execError.message : 'Error desconocido'
      console.error('[run] Execution error:', errorMessage)

      if (runId && supabase) {
        await supabase
          .from('agent_runs')
          .update({ status: 'error', error_message: errorMessage, completed_at: new Date().toISOString() })
          .eq('id', runId)
      }

      return Response.json(
        { error: `Error al ejecutar el agente: ${errorMessage}` },
        { status: 500 }
      )
    }

    const decoder = new TextDecoder()
    let fullOutput = ''

    const trackedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = sourceStream.getReader()
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

          const responseTimeMs = Date.now() - startTime
          const usage = await usagePromise

          if (supabase) {
            const cost = usage
              ? getProviderInstance(providerName).estimateCost(
                  usage.inputTokens,
                  usage.outputTokens,
                  model
                )
              : null

            if (runId) {
              await supabase
                .from('agent_runs')
                .update({
                  status: 'success',
                  output: fullOutput,
                  response_time_ms: responseTimeMs,
                  completed_at: new Date().toISOString(),
                  tokens_input: usage?.inputTokens ?? null,
                  tokens_output: usage?.outputTokens ?? null,
                  tokens_total: usage?.totalTokens ?? null,
                  cost_estimate_usd: cost,
                })
                .eq('id', runId)
            }

            // Acumula el uso diario. Va por RPC porque usage_daily no tiene
            // policies de escritura: así el cliente no puede tocar sus contadores.
            const { error: usageError } = await supabase.rpc('record_agent_usage', {
              p_provider: providerName,
              p_tokens_input: usage?.inputTokens ?? 0,
              p_tokens_output: usage?.outputTokens ?? 0,
              p_cost: cost ?? 0,
            })

            if (usageError) {
              console.warn('[run] record_agent_usage:', usageError.message)
            }
          }

          controller.close()
        } catch (streamError) {
          const errorMessage = streamError instanceof Error
            ? streamError.message
            : 'Error durante el streaming'

          console.error('[run] Stream error:', errorMessage)

          if (supabase) {
            const isAuthError = errorMessage.includes('401') ||
              errorMessage.includes('403') ||
              errorMessage.toLowerCase().includes('unauthorized') ||
              errorMessage.toLowerCase().includes('invalid api key')

            if (isAuthError) {
              await supabase
                .from('user_api_keys')
                .update({ is_valid: false, verification_error: errorMessage })
                .eq('user_id', user.id)
                .eq('provider', providerName)
            }

            if (runId) {
              await supabase
                .from('agent_runs')
                .update({
                  status: 'error',
                  error_message: errorMessage,
                  response_time_ms: Date.now() - startTime,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', runId)
            }
          }

          controller.error(streamError)
        }
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
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('[run] Unhandled error:', message)
    return Response.json(
      { error: `Error interno del servidor: ${message}` },
      { status: 500 }
    )
  }
}
