**F — 32/100** — Confianza: media

Hallazgos

| Severidad | Dónde | Problema | Fix | Esfuerzo |
|---|---|---|---|---|
| 🔴 Crítico | Above the fold – mobile | El ATC queda debajo del fold: quien entra desde un anuncio no ve el botón de compra sin hacer scroll | Sticky bar fija en el bottom con precio y "Agregar al carrito", visible desde el primer segundo | Bajo |
| 🔴 Crítico | Velocidad (Core Web Vitals) | 5.2s de carga según PageSpeed, más del doble del umbral de LCP (2.5s) | Convertí las imágenes del hero a WebP, comprimilas y activá lazy load en todo lo que esté debajo del fold | Medio |
| 🔴 Crítico | PDP – Trust signals | No hay reviews visibles: cero prueba social antes de que el visitante decida | Instalá un widget de reviews (rating + cantidad) junto al nombre del producto, arriba del fold | Medio |
| 🟡 Importante | Checkout – método de pago | No confirmaste si ofrecés contraentrega; en Colombia cubre 30-40% de los pedidos y su ausencia baja el CR | Sumala como opción si no la tenés, o hacela visible junto al ATC si ya existe | Bajo |

Los 3 de alto impacto y bajo esfuerzo

1. Fijá el ATC en una barra sticky en el bottom del mobile, con precio y botón "Agregar al carrito" siempre en pantalla. Con 1.6% de CR y el botón fuera del viewport, estás perdiendo la compra justo en el momento en que se decide.
2. Instalá el widget de reviews arriba del fold, con rating y cantidad de reseñas ("+X reseñas verificadas"). Reviews en PDP suman entre 12 y 18% en CR; hoy tenés cero.
3. Comprimí y convertí a WebP las imágenes del hero, activá lazy load debajo del fold. Cada segundo extra de carga resta 7% de conversión, y a 5.2s ya pasaste el punto donde el 53% de mobile abandona.

Tests

| Hipótesis | Métrica | Muestra mínima |
|---|---|---|
| El ATC sticky en mobile sube el Add to Cart | Add to Cart rate mobile | 300 conversiones a ATC por variante |
| Los reviews arriba del fold suben PDP → Purchase | PDP → Purchase rate | 400 sesiones de PDP por variante |
| Bajar el LCP a <2.5s sube el Add to Cart en mobile | Bounce rate + Add to Cart rate mobile | 500 sesiones mobile por variante |

Confianza: media. Asumí que ofrecés contraentrega en el checkout porque no lo confirmaste; si no la tenés, es un hallazgo crítico adicional.
