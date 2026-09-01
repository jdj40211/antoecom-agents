import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { encryptApiKey, getKeyHint } from '@/lib/crypto/key-manager'
import { getDevKeys, setDevKey, deleteDevKey } from '@/lib/store/dev-keys'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'
import { anthropicProvider } from '@/lib/agents/providers/anthropic'
import { openaiProvider } from '@/lib/agents/providers/openai'
import { googleProvider } from '@/lib/agents/providers/google'
import { openrouterProvider } from '@/lib/agents/providers/openrouter'
import type { AIProvider } from '@/lib/agents/providers/base'

// Mismos providers que /api/keys/verify. El PUT guardaba antes cualquier
// string como key válida sin llamar nunca a verifyKey (hallazgo de
// auditoría): is_valid mentía. Ahora se verifica acá también.
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

  if (!instance) {
    return { valid: false, error: `Todavía no soportamos ${provider}.` }
  }

  const result = await instance.verifyKey(apiKey)
  return { valid: result.valid, error: result.error ?? '' }
}

interface KeyResponse {
  provider: string
  hint: string
  isValid: boolean
  lastVerified: string | null
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    if (isSupabaseConfigured()) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('provider, key_hint, is_valid, last_verified_at')
        .eq('user_id', user.id)

      if (error) {
        console.error('GET keys error:', error)
        return NextResponse.json({ error: 'Error al cargar las keys' }, { status: 500 })
      }

      const keys: KeyResponse[] = (data ?? []).map((row) => ({
        provider: row.provider as string,
        hint: (row.key_hint as string | null) ?? '',
        isValid: row.is_valid as boolean,
        lastVerified: row.last_verified_at as string | null,
      }))

      return NextResponse.json({ keys })
    }

    const devKeys = getDevKeys()
    const keys: KeyResponse[] = devKeys.map((k) => ({
      provider: k.provider,
      hint: k.keyHint,
      isValid: k.isValid,
      lastVerified: k.lastVerifiedAt,
    }))

    return NextResponse.json({ keys })
  } catch (err) {
    console.error('GET keys error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
      return NextResponse.json({ error: 'provider and apiKey required' }, { status: 400 })
    }

    const { provider, apiKey } = body as { provider: string; apiKey: string }

    if (typeof provider !== 'string' || typeof apiKey !== 'string' || !provider.trim() || !apiKey.trim()) {
      return NextResponse.json({ error: 'provider and apiKey must be non-empty strings' }, { status: 400 })
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
        console.error('PUT key upsert error:', dbError)
        return NextResponse.json({ error: 'Error al guardar la key' }, { status: 500 })
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

    if (!valid) {
      return NextResponse.json({ success: true, provider, hint, isValid: false, error })
    }

    return NextResponse.json({ success: true, provider, hint, isValid: true })
  } catch (err) {
    console.error('PUT key error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return unauthorizedResponse()

    const body: unknown = await request.json()

    if (typeof body !== 'object' || body === null || !('provider' in body)) {
      return NextResponse.json({ error: 'provider required' }, { status: 400 })
    }

    const { provider } = body as { provider: string }

    if (typeof provider !== 'string' || !provider.trim()) {
      return NextResponse.json({ error: 'provider must be a non-empty string' }, { status: 400 })
    }

    if (isSupabaseConfigured()) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      const { error: dbError } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider)

      if (dbError) {
        console.error('DELETE key error:', dbError)
        return NextResponse.json({ error: 'Error al eliminar la key' }, { status: 500 })
      }
    } else {
      deleteDevKey(provider)
    }

    return NextResponse.json({ success: true, provider })
  } catch (err) {
    console.error('DELETE key error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
