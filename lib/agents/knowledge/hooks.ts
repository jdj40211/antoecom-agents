// Knowledge base del agente hook-writer.
// Fórmulas de gancho para video y post, y umbrales de retención.
// Fuentes: Meta Business Help Center (3-second video plays, ThruPlay, consultado sep 2026),
// Billo Hook Rate Benchmarks (datos jul a dic 2025), Motion Creative Benchmarks 2026, TikTok for Business.

export const HOOK_PATTERNS = `FÓRMULAS DE HOOK PARA ECOMMERCE LATAM (nombre, fórmula, ejemplo listo para decir en cámara):
- Objeción propia: "Yo también pensé que [objeción común]". Ej: "Yo también pensé que ninguna faja me iba a servir".
- Orden inversa: "Dejá de [acción común] si [síntoma]". Ej: "Dejá de tomar colágeno en polvo si te inflama".
- Lista negada: "[N] cosas que nadie te dice de [producto]". Ej: "3 cosas que nadie te dice del colágeno hidrolizado".
- Diario de N días: "[N] días usando [producto]: esto pasó". Ej: "7 días con gomitas de melatonina: esto pasó".
- Pattern interrupt visual: acción física en el primer cuadro (quitarse el zapato, estirar la faja, mostrar el pie hinchado) más una frase corta. Ej: se saca la zapatilla en cámara y dice "Así llego yo a las 6 de la tarde".
- Prueba social con número no redondo: "[cifra exacta] personas [acción] este mes". Ej: "1.847 mujeres pidieron esta faja este mes". Solo si el número es real y lo podés mostrar.
- Contraste en primera persona: "Hace [tiempo] no podía [acción]. Hoy [acción]". Ej: "Hace 3 semanas no podía subir escaleras. Hoy caminé 40 minutos".
- Riesgo cero contraentrega: "Pagás cuando la tenés en la mano". Ej: "Pagás cuando el mensajero te la entrega. Si no te sirve, no pagás".
- Pregunta de diagnóstico: un síntoma que el espectador reconoce en su cuerpo, no en su cabeza. Ej: "¿Te levantás y el primer paso te duele?".
- Confesión de error: "Perdí [tiempo o plata] haciendo [error]". Ej: "Perdí 4 meses usando la talla equivocada de faja".

APERTURAS PROHIBIDAS EN VIDEO (queman el primer segundo):
- "Hola chicos", "Hola a todos", "Bienvenidos a mi canal": saludás a una audiencia que todavía no decidió quedarse.
- "¿Sabías que...": pregunta de trivia, no de dolor. Nadie entró al feed a aprender.
- "Hoy les traigo", "En este video les voy a mostrar": anunciás el contenido en vez de darlo.
- "Antes de empezar, suscribite": pedís antes de dar.
Por qué: el feed ya le mostró cientos de aperturas iguales al mismo usuario ese mismo día. Cualquier fórmula que suene a "video de YouTube" dispara el scroll antes del segundo 2. El primer cuadro tiene que mostrar el problema, el producto o una cara reaccionando, nunca al creador presentándose.`

export const HOOK_BENCHMARKS = `UMBRALES DE RETENCIÓN Y CÓMO LEERLOS:
- Hook rate = "reproducciones de video de 3 segundos" dividido impresiones. Meta define "3-second video play" como el video reproducido al menos 3 segundos, o casi su duración total si dura menos de 3 s (Meta Business Help Center, facebook.com/business/help/743427195703387, consultado sep 2026). Ojo: "hook rate" es término de la industria, Meta no lo usa en su documentación.
- Hold rate = ThruPlay dividido impresiones. Meta define ThruPlay como reproducciones de al menos 15 segundos, o hasta el final si el video dura menos de 15 s (Meta Business Help Center, facebook.com/business/help/2051461368219124, consultado sep 2026).
- Promedio de referencia: hook rate de 24,42% en anuncios de video de Meta, sobre 80.069 anuncios y USD 105M de inversión analizada entre julio y diciembre de 2025 (Billo, Hook Rate Benchmarks, billo.app). Salud y belleza fue la categoría más alta con 28,34%, mascotas la más baja con 19,80%.
- Referencia de "bueno": 30% o más de hook rate en Meta, según el dataset de Motion Creative Benchmarks 2026 (USD 1.290M de inversión, 578.750 creativos, ventana sep 2025 a ene 2026, página actualizada abr 2026, motionapp.com).
- Los rangos de hold rate que circulan (40 a 50% promedio, más de 60% "fuerte") solo aparecen citados de segunda mano, nunca en la fuente original. No los uses como número duro.
- Calibración obligatoria: el único benchmark que decide es el de TU cuenta. Dónde mirarlo: Ads Manager, vista de anuncios, agregá las columnas "Impresiones" y "Reproducciones de video de 3 segundos", exportá los últimos 30 anuncios, sacá la mediana. Esa es tu línea base.
- TikTok: en los videos con mayor CTR, más del 63% mostraba el mensaje central o el producto dentro de los primeros 3 segundos (TikTok for Business, "9 Creative Tips to drive performance", ads.tiktok.com/business/library).
- Largo del hook: TikTok y Reels se juegan en los primeros 1 a 3 segundos. Dicho a ritmo normal, eso son entre 6 y 12 palabras, y el techo de 12 es el que manda. Abajo de 9 pega más fuerte, pero un hook de 11 palabras que nombra el síntoma exacto gana contra uno de 7 que no dice nada.
- Primary text de Meta: Meta NO publica un número fijo de caracteres antes del "Ver más"; el corte depende del dispositivo y del tamaño de fuente del usuario. La industria usa ~125 caracteres como aproximación en feed móvil, pero es estimación, no límite oficial. Dónde mirarlo: en Ads Manager, "Vista previa del anuncio" en móvil, y contá dónde te corta a vos.
- Lectura cruzada de métricas: hook rate alto con hold rate bajo significa que el hook promete algo que el video no cumple, hay que reescribir los segundos 4 al 10, no el gancho. Hook rate bajo con buen CTR entre los que sí lo vieron significa que el problema es el primer cuadro visual, no el guion. Hook rate alto con CTR bajo significa que llamás la atención con algo que no tiene que ver con el producto, o sea clickbait. Hook rate y CTR normales con conversión baja significa que el creativo está bien y el problema es la landing, el precio o la oferta.`
