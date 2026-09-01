'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { MailCheck, Loader2, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/hub'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(searchParams.get('error') ?? '')

  // Las vars de Supabase son NEXT_PUBLIC_, así que el cliente también sabe si
  // la instancia quedó sin configurar. Sin esto el formulario se enviaría
  // contra una URL undefined y el error sería incomprensible.
  const configured = isSupabaseConfigured()

  function callbackUrl() {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    })

    setLoading(false)

    if (otpError) {
      setError(
        otpError.message.toLowerCase().includes('rate')
          ? 'Demasiados intentos. Esperá un minuto antes de pedir otro enlace.'
          : 'No pudimos enviar el enlace. Revisá el correo e intentá de nuevo.'
      )
      return
    }

    setSent(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="w-full max-w-sm p-8 gap-0">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size={44} showText={false} />
          <h1 className="mt-4 text-2xl text-foreground">Entrá a AntoEcom Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu plataforma de agentes IA
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!configured ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Esta instancia no está configurada
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Le faltan las credenciales de Supabase, así que todavía no se
              puede iniciar sesión. Avisale al administrador.
            </p>
          </div>
        ) : sent ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-border bg-muted">
              <MailCheck className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Revisá tu correo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enviamos un enlace de acceso a{' '}
              <span className="text-foreground">{email}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => setSent(false)}
            >
              Volver
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-11"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  'Enviar magic link'
                )}
              </Button>
            </form>

          </>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Con la marca de AntoEcom
        </p>
      </Card>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
