Grado: F | Score: 37/100

| Severidad | Dónde | Problema | Fix | Esfuerzo |
|---|---|---|---|---|
| 🔴 | PDP – carga de página | 5.2s en PageSpeed, casi el doble del umbral de abandono mobile (53% se va después de 3s) y muy por encima del LCP objetivo de 2.5s | Comprime las imágenes a WebP, activa lazy load en todo lo que quede debajo del fold y precarga la fuente principal | Medio |
| 🔴 | Hero mobile – ATC | El botón de agregar al carrito no aparece en el viewport inicial en mobile; el ATC sticky tiene que estar siempre visible porque cada scroll sin CTA a la vista es una oportunidad de conversión perdida | Saca el botón del bloque estático y fíjalo en la parte baja del viewport (bottom bar) con la variante seleccionada y el precio, visible sin hacer scroll | Bajo |
| 🔴 | PDP – sección de reviews | No hay reviews visibles en la página de producto; sin prueba social se frena la etapa de PDP → Add to Cart, que en el benchmark corre entre 8% y 15% | Sube un bloque de reviews con rating real y cantidad de reseñas, debajo de la galería y antes del botón de compra | Medio |
| 🟡 | PDP – botón de compra | No mencionaste sellos de pago ni contraentrega junto al ATC; en Colombia la contraentrega mueve entre 30% y 40% de los pedidos | Suma los íconos de PSE, Nequi y contraentrega justo debajo del botón de compra | Bajo |
| 🟡 | PDP – global (flotante) | No mencionaste WhatsApp flotante; en Colombia es el canal que captura las preguntas que el FAQ no resuelve antes del checkout | Coloca un ícono flotante de WhatsApp con enlace directo a tu número (wa.me), visible en toda la PDP | Bajo |

Los 3 de alto impacto y bajo esfuerzo:
1. Sticky ATC en mobile: saca el botón del bloque estático y fíjalo en la parte baja del viewport, con la variante seleccionada y el precio, visible sin hacer scroll.
2. Sellos de pago + contraentrega junto al ATC: agrega los íconos de PSE, Nequi y contraentrega justo debajo del botón de compra.
3. WhatsApp flotante: coloca el ícono con enlace directo a tu número, visible en toda la PDP.

Tests:

| Hipótesis | Métrica | Muestra mínima |
|---|---|---|
| El ATC sticky en mobile sube el add-to-cart rate | Add-to-cart rate mobile | ~1.000 sesiones mobile por variante (asumido, no me diste el tráfico actual) |
| El bloque de reviews sube la tasa PDP → Add to Cart | PDP → Add to Cart rate | ~1.000 sesiones por variante (asumido) |
| Bajar el LCP de 5.2s a menos de 2.5s sube la conversión de la PDP | Conversion rate PDP → Purchase | ~1.500 sesiones por variante (asumido, dado el CR actual de 1.6%) |

Confianza: media. Asumí que no hay sellos de pago ni WhatsApp visible en la PDP porque no los mencionaste, y asumí entre 1.000 y 1.500 sesiones por variante como muestra mínima de los tests porque no me diste el tráfico actual.
