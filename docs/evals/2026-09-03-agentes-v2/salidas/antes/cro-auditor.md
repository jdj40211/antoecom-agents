**D | 42/100 | Confianza: baja**

| Severidad | Dónde | Problema | Fix | Esfuerzo |
|---|---|---|---|---|
| 🔴 | PDP mobile, ATC | El botón de agregar al carrito queda fuera del viewport inicial | Barra sticky en el bottom (56px) con variante seleccionada y precio, fija en todo el scroll | Baja |
| 🔴 | PDP, velocidad | 5.2s de carga según PageSpeed, casi el doble del umbral de 3s en 4G donde el 53% de los usuarios abandona | Comprimí las fotos del PDP a WebP y activá lazy load en las que están fuera del viewport inicial, con una app de optimización automática | Baja |
| 🔴 | PDP, trust | Cero reviews visibles en la página de producto | Instalá un widget de reviews (rating + cantidad) debajo de la galería de fotos, arriba del fold en mobile | Baja |

**Los 3 de alto impacto y bajo esfuerzo**
1. Sticky ATC en mobile: barra fija de 56px en el bottom con precio y botón "Agregar al carrito", visible en cada scroll del PDP.
2. WebP + lazy load en las fotos del PDP: bajá el peso de página sin tocar el layout, con una app de compresión automática.
3. Widget de reviews debajo de la galería: mínimo 3 reseñas con nombre real, rating y cantidad total visibles.

**Tests**
| Hipótesis | Métrica | Muestra mínima |
|---|---|---|
| El ATC sticky en mobile sube el add-to-cart rate | Add to Cart rate mobile | 6.270 sesiones mobile por variante (asumiendo ATC rate base 10%, MDE 15% relativo) |
| El widget de reviews sube el add-to-cart rate del PDP | Add to Cart rate PDP | 3.530 sesiones por variante (asumiendo ATC rate base 10%, MDE 20% relativo) |
| Bajar el LCP con WebP y lazy load sube la conversión PDP → compra | Conversión PDP → compra | 24.100 sesiones por variante (base CR 1.6%, MDE 20% relativo) |
