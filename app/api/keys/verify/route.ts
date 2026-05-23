import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'
import { encryptApiKey, getKeyHint } from '@/lib/crypto/key-manager'
import { setDevKey } from '@/lib/store/dev-keys'

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

async function verifyProviderKey(
  provider: string,
  apiKey: string
): Promise<{ valid: boolean; error: string }> {
  let valid = false
  let error = ''

  switch (provider) {
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
      valid = res.ok
      if (!valid) error = `Anthropic: ${res.status} ${res.statusText}`
      break
    }
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      valid = res.ok
      if (!valid) error = `OpenAI: ${res.status} ${res.statusText}`
      break
    }
    case 'google': {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      valid = res.ok
      if (!valid) error = `Google: ${res.status} ${res.statusText}`
      break
    }
    case 'openrouter': {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      valid = res.ok
      if (!valid) error = `OpenRouter: ${res.status} ${res.statusText}`
      break
    }
    default:
      valid = apiKey.length > 5
  }

  return { valid, error }
}

export async function POST(request: NextRequest) {
  try {
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
            user_id: DEV_USER_ID,
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
