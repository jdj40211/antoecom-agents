import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents/catalog'
import { executeAgent, resolveProvider } from '@/lib/agents/executor'
import { buildPrompts } from '@/lib/agents/prompt-builder'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getDevKey } from '@/lib/store/dev-keys'

export const maxDuration = 300

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

interface RunRequestBody {
  agentSlug: string
  input: Record<string, string>
  modelOverride?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
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

    const userId = DEV_USER_ID
    const model = modelOverride ?? agent.defaultModel
    const providerName = resolveProvider(model)

    // Fetch API key (Supabase or dev store)
    let apiKey: string | null = null

    if (isSupabaseConfigured()) {
      const { createClient } = await import('@/lib/supabase/server')
      const { decryptApiKey } = await import('@/lib/crypto/key-manager')
      const supabase = await createClient()

      const { data: keyRow, error: keyError } = await supabase
        .from('user_api_keys')
        .select('encrypted_key, is_valid')
        .eq('user_id', userId)
        .eq('provider', providerName)
        .maybeSingle()

      if (keyError) {
        console.error('[run] Error fetching API key:', keyError.message)
        return Response.json(
          { error: 'Error al buscar tu API key. Intenta de nuevo.' },
          { status: 500 }
        )
      }

      if (!keyRow) {
        return Response.json(
          {
            error: `No tienes una API key configurada para ${providerName}. Ve a Configuración > API Keys para agregarla.`,
            provider: providerName,
          },
          { status: 400 }
        )
      }

      if (!keyRow.is_valid) {
        return Response.json(
          {
            error: `Tu API key de ${providerName} está marcada como inválida. Verifica que sea correcta en Configuración > API Keys.`,
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
          { error: 'Error al descifrar tu API key. Intenta configurarla de nuevo.' },
          { status: 500 }
        )
      }
    } else {
      const devKey = getDevKey(providerName)

      if (!devKey) {
        return Response.json(
          {
            error: `No tienes una API key configurada para ${providerName}. Ve a Configuración > API Keys para agregarla.`,
            provider: providerName,
          },
          { status: 400 }
        )
      }

      if (!devKey.isValid) {
        return Response.json(
          {
            error: `Tu API key de ${providerName} está marcada como inválida. Verifica en Configuración > API Keys.`,
            provider: providerName,
          },
          { status: 400 }
        )
      }

      apiKey = devKey.encryptedKey
    }

    const { systemPrompt, userPrompt } = buildPrompts(agent, input)

    // Track run in Supabase if configured
    let runId: string | undefined
    let supabaseForTracking: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>> | null = null

    if (isSupabaseConfigured()) {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        supabaseForTracking = await createClient()

        const { data: runRow, error: runInsertError } = await supabaseForTracking
          .from('agent_runs')
          .insert({
            user_id: userId,
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
      } catch {
        console.warn('[run] agent_runs table not available')
      }
    }

    let sourceStream: ReadableStream<Uint8Array>
    try {
      sourceStream = executeAgent({
        agent,
        input,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
      })
    } catch (execError) {
      const errorMessage = execError instanceof Error ? execError.message : 'Error desconocido'
      console.error('[run] Execution error:', errorMessage)

      if (runId && supabaseForTracking) {
        await supabaseForTracking
          .from('agent_runs')
          .update({ status: 'error', error_message: errorMessage })
          .eq('id', runId)
      }

      return Response.json(
        { error: `Error al ejecutar el agente: ${errorMessage}` },
        { status: 500 }
      )
    }

    const encoder = new TextEncoder()
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
              const chunk = typeof result.value === 'string'
                ? encoder.encode(result.value)
                : result.value
              fullOutput += decoder.decode(chunk, { stream: true })
              controller.enqueue(chunk)
            }
          }

          fullOutput += decoder.decode()

          const responseTimeMs = Date.now() - startTime
          if (runId && supabaseForTracking) {
            await supabaseForTracking
              .from('agent_runs')
              .update({
                status: 'success',
                output: fullOutput,
                response_time_ms: responseTimeMs,
              })
              .eq('id', runId)
          }

          controller.close()
        } catch (streamError) {
          const errorMessage = streamError instanceof Error
            ? streamError.message
            : 'Error durante el streaming'

          console.error('[run] Stream error:', errorMessage)

          if (supabaseForTracking) {
            const isAuthError = errorMessage.includes('401') ||
              errorMessage.includes('403') ||
              errorMessage.toLowerCase().includes('unauthorized') ||
              errorMessage.toLowerCase().includes('invalid api key')

            if (isAuthError) {
              await supabaseForTracking
                .from('user_api_keys')
                .update({ is_valid: false })
                .eq('user_id', userId)
                .eq('provider', providerName)
            }

            if (runId) {
              await supabaseForTracking
                .from('agent_runs')
                .update({
                  status: 'error',
                  error_message: errorMessage,
                  response_time_ms: Date.now() - startTime,
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
