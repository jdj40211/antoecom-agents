'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Mail, ArrowRight, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/hub'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    })

    if (oauthError) {
      setGoogleLoading(false)
      setError('No pudimos conectar con Google. Intentá de nuevo.')
    }
    // Si sale bien, el navegador se va a Google y no vuelve acá.
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl"
    >
      <div className="flex flex-col items-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Logo size={52} showText={false} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-center"
        >
          <span className="text-xl font-semibold text-white tracking-tight">
            AntoEcom Agents
          </span>
          <p className="text-sm text-white/50 mt-0.5">Tu plataforma de agentes IA</p>
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3"
        >
          <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{error}</p>
        </motion.div>
      )}

      {!configured ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-danger" />
          </div>
          <p className="text-white font-medium">Esta instancia no está configurada</p>
          <p className="text-white/50 text-sm mt-1">
            Le faltan las credenciales de Supabase, así que todavía no se puede
            iniciar sesión. Avisale al administrador.
          </p>
        </div>
      ) : sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <div className="w-12 h-12 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-brand-light" />
          </div>
          <p className="text-white font-medium">Revisá tu correo</p>
          <p className="text-white/50 text-sm mt-1">
            Enviamos un enlace de acceso a{' '}
            <span className="text-brand-light">{email}</span>
          </p>
          <Button
            variant="ghost"
            className="mt-4 text-white/40 hover:text-white/70 text-xs"
            onClick={() => setSent(false)}
          >
            Volver
          </Button>
        </motion.div>
      ) : (
        <>
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Correo electrónico</Label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-brand/60 focus-visible:border-brand/50 h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || googleLoading || !email}
              className="w-full h-11 font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Enviar magic link
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1 bg-white/10" />
            <span className="text-white/30 text-xs">o</span>
            <Separator className="flex-1 bg-white/10" />
          </div>

          <Button
            variant="outline"
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="w-full h-11 border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Conectando...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continuar con Google
              </>
            )}
          </Button>
        </>
      )}

      <p className="text-center text-white/25 text-xs mt-6">Powered by AntoEcom</p>
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
