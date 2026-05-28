export const TEXT_HIERARCHY = `JERARQUÍA DE TEXTO EN CREATIVOS PUBLICITARIOS:

Cada ad tiene bloques de texto con jerarquía visual y límites de caracteres:

- HEADLINE: Grande, captura atención inmediata. Max ~40 caracteres
- SUBHEADLINE: Mensaje de soporte o clarificación. Max ~60 caracteres
- BODY: Contenido descriptivo, beneficios expandidos. Max ~120 caracteres
- CTA: Botón o call-to-action. Max ~20 caracteres (ej: "Comprar ahora", "Ver más")
- BENEFIT: Beneficio clave del producto, corto y punchy. Max ~30 caracteres
- PRICE: Información de precio. Formato: "$XX.XXX" o "Desde $XX"
- DISCOUNT: Porcentaje o valor de descuento. Formato: "30% OFF" o "Ahorra $20.000"
- BADGE: Labels cortos promocionales. Max ~15 caracteres (ej: "Nuevo", "Más vendido")

REGLAS DE COPY POR BLOQUE:
- Cada bloque debe funcionar independiente (se lee de arriba a abajo)
- El headline debe tener sentido sin necesidad del subheadline
- El CTA debe ser una acción clara y urgente
- Los beneficios deben ser específicos (no "alta calidad", sino "100% algodón orgánico")`

export const AD_SIZES = `TAMAÑOS ESTÁNDAR DE CREATIVOS:

INSTAGRAM:
- Feed cuadrado: 1080 x 1080 px (ratio 1:1)
- Feed vertical: 1080 x 1350 px (ratio 4:5, recomendado)
- Stories/Reels: 1080 x 1920 px (ratio 9:16)
- Carousel: 1080 x 1080 px por slide

FACEBOOK:
- Feed: 1200 x 628 px (ratio 1.91:1)
- Feed cuadrado: 1080 x 1080 px
- Stories: 1080 x 1920 px
- Marketplace: 1200 x 628 px

TIKTOK:
- In-feed: 1080 x 1920 px (ratio 9:16, obligatorio vertical)
- Spark Ads: mismo formato que contenido orgánico

GOOGLE:
- Display responsive: 1200 x 628, 1200 x 1200, 960 x 1200
- Banner: 728 x 90, 300 x 250, 160 x 600
- Discovery: 1200 x 628 (landscape), 1200 x 1200 (square)`

export const LAYOUT_COMPOSITIONS = `COMPOSICIONES DE LAYOUT PARA ADS:

1. PRODUCTO CENTRADO:
   Producto al centro del canvas, texto arriba y/o abajo.
   Ideal para: producto hero, lanzamientos, producto único.
   Espacio de texto: 30% arriba, 20% abajo

2. SPLIT HORIZONTAL:
   Producto en un lado (50 a 60%), copy en el otro (40 a 50%).
   Ideal para: beneficios listados, comparaciones antes/después.
   Producto generalmente a la derecha (lectura occidental izq→der)

3. PRODUCTO HERO CON OVERLAY:
   Producto grande de fondo, texto en overlay con contraste (sombra o caja semitransparente).
   Ideal para: lifestyle, premium, emocional.
   Texto máximo 3 líneas para no obstruir el visual

4. GRID DE BENEFICIOS:
   Producto arriba (40%), 2 a 4 beneficios en grid abajo (60%).
   Ideal para: productos funcionales, suplementos, tech.
   Cada beneficio: ícono + texto corto (max 15 palabras)

5. TESTIMONIAL:
   Quote de cliente + foto del producto + avatar/nombre persona.
   Ideal para: social proof, retargeting, reactivación.
   Quote en itálica, max 2 líneas

6. ANTES/DESPUÉS:
   Split vertical o diagonal mostrando transformación.
   Ideal para: skincare, fitness, limpieza, organización.
   Etiquetar claramente "Antes" / "Después"`

export const IMAGE_PROMPT_PATTERNS = `PATRONES DE PROMPTS PARA GENERACIÓN DE IMÁGENES DE ADS:

PROMPT DE ESCENA (para fondos/lifestyle):
"A [adjetivo] [entorno] with [iluminación], [composición], product placement area on [posición], [paleta de color], [mood], commercial photography style, 8k, sharp focus"

PROMPT DE FONDO LIMPIO (para producto centrado):
"Clean [color] gradient background, subtle [textura], professional product photography lighting, studio setup, soft shadows, [mood], minimalist"

PROMPT DE LIFESTYLE (para contexto de uso):
"[Persona] using/wearing [producto] in [escenario], [iluminación natural], candid photography, [emoción], lifestyle brand aesthetic, shallow depth of field"

NEGATIVE PROMPTS (siempre incluir):
"text, watermark, logo, blurry, low quality, distorted, cropped, frame, border, cartoon, illustration, 3d render, deformed hands, extra fingers"

NOTAS:
- Prompts de imagen SIEMPRE en inglés (las IAs de imagen funcionan mejor)
- Incluir aspect ratio según el formato del ad
- Para Midjourney agregar: --ar 1:1 --s 250 --q 2
- Para DALL-E: ser más descriptivo, no usa parámetros
- Para Flux: prompt corto y directo funciona mejor`

export const CREATIVE_VOLUME = `VOLUMEN CREATIVO REQUERIDO POR PLATAFORMA:

META ADS (Advantage+):
- 150+ creativos en la campaña para máximo rendimiento de Andromeda
- Mínimo 25 creativos genuinamente distintos (no solo variaciones de color)
- Refresh: cada 2 a 4 semanas rotar al menos 5 nuevos creativos
- Mix: 60% imágenes estáticas + 30% video + 10% carousel

META ADS (Standard):
- 5+ creativos por ad set mínimo
- Refresh: cada 2 a 4 semanas
- No más de 6 ad sets activos por campaña (evitar fragmentación)

TIKTOK ADS:
- 6+ creativos por ad group mínimo
- Refresh: cada 5 a 7 días (fatigue es rapidísima)
- 100% video (vertical 9:16, sound-on)
- Spark Ads: usar contenido orgánico que ya tenga tracción

GOOGLE PMAX:
- Por asset group: mínimo 5 headlines + 5 descriptions + 20 imágenes + 5 videos
- Refresh: cada 4 a 8 semanas
- Incluir variedad de formatos (landscape, square, portrait)

REGLA GENERAL:
- Producir 2x más creativos de lo que necesitas (50% no performarán)
- Cada 2 semanas deberías tener al menos 3 a 5 nuevos conceptos
- Un "concepto" es un ángulo creativo distinto, no solo un crop diferente`
