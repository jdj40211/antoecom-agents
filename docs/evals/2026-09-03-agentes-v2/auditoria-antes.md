# Auditoría adversarial de las 28 salidas "antes" (resumen operativo)

## Patrones transversales (lo que justifica tocar las capas compartidas)

1. **Voseo rioplatense en copy publicable con país declarado (9 agentes):** content-engine, ugc-scripts, caption-generator, ad-copy-generator, ad-creative-planner, ad-image-prompter, product-descriptions, landing-page-builder, landing-optimizer. Ej: "Comprás sin miedo: pagás cuando la tenés en la mano" (Bogotá); "Llevá 2 pares por $189.900" (público 45-65 Colombia y México); "Recuperá tu figura sin cirugía" (landing Bogotá/Medellín). product-descriptions mezcla registros en la misma página ("Armalo vos mismo" / "Organiza tu closet"). Causa: el system prompt está en voseo y el modelo lo espeja.

2. **Recomienda X y en la misma salida declara que X no sirve (11 agentes):** ad-copy ("Empezá con: la 3" / "la 3... Meta la rechaza"), business-planner (plan sobre 70% COD / "la tasa real cae a 55-60%"), meta-doctor (subir presupuesto / campaña en learning y frecuencia 3.8), ads-auditor ("Confianza: alta" / cuatro áreas sin datos; recortar 20% a la única campaña con ROAS 3.4), campaign-architect ("alcanzan justo" / sus números dicen 17 conv/semana contra piso de 50; kill rule 2x contra su gate 3x), launch-checklist (pausar a 24h / no romper learning), product-hunter ("Descartar" / "score depende de 10 criterios sin dato"), competitor-watch, landing-optimizer, landing-page-builder ("devolvela gratis" como hecho / "confirmalo" como supuesto), image-prompts (etiqueta con texto / --no text).

3. **Cifra inventada con forma de dato, en categoría vecina a la prohibida (15 agentes):** "El 73% de los que toman melatonina..." y "según 4 estudios" (hook-writer); "Sabor a frutos rojos" y testimonio con nombre "Vale" recomendado para publicar (caption-generator); "Envío a todo el país y compra protegida: si no encaja, lo cambiás" (product-descriptions); diez rangos de plazo por transportadora (logistics-tracker); "MOQ 300-500", "20-35 días marítimo" (supplier-finder); "Usala 6-8 horas al día", "resultado en la semana 2" (landing-optimizer); "pico en enero, caída junio-agosto" (niche-analyzer); "A las tres semanas subí escaleras" (ugc-scripts, plazo terapéutico). Patrón: el contrato prohíbe precios y nombres y el modelo traslada la invención a MOQ, plazos, tasas, sabores, políticas comerciales, protocolos de uso, testimonios.

4. **Contexto LATAM del propio prompt no usado donde decide (11 agentes):** contraentrega ausente en cro-auditor, launch-checklist, product-descriptions, niche-analyzer, audience-analyzer, campaign-architect (en dos de ellos es el lift más alto de su propia tabla). IVA 19% ausente en roi-calculator (se lleva ~76% del margen declarado) y business-planner. Registro INVIMA ausente en supplier-finder (proteína en polvo), audience-analyzer (cosmético importado), ugc-scripts (colágeno), product-hunter (masajeador con calor). Ciclo de recaudo COD ausente en logistics-tracker con 68% contraentrega.

5. **Sección del contrato presente pero vacía (8 agentes):** competitor-watch (20 de 21 celdas "sin dato"), cro-auditor (los 3 hallazgos son los 3 del formulario, repetidos en "Los 3 de alto impacto"), product-hunter (10 de 12 criterios en 0), logistics-tracker (Costo "sin dato" ×5 y recomienda migrar igual), ad-image-prompter (Zona segura que no habla de la UI), product-descriptions (ficha técnica sin una medida), launch-checklist (columna Tiempo con fechas en vez de duración).

## Fallas específicas de los agentes que se van a tocar

### meta-doctor
- Datos del input no cuadran y no lo nota: 38 compras × COP 149.900 = 5.696.200 sobre gasto 1.850.000 → ROAS 3,08, no 1,4. El CPA sí cierra. Un analista abre con "revisá el value del evento Purchase".
- Acción 1 "Subí el presupuesto de 280.000 a 350.000" con campaña en learning y frecuencia 3.8: viola su Quality Gate 4 y empeora la saturación que diagnosticó.
- Acción 3 arranca con "Si el ROAS sigue debajo de 1.8..." y termina en "no pausés hoy": condicional, no acción.
- No calcula CPM (1.850.000/214.300×1000 = COP 8.632 ≈ USD 2,16 a TRM 4.000, muy por debajo del benchmark USD 12,50): el dato que separa subasta de oferta.
- Benchmarks en USD vs input en COP: "CPC | COP 960 | $0.70 | ⚪ sin comparar".

### ad-copy-generator
- "Empezá con: la 3" y en la línea siguiente "Compliance: la 3 dice 'Fascitis plantar, resuelta'... Meta la rechaza".
- "Test A/B: entre la 1 y la 2 cambia el gancho del headline, el resto queda igual": falso, cambia también todo el texto principal.
- Público Colombia y México, precio solo en COP ("$189.900") y "Envío a Colombia y México".
- Voseo para 45-65 años en Colombia y México ("Llevá", "Pedí el 2x1").
- Texto principal de la variante 3: 128 caracteres (límite 125).
- Sin "cambio de talla" en calzado vendido por contraentrega.

### hook-writer
- "El 73% de los que toman melatonina se despiertan más cansados"; "3mg... según 4 estudios": estadísticas fabricadas.
- "Tomá la gomita 90 minutos antes de dormir, no 10": dato de uso incorrecto (pauta habitual 30-60 min).
- Top 3 llama "cifras verificables" a las de una historia personal que él mismo inventó.
- 4 de 10 hooks atacan la categoría que el usuario vende (gomitas 10mg).
- Variante B cambia tres cosas y abre con "¿Sabías que".

### caption-generator
- "Sabor a frutos rojos": sabor inventado, en caption listo para pegar.
- Caption 3 entero es un testimonio fabricado con nombre ("Vale se acostaba a las 11...") y el agente recomienda publicarlo.
- "a los veinte minutos el cuerpo entiende que es hora de dormir": tiempo de acción inventado.
- "pagás cuando el cartero toca el timbre": en LATAM entrega un mensajero.
- Caption 4 abre con "Llegaron las gomitas que van a cambiar tu forma de dormir".

### ugc-scripts
- Bug literal: "Until until until... una amiga me mandó esto" en el diálogo.
- "A las tres semanas subí escaleras sin pensarlo": plazo terapéutico inventado sobre suplemento.
- Títulos que no cumplen "ángulo en 3 palabras": "Variación 2 — Piel firme en 21 días".
- "empezá hoy, no en enero": urgencia estacional sin anclaje.
- Colágeno = suplemento con registro INVIMA; claims "reduce dolor articular" prohibidos y nada en Producción lo avisa.

### supplier-finder
- CJ descrito mal: "Bodega en EE.UU.... doble envío China → USA → Colombia". CJ tiene bodegas en China y despacha directo.
- Inventa todos los MOQ y plazos ("300-500 unidades", "20-35 días marítimo", "3-7 días a EE.UU., 10-18 hasta Colombia") sin "verificalo vos".
- "Dropi factura y despacha por vos": la facturación es del vendedor.
- Proteína en polvo importada requiere registro INVIMA: ausente, invalida la mitad de la tabla.
- No recomienda ningún canal aunque el usuario dio volumen (200-500) y preferencia (Dropi): el contrato eliminó la sección "Recomendación" que sí tenía el prompt de dominio.

### competitor-watch
- "metés fajasmarielys.co en Meta Ad Library": Ad Library busca por nombre de página, no por dominio. "Buscás el handle en TikTok Creative Center, Top Ads": Top Ads filtra por industria/región, no por anunciante.
- "envío gratis sobre $150.000 COP", "30 días para cambio": umbrales de política inventados.
- Tabla con 20 de 21 celdas "sin dato" y aun así tres movimientos de diferenciación.

## Lo que un few-shot tiene que mostrar (según el auditor)
- hook-writer: fila ✗ con porcentaje inventado vs fila ✓ que dice lo mismo sin cifra; variante A/B que cambia UNA palabra.
- ad-copy-generator: conteo de caracteres en cada celda; 1 y 2 con el mismo texto principal y CTA (solo cambia headline); Compliance ANTES de "Empezá con"; precio en dos monedas si hay dos países.
- caption-generator: la misma tensión narrativa en segunda persona en vez de testimonio con nombre; si el input no trae sabor/precio/tiempo de acción, el caption no los menciona.
- ugc-scripts: fila ✗ "A las tres semanas..." vs ✓ "Hoy subí las escaleras y a mitad de camino me di cuenta de que no me había agarrado del pasamanos"; título de 3 palabras contadas; línea de Producción con aviso de compliance del rubro.
