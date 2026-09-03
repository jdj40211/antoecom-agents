# Auditoría comparativa antes → después (revisor en contexto fresco)

**Cuenta: 12 mejor · 5 igual · 11 peor.**

- mejor (12): ad-copy-generator, ads-auditor, competitor-watch, content-engine, hook-writer, landing-page-builder, meta-doctor, product-descriptions, roi-calculator, shopify-assistant, supplier-finder, ugc-scripts.
- igual (5): ad-image-prompter, broll-generator, launch-checklist, niche-analyzer, product-hunter.
- peor (11): ad-creative-planner, audience-analyzer, business-planner, campaign-architect, caption-generator, cro-auditor, image-prompts, landing-optimizer, logistics-tracker, performance-tracker, shopify-section-builder.

Los 6 agentes tocados a mano (knowledge, contrato apretado, few-shot) salieron 5 mejor y 1 peor. Los 22 que solo recibieron los gates compartidos salieron 7 mejor, 5 igual y 10 peor: el daño está en la capa transversal.

Costo: 14.254 → 16.232 palabras (+13,9%). Mayores crecimientos: competitor-watch +102%, shopify-assistant +84%, roi-calculator +58%, supplier-finder +50%, ad-copy-generator +47%. Mayor contracción: landing-optimizer −49%, y es una de las regresiones grandes.

## Las 5 regresiones más importantes

1. **ad-creative-planner: 3 de 5 prompts de imagen sin producto.** "product placement area at center" en vez de "a compact portable drip coffee maker on a light marble surface". Contrato obedecido, contenido vaciado.
2. **business-planner: el plan se quedó sin margen.** "Costo de producto (Dropi) | Consultalo en tu panel" y "Punto de equilibrio | Costo Dropi + comisión + flete + CPA ≤ COP 84.900". Antes: margen bruto COP 53.106 y neto COP 7.074. Y sigue inventando PVP y CPA: la negativa es arbitraria.
3. **Registro mezclado dentro del copy publicable** (caption-generator, landing-optimizer, ad-creative-planner; en menor grado content-engine, competitor-watch, performance-tracker, campaign-architect, landing-page-builder). Peor cita: "Elige tu talla con nuestra guía y paga contraentrega si preferís confirmar antes de pagar." El gate REGISTRO cubría solo el copy, y los títulos de contrato en voseo ("Empezá con", "Publicá primero") forzaban la mezcla.
4. **cro-auditor: muestras de test redondas e inventadas.** "400 sesiones de PDP por variante" con CR 1,6% son ~6 conversiones. Antes: "6.270 sesiones mobile por variante (ATC base 10%, MDE 15%)". Más tres lifts sin origen ("Reviews en PDP suman entre 12 y 18% en CR").
5. **Los agentes de decisión dejaron de decidir** (launch-checklist perdió la fecha objetivo y los responsables; meta-doctor entrega tres tareas de tracking con frecuencia 3.8 en rojo; performance-tracker borró la única acción sobre presupuesto).

## Las 3 fallas que persisten en más agentes

1. **Cifra inventada con forma de dato: 16/28 → 17/28.** Reaparece en categorías nuevas, muchas veces entrando por el CHEQUEO LATAM: la tasa de rechazo de contraentrega se inventa distinta en cada agente (0% roi-calculator, 30-40% product-hunter, 32% business-planner, 35% campaign-architect).
2. **Sección o celda presente pero vacía:** supplier-finder (6 de 10 celdas MOQ/plazo en "verificalo vos"), business-planner (unit economics), landing-optimizer (Impacto reducida a emojis), competitor-watch (14/14 celdas "Sin dato" con 3 movimientos igual). La regla de no inventar se leyó como permiso para no contestar.
3. **Registro equivocado o mezclado: 12 agentes.** Voseo íntegro con país Colombia en cro-auditor, business-planner, supplier-finder, niche-analyzer, shopify-assistant, logistics-tracker; mezcla en otros 9.

Menores: `Confianza` duplicada en meta-doctor, ads-auditor, cro-auditor (encabezado + CLOSING); `Confianza: alta` mal calibrada en logistics-tracker, supplier-finder, ugc-scripts, shopify-section-builder.

## Corregido por agente (resumen)

- ad-copy-generator: compliance antes de elegir; conteo por celda sin violaciones; A/B real; usted para 45-65. Persiste: cambio de talla ausente; México sin precio. Empeoró: tono aspiracional perdido; texto operativo en voseo.
- meta-doctor: detecta el descuadre 38 × 149.900 vs ROAS 1.4; calcula CPM; TRM declarada; ya no sube presupuesto en learning. Empeoró: sin acción sobre la campaña; grado sobre datos invalidados; Confianza duplicada.
- supplier-finder: CJ y Dropi descritos bien; INVIMA primero; umbrales DIAN con fuente; vuelve "Recomendación". Empeoró: 6 de 10 celdas en "verificalo vos"; recomienda Alibaba con plazo desconocido y Confianza alta.
- hook-writer: cero estadísticas inventadas; A/B de una palabra. Empeoró: un hook es placeholder "[tu cifra real]"; taxonomía calcada del knowledge con "Orden inversa" repetida.
- caption-generator: sin testimonio con nombre, sin sabor inventado, sin "cartero". Empeoró: voseo + tuteo dentro de cada caption; los 4 dicen lo mismo ("rutina de noche"); −32% palabras.
- ugc-scripts: sin "Until until", sin plazo terapéutico, títulos de 3 palabras, compliance INVIMA. Empeoró: el "después" no muestra cambio; Confianza alta con edad inventada; CTAs casi idénticos.
- competitor-watch: Ad Library por nombre de página; sin umbrales de política inventados; /products.json?limit=250 como método. Empeoró: +102% palabras, registro mezclado, INVIMA metido en una faja.
- roi-calculator: IVA resuelto (margen 25.208 → 9.359), punto de equilibrio recalculado, veredicto "ajustar pricing". Empeoró: asumió contraentrega en 0%; "15% mínimo" sin origen; "$" en vez de "COP".

## Iteración v3 (después de esta auditoría)

Cambios en las capas compartidas: REGISTRO aplica a toda la salida, no solo al copy, y los títulos del contrato se traducen al registro; CHEQUEO LATAM fija un único supuesto de rechazo (25%, marcado) y excluye INVIMA en prendas y muebles; nuevo bloque "ASUMIR NO ES INVENTAR" (asumir con marca y seguir calculando; "consultalo en tu panel" en una celda de unit economics no es respuesta; describir el producto del input no es inventar). meta-doctor: si el tracking no cuadra, una acción es de medición y dos siguen siendo sobre la campaña. supplier-finder: celda con valor asumido y dónde confirmarlo, no "verificalo vos" a secas. Contratos que duplicaban Confianza en el encabezado: solo la última línea.

Se re-ejecutaron los 8 con peor regresión (business-planner, caption-generator, meta-doctor, ad-creative-planner, landing-optimizer, cro-auditor, performance-tracker, supplier-finder); ver `salidas/v3/`. Los otros 20 no se re-ejecutaron con la v3: queda pendiente.
