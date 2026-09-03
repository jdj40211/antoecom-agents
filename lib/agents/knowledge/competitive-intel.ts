// Knowledge base del agente competitor-watch.
// Qué expone y qué no cada fuente pública, y cómo interpretar las señales.
// Fuentes: transparency.meta.com/policies/ad-standards y about.fb.com (consultados sep 2026),
// ads.tiktok.com/business/creativecenter, shopify.dev/docs/api/ajax y hilos de community.shopify.com (sep 2026).

export const COMPETITOR_SOURCES = `FUENTES PÚBLICAS DE INTELIGENCIA COMPETITIVA (sep 2026):

META AD LIBRARY (facebook.com/ads/library)
- Muestra: el creativo completo (imagen, video, carrusel), texto primario, titular, CTA, nombre y logo de la página, fecha de inicio del anuncio, si sigue activo, y las variantes del creativo agrupadas bajo un mismo anuncio.
- NO muestra gasto, impresiones, alcance ni demografía para anuncios comerciales. Esos campos existen únicamente para anuncios de temas sociales, elecciones o política, que además se archivan 7 años (transparency.meta.com/policies/ad-standards, consultado sep 2026). Si alguien te dice el presupuesto de un competidor "según la Ad Library", está inventando.
- Cómo filtrar: seleccioná el país en el selector superior, elegí la categoría "Todos los anuncios" (no "Temas sociales, elecciones o política") y buscá por nombre de la página o por palabra clave del texto del anuncio.
- Desde el 6 de octubre de 2025 Meta dejó de correr anuncios políticos y de temas sociales en la Unión Europea (about.fb.com, jun 2024 actualizado oct 2025). Los anuncios comerciales no cambiaron.

TIKTOK CREATIVE CENTER (ads.tiktok.com/business/creativecenter)
- "Top Ads" lista anuncios destacados y expone por anuncio: likes, CTR y nivel de presupuesto en categorías, no gasto exacto (verificado sobre el sitio en sep 2026).
- Filtrá por región e industria para acotar a tu país. Guardar anuncios y ver Keyword Insights completo pide una cuenta de negocio gratuita.
- No expone ROAS, CPA ni inversión real de ningún anunciante.

TIENDA SHOPIFY SIN HERRAMIENTAS DE PAGO
- dominio.com/products.json: catálogo en JSON con título, handle, descripción, variantes, precios e imágenes. Devuelve 30 productos por defecto y hasta 250 con ?limit=250. Shopify aclara que no reemplaza a la Admin API y que no soporta paginación oficialmente, así que puede venir incompleto o estar deshabilitado (community.shopify.com, hilos vigentes sep 2026).
- dominio.com/collections/all: página autogenerada con todo el catálogo. El comerciante puede redirigirla, así que un 404 no prueba nada.
- dominio.com/products/HANDLE.js y dominio.com/cart.js: forman parte de la Ajax API documentada de Shopify (shopify.dev/docs/api/ajax). El primero devuelve el producto con hasta 250 variantes y precios en la moneda del visitante.
- Consola del navegador: escribí Shopify y mirá el objeto global. Suele traer shop, currency y theme. Verificá en la tienda concreta qué campos trae antes de citarlos, porque depende del tema.
- Apps instaladas: en el código fuente, buscá comentarios del tipo "BEGIN app block" y scripts alojados en dominios de terceros. Es una señal parcial, no un inventario completo.
- Contraentrega y Dropi: la señal confiable está en el checkout, no en el HTML. Agregá un producto al carrito y avanzá: si aparece "Pago contra entrega" como método, o el formulario pide cédula y dirección sin pedir tarjeta, opera contraentrega.

GOOGLE Y HERRAMIENTAS GRATUITAS
- site:dominio.com/products/ lista las páginas de producto indexadas: sirve para estimar tamaño de catálogo y ver qué empuja.
- Google Shopping: buscá el nombre exacto del producto para ver el rango de precios de quienes lo venden en tu país.
- SimilarWeb y Wappalyzer dan datos gratis limitados (rango de tráfico, stack tecnológico). Los límites del plan gratuito cambian seguido: verificá el día que los uses en lugar de citar un número de memoria.`

export const COMPETITOR_SIGNALS = `REGLAS DE INTERPRETACIÓN (qué significa cada señal):
- Anuncio activo más de 30 días en Meta Ad Library: ganador probable. Nadie paga un mes entero de un anuncio que pierde plata. Tomá la fecha de inicio que muestra la biblioteca y restala de hoy.
- 5 o más versiones del mismo anuncio bajo una misma entrada: están iterando ese ángulo, o sea que el ángulo funciona y están puliendo la ejecución. Copiá el ángulo, no el creativo.
- Anuncio que arrancó y desapareció en menos de 7 días: lo mataron. No lo uses como referencia de nada.
- Comparar precios sin envío es inútil. Sumá siempre precio de lista más envío más recargo de contraentrega. En Colombia el flete contraentrega mueve el precio final más que casi cualquier descuento del competidor.
- Solo video: compran en Reels y TikTok y su costo por resultado depende de retención. Solo imagen estática: suelen estar en feed y retargeting, o no tienen capacidad de producción. Mix de ambos con muchas variantes: tienen equipo creativo, no les ganás por volumen, ganales por ángulo.
- Volumen relativo sin datos, tres proxies: cantidad de anuncios activos simultáneos en la Ad Library, reseñas nuevas por semana en su tienda o en su ficha de Google, y frecuencia de posteo en Instagram y TikTok. Medí los tres el mismo día de cada semana y comparás tendencia, no número absoluto.
- Producto nuevo en /products.json con publicación reciente: están testeando. Si a las 4 semanas sigue ahí y además tiene anuncios activos, les funcionó.
- Suben el precio y lo sostienen: margen sano o demanda que aguanta. Lo bajan con "últimas unidades": suele ser inventario parado.
- Lo que NO se puede saber desde afuera: ROAS, CPA, CAC, margen, tasa de devolución, inventario real y rentabilidad. Si el análisis necesita alguno de esos, escribilo como incógnita en vez de estimarlo. Una estimación inventada del ROAS ajeno termina rompiendo la decisión de precio propia.`
