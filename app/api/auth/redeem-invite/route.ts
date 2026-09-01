import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/supabase/is-configured'

/**
 * Canje del código de invitación, antes del magic link.
 *
 * Por qué existe esta ruta y no se valida en el cliente: `supabase.auth` está
 * en el bundle del navegador, así que cualquiera puede abrir la consola y
 * llamar a `signInWithOtp` sin pasar por el formulario. La única validación que
 * sirve es la que ocurre acá, del lado del servidor, y el front solo dispara el
 * magic link cuando esta ruta responde 200.
 *
 * `redeem_invite_code` es SECURITY DEFINER y su EXECUTE está solo en
 * service_role (ver 20260901180000_invitaciones_y_acceso_plano.sql), así que
 * hay que llamarla con SUPABASE_SERVICE_ROLE_KEY. Con la anon key Postgres
 * responde permission denied.
 *
 * La ruta es pública por necesidad: quien la usa todavía no tiene cuenta. Por
 * eso el proxy la deja pasar sin sesión y por eso el rate limit de abajo.
 */

const MAX_EMAIL_LENGTH = 320
const MAX_CODE_LENGTH = 100

/** Mensaje único para código inexistente, vencido o sin usos. Ver abajo. */
const CODIGO_INVALIDO =
  'Ese código no es válido o ya no está disponible. Pedí uno nuevo en la comunidad.'

const SIN_CODIGO =
  'Necesitás un código de invitación para entrar por primera vez. Pedilo en la comunidad.'

const DATOS_INCOMPLETOS = 'Revisá el correo y el código, algo quedó incompleto.'

/**
 * Rate limit por IP, en memoria.
 *
 * El freno contra adivinar códigos a fuerza bruta son tres cosas juntas: el
 * motivo de fallo único, el largo mínimo del código con sufijo aleatorio, y
 * esto. En memoria significa por instancia: en serverless no es un límite
 * global y se pierde en cada arranque en frío. Alcanza para cortar un script
 * corriendo contra una sola instancia; el límite duro sigue siendo el diseño
 * del código en sí.
 */
const RATE_LIMIT_VENTANA_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_INTENTOS = 10
const intentosPorIp = new Map<string, number[]>()

function pasaRateLimit(ip: string): boolean {
  const ahora = Date.now()
  const previos = intentosPorIp.get(ip) ?? []
  const vigentes = previos.filter((t) => ahora - t < RATE_LIMIT_VENTANA_MS)

  if (vigentes.length >= RATE_LIMIT_MAX_INTENTOS) {
    intentosPorIp.set(ip, vigentes)
    return false
  }

  vigentes.push(ahora)
  intentosPorIp.set(ip, vigentes)

  // El Map no crece para siempre: cuando junta demasiadas IPs se limpian las
  // que ya no tienen intentos vigentes.
  if (intentosPorIp.size > 5000) {
    for (const [clave, marcas] of intentosPorIp) {
      if (marcas.every((t) => ahora - t >= RATE_LIMIT_VENTANA_MS)) {
        intentosPorIp.delete(clave)
      }
    }
  }

  return true
}

function ipDe(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const primera = forwarded?.split(',')[0]?.trim()
  return primera || request.headers.get('x-real-ip') || 'desconocida'
}

interface ResultadoCanje {
  allowed: boolean
  reason: string | null
}

/**
 * `redeem_invite_code` devuelve una tabla, así que el cliente entrega un array
 * de una fila. Se lee con guardas y sin castear: el cliente de Supabase no está
 * tipado contra el schema, y dar por hecho la forma de la respuesta es
 * exactamente lo que rompe en silencio cuando la función cambia.
 */
function leerResultado(data: unknown): ResultadoCanje | null {
  const fila: unknown = Array.isArray(data) ? data[0] : data

  if (typeof fila !== 'object' || fila === null) return null
  if (!('allowed' in fila) || typeof fila.allowed !== 'boolean') return null

  const reason =
    'reason' in fila && typeof fila.reason === 'string' ? fila.reason : null

  return { allowed: fila.allowed, reason }
}

function servicio() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Esta instancia no está configurada. Avisale al administrador.' },
        { status: 503 }
      )
    }

    const ip = ipDe(request)
    if (!pasaRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Esperá unos minutos antes de probar de nuevo.' },
        { status: 429 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: DATOS_INCOMPLETOS }, { status: 400 })
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: DATOS_INCOMPLETOS }, { status: 400 })
    }

    const emailCrudo = 'email' in body && typeof body.email === 'string' ? body.email : ''
    const codigoCrudo = 'code' in body && typeof body.code === 'string' ? body.code : ''

    // Las mismas normalizaciones que hace la función en SQL: correo en
    // minúsculas, código en mayúsculas. Se repiten acá para que la consulta a
    // invite_redemptions del atajo de abajo compare contra lo mismo que guardó
    // el canje.
    const email = emailCrudo.trim().toLowerCase()
    const codigo = codigoCrudo.trim().toUpperCase()

    if (
      !email ||
      !email.includes('@') ||
      email.length > MAX_EMAIL_LENGTH ||
      codigo.length > MAX_CODE_LENGTH
    ) {
      return NextResponse.json({ error: DATOS_INCOMPLETOS }, { status: 400 })
    }

    const supabase = servicio()

    // Quien ya entró alguna vez no vuelve a poner el código.
    //
    // La decisión: se resuelve por `invite_redemptions`, que tiene el correo
    // como clave primaria, y no por auth.users ni por community_profiles. Es lo
    // más simple que funciona porque es la misma tabla que la función de canje
    // ya consulta para devolver 'ya-canjeado', así que el criterio de "esta
    // persona pasó por la puerta" queda en un solo lugar y no en dos que se
    // pueden desincronizar. Además es la única que se puede consultar por
    // correo en este punto del flujo: el usuario todavía no tiene sesión y su
    // user_id no existe hasta que confirma el magic link.
    //
    // Cuando SÍ viene código no hace falta este atajo: la función de canje
    // chequea 'ya-canjeado' antes que nada y no consume un uso del código.
    //
    // El costo, anotado a conciencia: con el campo vacío, la respuesta permite
    // distinguir un correo ya registrado de uno que no lo está. Es la misma
    // filtración que tiene cualquier formulario que sepa saludar distinto a
    // quien ya tiene cuenta, y el rate limit por IP de arriba la acota. La
    // alternativa (exigir el código siempre) dejaría afuera a la comunidad
    // entera que ya está adentro, que es peor.
    if (!codigo) {
      const { data, error } = await supabase
        .from('invite_redemptions')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (error) {
        console.error('[redeem-invite] lectura de canjes:', error.message)
        return NextResponse.json(
          { error: 'No pudimos validar tu acceso. Intentá de nuevo en un minuto.' },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json({ error: SIN_CODIGO }, { status: 403 })
      }

      return NextResponse.json({ ok: true, yaRegistrado: true })
    }

    const { data, error } = await supabase.rpc('redeem_invite_code', {
      p_email: email,
      p_code: codigo,
    })

    if (error) {
      console.error('[redeem-invite] rpc:', error.message)
      return NextResponse.json(
        { error: 'No pudimos validar el código. Intentá de nuevo en un minuto.' },
        { status: 500 }
      )
    }

    const resultado = leerResultado(data)

    if (!resultado) {
      console.error('[redeem-invite] respuesta inesperada de redeem_invite_code')
      return NextResponse.json(
        { error: 'No pudimos validar el código. Intentá de nuevo en un minuto.' },
        { status: 500 }
      )
    }

    if (resultado.allowed) {
      return NextResponse.json({
        ok: true,
        yaRegistrado: resultado.reason === 'ya-canjeado',
      })
    }

    // Los motivos de fallo y qué se le dice al usuario.
    //
    // Sobre los tres casos que pide distinguir el producto (código inexistente,
    // vencido, sin usos): la función los distingue puertas adentro pero los
    // devuelve como un único 'codigo-invalido', a propósito. La ruta es pública
    // por definición, así que responder "ese código venció" o "ese código se
    // agotó" confirmaría que el código existe y convertiría el formulario en un
    // oráculo para adivinar códigos a fuerza de intentos. Como la instrucción de
    // no filtrar información pesa más que la de separar los mensajes, y como
    // acá no llega el dato para separarlos aunque quisiéramos, los tres comparten
    // un mensaje que los cubre. Lo que sí se distingue es lo que no filtra nada:
    // datos incompletos, falta de código y demasiados intentos.
    if (resultado.reason === 'datos-incompletos') {
      return NextResponse.json({ error: DATOS_INCOMPLETOS }, { status: 400 })
    }

    return NextResponse.json({ error: CODIGO_INVALIDO }, { status: 403 })
  } catch (err) {
    console.error('[redeem-invite] POST:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
