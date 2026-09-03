/**
 * La forma exacta que tiene que tener la respuesta de cada agente.
 *
 * `AgentDef.outputFormat` prometía esto ('markdown' | 'chat' | 'structured') pero
 * nunca lo cumplió: solo alimentaba una frase de expectativa en OutputPanel. Los
 * cuatro agentes marcados 'structured' devolvían la misma prosa que el resto.
 *
 * Un contrato acá no describe el contenido, describe el molde: qué secciones, en
 * qué orden, cuántas filas, qué está prohibido incluir. Es lo que separa una
 * respuesta que se escanea en diez segundos de un muro de texto que hay que leer
 * entero para encontrar las dos líneas útiles.
 *
 * Regla al escribir uno nuevo: si no podés contar las secciones con los dedos,
 * el contrato es demasiado laxo y el modelo va a rellenar con prosa.
 */

// Los prompts de dominio traen su propia sección "REGLAS DE OUTPUT", escrita
// cuando no existía esta capa. Varias de esas reglas describen formato y ahora
// compiten con el contrato. En vez de reescribir 271 bullets a mano y arriesgar
// perder reglas de negocio en el camino, se declara la precedencia: el contrato
// gana. Las reglas viejas siguen aportando el criterio de qué mirar.
//
// La línea de confianza vive acá y no solo en EVIDENCE_RULES porque el "Nada
// más" de abajo le ganaba: en la evaluación de septiembre de 2026, 23 de 28
// salidas la omitieron. Solo la escribían los contratos que la nombraban.
const CLOSING =
  'Última línea, siempre: "Confianza: alta | media | baja" (una de las tres), seguida de los\n' +
  'datos que asumiste si hubo alguno. Nada más después de eso. Sin introducción y sin conclusión.\n' +
  'Si alguna regla de más arriba contradice este formato, mandá este formato.'

export const OUTPUT_CONTRACTS: Record<string, string> = {
  // ---------------------------------------------------------------- copy
  'content-engine': `FORMATO DE SALIDA
1. Tabla de ideas: | # | Gancho | Ángulo | Formato | Por qué funciona |. Mínimo 5 filas.
   El gancho va literal, entre comillas, listo para grabar. Máximo 12 palabras.
2. Por cada una de las 3 mejores, un bloque de 4 líneas: HOOK / DESARROLLO / CIERRE / CTA.
   Cada línea es el texto real, no la descripción de lo que iría ahí.
3. "Hashtags": una línea, 3 de nicho + 3 medianos + 3 de alcance, separados por espacios.
4. "Publicá primero": una idea, con el motivo en media línea.
${CLOSING}`,

  'ugc-scripts': `FORMATO DE SALIDA
Por cada variación (2 o 3), en este orden:
1. Título: "Variación N — [ángulo de venta en 3 palabras]". Contá las tres antes de escribirlo.
2. Tabla: | Tiempo | Cámara | Diálogo |. Una fila por beat, del 0-3s al cierre.
   El diálogo va literal, como lo diría una persona. Sin acotaciones dentro de la celda.
   Nada de texto en otro idioma dentro del diálogo.
   Si el producto es suplemento, cosmético o dispositivo, ningún diálogo fija un plazo de
   resultado ni lo compara con un medicamento. El resultado se cuenta como escena vivida.
3. "Texto en pantalla": la frase del hook, máximo 40 caracteres.
4. "Producción": una línea con luz, props y locación. Sin viñetas. Cuando el rubro lo pide
   (suplemento, cosmético, alimento, dispositivo), esa línea incluye el aviso de compliance.
Cerrá con "Cuál grabar primero" en una línea.
${CLOSING}`,

  'caption-generator': `FORMATO DE SALIDA
1. Entre 3 y 5 captions, cada uno como bloque numerado con el framework entre paréntesis.
   El caption va completo y listo para pegar, respetando el largo de la plataforma.
   Separá la primera línea (el hook) del cuerpo con un salto de línea.
   Sin testimonios con nombre propio ni historias de clientas inventadas: la tensión
   narrativa va en segunda persona, hablándole a quien lee.
   Ningún atributo del producto que no venga del input: ni sabor, ni aroma, ni tiempo de
   acción, ni ingredientes.
   "Cartero" no existe en la contraentrega LATAM: quien entrega es un mensajero o un
   domiciliario.
2. Después de cada uno, una sola línea: "→ [por qué este engancha]". Máximo 15 palabras.
3. "Hashtags": una línea (solo si la plataforma es Instagram).
4. "El que yo publicaría": el número, y el motivo en media línea.
${CLOSING}`,

  'hook-writer': `FORMATO DE SALIDA
1. Tabla: | # | Hook | Tipo | Gatillo psicológico |. Mínimo 10 filas.
   El hook va literal, entre comillas, máximo 12 palabras, listo para decir en cámara.
   El gatillo en 2 o 3 palabras: curiosity gap, loss aversion, prueba social, pattern interrupt.
   Un hook lleva cifra solo si la cifra viene del input. Si no te la dieron, el hook se
   escribe sin cifra o con el hueco visible: "[tu cifra real] pedidos salieron esta semana".
   Prohibido "según estudios", "según la ciencia" y "el X% de".
   Ningún hook abre con "¿Sabías que", "¿Sabés", "Hola" ni "Hoy les traigo".
   Ningún hook ataca la categoría ni el formato que el usuario vende: si vende gomitas de
   10 mg, no escribís "las gomitas de 10 mg te arruinan el sueño".
2. "Top 3": los tres números, cada uno con una línea de por qué.
3. "Variantes A/B": del mejor, dos reescrituras. Cada una cambia una sola palabra o una sola
   variable, y dice cuál cambió.
${CLOSING}`,

  // ---------------------------------------------------------------- ads
  'meta-doctor': `FORMATO DE SALIDA
Paso 0, antes de escribir (no es una sección de la salida): cruzá los datos que te dieron.
   compras × precio contra gasto × ROAS; CPA × compras contra gasto;
   CPM = gasto / impresiones × 1000.
   Si no cuadran, el diagnóstico es "revisá el tracking (value del evento Purchase / CAPI)",
   la acción 1 es de medición y las otras 2 siguen siendo sobre la campaña, con las métricas
   que sí cuadran (CTR, frecuencia, CPM no dependen del value). Una campaña con frecuencia
   en rojo no se queda sin acción porque el tracking esté mal.
   El grado y el score se calculan sobre las métricas que cuadran; las que no, van en la
   tabla con Estado "⚪ no confiable" y sin desviación.
1. Una línea de encabezado: grado A-F y score /100. La confianza va solo en la última línea.
   Si los benchmarks están en USD y los datos vienen en COP o MXN, declará ahí mismo la TRM
   que usás ("TRM asumida 4.000") y compará ratios (CTR, ROAS, frecuencia, CVR) antes que
   valores absolutos.
2. Tabla: | Métrica | Tu valor | Benchmark | Estado |. Una fila por métrica que te pasaron.
   Estado es 🔴 / 🟡 / 🟢 más la desviación ("−53%", "3.9x"). Sin párrafos entre filas.
3. "Diagnóstico": UNA línea con la causa raíz. No la lista de síntomas: la causa.
4. "Próximas 48 horas": exactamente 3 acciones numeradas. Cada una arranca con un verbo
   en imperativo y contiene un número (presupuesto, umbral, cantidad).
   "Si X, entonces Y" no es una acción: es un condicional. Reescribilo como orden.
   Prohibido subir presupuesto de una campaña en learning o con frecuencia mayor a 3.
   Si eso es lo que te sale, la acción es otra.
5. "Qué me falta": solo si hay datos que cambiarían el diagnóstico. Máximo 3, en una línea.
${CLOSING}`,

  'ad-copy-generator': `FORMATO DE SALIDA
1. Tabla de variantes: | # | Ángulo | Headline | Texto principal | CTA |. Entre 3 y 5 filas.
   Todo el copy va literal y respeta los límites de caracteres de la plataforma.
   Cada celda de Headline y de Texto principal termina con su conteo de caracteres entre
   paréntesis: "(34)" y "(118/125)". Si el texto se pasa del límite, la celda trae la
   versión recortada, no la larga.
   Si el público abarca dos países, el precio va en las dos monedas o la variante declara
   a qué país le habla.
   CTA prohibidas por débiles: "Más información", "Enviar", "Empezar", "Haz clic aquí".
2. "Test A/B": las variantes 1 y 2 comparten texto principal y CTA; lo único que cambia es
   el headline. Que la tabla lo muestre, y nombrá la variable en una línea.
3. "Compliance": solo si el producto toca una Special Ad Category o hace una afirmación
   de resultado que Meta rechaza. Si no aplica, omití la sección entera.
   Va antes de "Empezá con", siempre.
4. "Empezá con": el número, con el motivo en media línea. Se elige entre las variantes que
   pasaron Compliance.
${CLOSING}`,

  'audience-analyzer': `FORMATO DE SALIDA
1. Entre 2 y 3 buyer personas. Cada una es una tabla de dos columnas con estas filas
   exactas: Nombre y edad | Situación hoy | Qué ya probó | Por qué falló | Objeción #1 |
   Qué la desbloquea | Dónde la encontrás.
   "Qué ya probó" y "Por qué falló" son obligatorias: sin eso es un estereotipo, no una persona.
2. "Segmentación en Meta": tabla | Persona | Intereses | Exclusiones | Presupuesto sugerido |.
3. "A cuál le hablo primero": una, con el motivo en media línea.
${CLOSING}`,

  'ad-creative-planner': `FORMATO DE SALIDA
1. Tabla de briefs: | # | Concepto | Formato | Layout | Copy on-image | Prompt de imagen |.
   El copy on-image respeta la jerarquía de caracteres. El prompt va listo para pegar.
2. Por cada concepto, un bloque "Bloques": headline / subhead / badge / CTA, con el texto real.
3. "Volumen": cuántos creativos distintos necesita la cuenta y en cuántas semanas.
4. "Cuál producir primero": uno, con el motivo en media línea.
${CLOSING}`,

  'ads-auditor': `FORMATO DE SALIDA
1. Encabezado: grado A-F y score /100. La confianza va solo en la última línea.
2. Tabla de hallazgos: | Severidad | Área | Hallazgo | Acción | Plazo |.
   Severidad es 🔴 Crítico / 🟡 Alto / 🟢 Medio / ⚪ Bajo. Ordenada por severidad.
   El hallazgo es un hecho con número, no una impresión.
3. "Los 3 de esta semana": tres acciones numeradas, con el impacto estimado en una línea.
4. "Qué no pude auditar": las áreas sin datos suficientes. Una línea.
${CLOSING}`,

  // ---------------------------------------------------------------- research
  'product-hunter': `FORMATO DE SALIDA
1. Tabla de scoring: | Criterio | Puntaje /10 | Por qué |. Los 12 criterios, uno por fila.
   El "por qué" cita el dato que te dieron. Si no te lo dieron, escribí "sin dato" y puntuá 0.
2. Una línea: "Total: X/120 — [Ganador | Dudoso | Descartar]".
3. "Los 3 riesgos": tabla | Riesgo | Probabilidad | Cómo lo verificás antes de invertir |.
4. "Veredicto": una línea. Si es "Dudoso", decí exactamente qué dato lo definiría.
Sobre los criterios sin dato: no los estimes. Un 0 honesto vale más que un 7 inventado.
${CLOSING}`,

  'competitor-watch': `FORMATO DE SALIDA
1. Tabla comparativa: | | Vos | Competidor A | Competidor B |. Filas: Oferta | Precio |
   Ángulo de copy | Prueba social | Envío | Garantía | Método de pago.
   Solo llená lo que te dieron o lo que sea públicamente verificable. Lo demás: "sin dato".
2. "El hueco": una línea con lo que ninguno está haciendo y vos podés hacer.
3. "Cómo te diferenciás": exactamente 3 movimientos, cada uno con el cambio concreto.
4. "Qué mirar vos mismo": qué revisar en su tienda o su biblioteca de anuncios.
${CLOSING}`,

  'niche-analyzer': `FORMATO DE SALIDA
1. Tabla: | Dimensión | Evaluación | Puntaje /10 |. Filas: Demanda | Competencia |
   Margen | Estacionalidad | Barrera de entrada | Recurrencia | Riesgo de plataforma.
2. Una línea: "Total: X/70 — [Entrar | Entrar con reservas | No entrar]".
3. "Sub-nichos": tabla | Sub-nicho | Por qué es más fácil | Producto de entrada |. 3 filas.
4. "Antes de invertir, verificá": 3 datos concretos y dónde se miran.
No inventes volúmenes de búsqueda ni tamaños de mercado. Si no los tenés, decilo.
${CLOSING}`,

  // ---------------------------------------------------------------- ugc
  'image-prompts': `FORMATO DE SALIDA
Entre 5 y 8 prompts. Cada uno:
1. Título de una línea: "N. [qué muestra la imagen]".
2. El prompt en bloque de código, en inglés, listo para pegar. Sin explicación adentro.
3. Una línea debajo: "→ [para qué sirve: hero, PDP, ad de retargeting...]".
Cerrá con "Parámetros": aspect ratio y ajustes recomendados para el modelo pedido.
${CLOSING}`,

  'broll-generator': `FORMATO DE SALIDA
1. Tabla de shot list: | # | Plano | Qué se ve | Duración | Movimiento | Para qué beat |.
   "Qué se ve" es concreto y grabable: objeto, acción y encuadre. No conceptos.
2. "Equipo": una línea con lo mínimo para grabarlo (teléfono, trípode, luz).
3. "Orden de grabación": los números agrupados por locación, para no repetir montaje.
${CLOSING}`,

  'ad-image-prompter': `FORMATO DE SALIDA
Por cada concepto (mínimo 3):
1. Título: "N. [concepto en 3 palabras] — [formato y medidas]".
2. Prompt en bloque de código, en inglés, listo para pegar.
3. Tabla de texto sobre la imagen: | Bloque | Texto | Caracteres |. Filas: headline,
   subhead, badge, CTA. El texto va literal y respeta el límite de cada bloque.
4. "Zona segura": una línea con qué no puede quedar tapado por la UI de la plataforma.
${CLOSING}`,

  // ---------------------------------------------------------------- ecommerce
  'shopify-assistant': `FORMATO DE SALIDA
1. "Respuesta": máximo 3 líneas. La solución, no el contexto.
2. "Pasos": lista numerada con la ruta exacta de la interfaz de Shopify
   (Configuración → Pagos → ...) o el código en bloque.
3. "Ojo con": una línea, solo si hay algo que rompe si se hace mal. Si no, omitila.
Si la pregunta se resuelve en una línea, respondé en una línea y terminá.
${CLOSING}`,

  'logistics-tracker': `FORMATO DE SALIDA
1. Tabla: | Transportadora | Cobertura | Plazo | Contraentrega | Costo estimado |.
   Solo transportadoras reales del país indicado. Los plazos salen de tu conocimiento
   del mercado, no de una estimación inventada: si no lo sabés, "sin dato".
2. "Recomendación": una, con el motivo en una línea.
3. "Qué le prometés al cliente": la línea exacta de copy para la página de producto,
   con fecha calculada, no con "3 a 5 días".
${CLOSING}`,

  'supplier-finder': `FORMATO DE SALIDA
1. Tabla de opciones: | Canal | Cómo funciona | MOQ típico | Plazo | Riesgo principal |.
   Canal es la plataforma real (1688, AliExpress, CJ, Dropi, proveedor local).
   PROHIBIDO inventar precios, ratings o nombres de proveedores puntuales. Si no lo sabés
   con certeza, la celda dice "verificalo vos" y el paso 4 dice cómo.
   MOQ y Plazo se llenan con lo que dice tu base de conocimiento. Si ahí hay un rango o una
   regla, va en la celda. Si no hay nada, la celda lleva un valor asumido y marcado, más dónde
   confirmarlo: "15 a 30 días (asumido; confirmalo en el campo Lead time de la ficha)".
   Una celda que solo dice "verificalo vos" no sirve para elegir canal. Lo que sigue prohibido
   es el número sin marca de supuesto.
2. "Estructura de costo": tabla | Concepto | Cómo se calcula |. Filas: producto, envío,
   impuestos, pasarela, devoluciones. Fórmulas, no cifras inventadas.
3. "Negociación": 3 movimientos concretos, cada uno con la frase textual a mandar.
4. "Verificá antes de pagar": 4 chequeos, cada uno con dónde se mira.
   Si el producto es suplemento, alimento, cosmético o dispositivo, el primero de los cuatro
   es el registro sanitario del país destino, con el organismo por nombre.
5. "Recomendación": UN canal, no dos. El motivo va atado al volumen mensual y al destino que
   te dieron, y cierra con qué hace el usuario esta semana.
${CLOSING}`,

  'product-descriptions': `FORMATO DE SALIDA
1. "Corta (~150 palabras)": la descripción lista para pegar. Sin encabezado interno.
2. "Larga (~300 palabras)": la descripción lista para pegar, con subtítulos si aplica.
3. Tabla de bullets: | Beneficio | Característica que lo sostiene |. Entre 4 y 6 filas.
   El beneficio lidera con el resultado, no con la especificación técnica.
4. "Ficha técnica": las specs en tabla de dos columnas.
5. "SEO": title tag (máx 60 car.) y meta description (máx 155 car.), literales.
${CLOSING}`,

  'shopify-section-builder': `FORMATO DE SALIDA
1. El archivo .liquid completo en un solo bloque de código. Sin recortes ni "...".
   El schema va incluido y válido.
2. "Instalación": 3 líneas con la ruta exacta del archivo y cómo se agrega desde el editor.
3. "Settings": tabla | Setting | Tipo | Default |. Solo los que el comerciante va a tocar.
4. "Defaults": una línea confirmando que ninguna sección queda vacía con placeholder genérico.
La explicación va DESPUÉS del código, nunca antes, y no supera las 10 líneas.
${CLOSING}`,

  'landing-page-builder': `FORMATO DE SALIDA
1. Tabla de estructura: | # | Sección | Objetivo | Copy del headline |. En orden de scroll.
   El headline va literal, listo para pegar.
2. Por cada sección, un bloque con el copy completo: headline, subhead, bullets, CTA.
3. "Prueba social": dónde va cada tipo (reseñas, logos, testimonios) y con qué formato.
4. "Checklist de lanzamiento": 5 chequeos, cada uno verificable en un minuto.
${CLOSING}`,

  // ---------------------------------------------------------------- analytics
  'performance-tracker': `FORMATO DE SALIDA
1. Tabla: | Métrica | Período actual | Período anterior | Δ | Estado |.
   Δ con signo y porcentaje. Estado en 🔴 / 🟡 / 🟢.
2. "Qué se movió": UNA línea con el cambio que explica el resto. La causa, no la lista.
3. "Acciones": exactamente 3, numeradas, cada una con un número.
${CLOSING}`,

  'roi-calculator': `FORMATO DE SALIDA
1. Tabla de entrada: | Variable | Valor | Origen |. Origen dice "dato tuyo" o "asumido".
   Toda variable asumida va marcada. Sin excepciones.
2. Tabla de resultados: | Métrica | Valor |. Filas: CPA, ROAS, margen unitario,
   punto de equilibrio, ganancia proyectada.
3. "Escenarios": tabla | | Pesimista | Base | Optimista |, con las 3 métricas que importan.
4. "El número que manda": una línea con la variable de la que depende todo.
Mostrá la fórmula de cada resultado en la propia celda o en una línea debajo de la tabla.
${CLOSING}`,

  // ---------------------------------------------------------------- strategy
  'business-planner': `FORMATO DE SALIDA
1. "Tesis": 2 líneas. Qué vendés, a quién, y por qué te van a comprar a vos.
2. Tabla de unit economics: | Concepto | Valor | Cómo se calcula |.
3. Tabla de fases: | Fase | Semanas | Objetivo medible | Inversión |. Máximo 4 fases.
   El objetivo es un número, no una intención ("100 ventas", no "validar el mercado").
4. "Los 3 supuestos que te pueden matar": cada uno con cómo lo validás y en cuánto tiempo.
${CLOSING}`,

  'launch-checklist': `FORMATO DE SALIDA
1. Tabla por bloque: | ✓ | Ítem | Por qué importa | Tiempo |.
   Bloques en este orden: Producto, Tienda, Tracking, Creativos, Campañas, Post-lanzamiento.
   Cada ítem es verificable: se puede responder sí o no mirando la pantalla.
2. "Bloqueantes": los ítems sin los cuales no se lanza. Máximo 5.
3. "Volumen de creativos": cuántos distintos necesitás según la plataforma.
${CLOSING}`,

  'campaign-architect': `FORMATO DE SALIDA
1. Tabla de estructura: | Campaña | Objetivo | Ad sets | Presupuesto/día | Audiencia |.
2. "Reparto": una línea con el mix prospecting / retargeting y el porcentaje de cada uno.
3. Tabla de escalado: | Umbral | Qué hacés | Cuánto subís |. Reglas, no consejos.
4. "Reglas de corte": cuándo pausás, con el número exacto que lo dispara.
5. "Presupuesto mínimo viable": una línea. Si el que te dieron no alcanza, decilo primero.
${CLOSING}`,

  // ---------------------------------------------------------------- cro
  'cro-auditor': `FORMATO DE SALIDA
1. Encabezado: grado A-F y score /100. La confianza va solo en la última línea.
2. Tabla de hallazgos: | Severidad | Dónde | Problema | Fix | Esfuerzo |.
   Dónde es la sección concreta (hero, PDP, checkout paso 2). Ordenada por severidad.
3. "Los 3 de alto impacto y bajo esfuerzo": numerados, con el cambio exacto a hacer.
4. "Tests": tabla | Hipótesis | Métrica | Muestra mínima |. Máximo 3.
${CLOSING}`,

  'landing-optimizer': `FORMATO DE SALIDA
1. Tabla sección por sección: | Sección | Qué falla | Fix | Impacto |. En orden de scroll.
2. "Copy nuevo": bloque con headline, subhead y CTA reescritos, literales y listos para pegar.
3. "Los 3 primeros": numerados, cada uno con el cambio concreto y en qué archivo o sección.
4. "Qué medir": la métrica que debería moverse y en cuánto tiempo.
${CLOSING}`,
}

/** El contrato del agente, o vacío si todavía no tiene uno. */
export function outputContract(slug: string): string {
  return OUTPUT_CONTRACTS[slug] ?? ''
}
