import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { encryptApiKey, getKeyHint } from '@/lib/crypto/key-manager'
import { getDevKeys, setDevKey, deleteDevKey } from '@/lib/store/dev-keys'
import { getUser, unauthorizedResponse } from '@/lib/auth/dal'

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
            is_valid: true,
            last_verified_at: now,
            verification_error: null,
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
        isValid: true,
        lastVerifiedAt: now,
        verificationError: null,
      })
    }

    return NextResponse.json({ success: true, provider, hint })
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
