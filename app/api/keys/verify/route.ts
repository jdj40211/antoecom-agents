import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { encryptApiKey, getKeyHint } from '@/lib/crypto/key-manager'
import { setDevKey } from '@/lib/store/dev-keys'
import { anthropicProvider } from '@/lib/agents/providers/anthropic'
import { openaiProvider } from '@/lib/agents/providers/openai'
import { googleProvider } from '@/lib/agents/providers/google'
import { openrouterProvider } from '@/lib/agents/providers/openrouter'
import type { AIProvider } from '@/lib/agents/providers/base'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'

// La verificación vive en cada provider. Antes estaba duplicada acá, y esa
// copia se quedó con un modelo retirado que marcaba como inválidas keys buenas.
const PROVIDERS: Record<string, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
  openrouter: openrouterProvider,
}

async function verifyProviderKey(
  provider: string,
  apiKey: string
): Promise<{ valid: boolean; error: string }> {
  const instance = PROVIDERS[provider]

  // Antes, un proveedor desconocido se daba por válido si la key tenía más de
  // 5 caracteres. Eso guardaba credenciales que después ninguna ejecución podía
  // usar, y las mostraba como conectadas.
  if (!instance) {
    return { valid: false, error: `Todavía no soportamos ${provider}.` }
  }

  const result = await instance.verifyKey(apiKey)
  return { valid: result.valid, error: result.error ?? '' }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    const body: unknown = await request.json()

    if (
      typeof body !== 'object' ||
      body === null ||
      !('provider' in body) ||
      !('apiKey' in body)
    ) {
      return NextResponse.json(
        { error: 'provider and apiKey required' },
        { status: 400 }
      )
    }

    const { provider, apiKey } = body as { provider: string; apiKey: string }

    if (
      typeof provider !== 'string' ||
      typeof apiKey !== 'string' ||
      !provider.trim() ||
      !apiKey.trim()
    ) {
      return NextResponse.json(
        { error: 'provider and apiKey must be non-empty strings' },
        { status: 400 }
      )
    }

    const { valid, error } = await verifyProviderKey(provider, apiKey)
    const hint = getKeyHint(apiKey)
    const now = new Date().toISOString()

    if (isSupabaseConfigured()) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const encrypted = encryptApiKey(apiKey)

      const { error: dbError } = await supabase
        .from('user_api_keys')
        .upsert(
          {
            user_id: user.id,
            provider,
            encrypted_key: encrypted,
            key_hint: hint,
            is_valid: valid,
            last_verified_at: now,
            verification_error: valid ? null : error,
          },
          { onConflict: 'user_id,provider' }
        )

      if (dbError) {
        console.error('DB upsert error:', dbError)
      }
    } else {
      setDevKey({
        provider,
        encryptedKey: apiKey,
        keyHint: hint,
        isValid: valid,
        lastVerifiedAt: now,
        verificationError: valid ? null : error,
      })
    }

    if (valid) {
      return NextResponse.json({ valid: true, hint })
    }

    return NextResponse.json({ valid: false, error })
  } catch (err) {
    console.error('Verify key error:', err)
    return NextResponse.json(
      { valid: false, error: 'Error al verificar la key' },
      { status: 500 }
    )
  }
}
