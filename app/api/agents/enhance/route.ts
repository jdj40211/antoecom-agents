import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents/catalog'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { getDevKey } from '@/lib/store/dev-keys'
import { ENHANCE_PROMPT_CRITERIA } from '@/lib/agents/knowledge/ecommerce-ux'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'

const ECONOMY_MODELS: Record<string, string> = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-5.6-luna',
  google: 'gemini-2.5-flash',
}

interface EnhanceRequestBody {
  agentSlug: string
  fieldKey: string
  fieldTitle: string
  currentValue: string
  context: Record<string, string>
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    const body = (await request.json()) as EnhanceRequestBody
    const { agentSlug, fieldKey, fieldTitle, currentValue, context } = body

    if (!agentSlug || !currentValue?.trim()) {
      return Response.json(
        { error: 'Se requiere agentSlug y texto a mejorar' },
        { status: 400 }
      )
    }

    const agent = getAgent(agentSlug)
    if (!agent) {
      return Response.json({ error: 'Agente no encontrado' }, { status: 404 })
    }

    let apiKey: string | null = null
    let providerName: string | null = null

    for (const provider of ['anthropic', 'openai', 'google'] as const) {
      if (isSupabaseConfigured()) {
        const { createClient } = await import('@/lib/supabase/server')
        const { decryptApiKey } = await import('@/lib/crypto/key-manager')
        const supabase = await createClient()

        const { data: keyRow } = await supabase
          .from('user_api_keys')
          .select('encrypted_key, is_valid')
          .eq('user_id', user.id)
          .eq('provider', provider)
          .eq('is_valid', true)
          .maybeSingle()

        if (keyRow) {
          try {
            apiKey = decryptApiKey(keyRow.encrypted_key as string)
            providerName = provider
            break
          } catch { /* try next */ }
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
        { error: 'No tienes API keys configuradas. Ve a Configuración > API Keys.' },
        { status: 400 }
      )
    }

    const model = ECONOMY_MODELS[providerName]

    const contextLines = Object.entries(context)
      .filter(([k, v]) => k !== fieldKey && v.trim())
      .map(([k, v]) => {
        const fieldDef = agent.inputSchema[k]
        return `- ${fieldDef?.title ?? k}: ${v}`
      })

    const userPrompt = `AGENTE: ${agent.name} — ${agent.description}

CAMPO A MEJORAR: "${fieldTitle}"
TEXTO ORIGINAL DEL USUARIO:
${currentValue}

${contextLines.length > 0 ? `CONTEXTO ADICIONAL DEL FORMULARIO:\n${contextLines.join('\n')}` : ''}

Mejora el texto del usuario para que sea más específico, accionable y optimizado para el agente "${agent.name}". Mantén la intención original pero hazlo más detallado y profesional.`

    const providerInstance = providerName === 'anthropic'
      ? (await import('@/lib/agents/providers/anthropic')).anthropicProvider
      : providerName === 'openai'
        ? (await import('@/lib/agents/providers/openai')).openaiProvider
        : (await import('@/lib/agents/providers/google')).googleProvider

    const { stream } = providerInstance.stream({
      apiKey,
      model,
      systemPrompt: ENHANCE_PROMPT_CRITERIA,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.5,
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[enhance] Error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
