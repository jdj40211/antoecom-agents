# Evaluación de los 28 agentes, 3 de septiembre de 2026

Salidas reales de los 28 agentes sobre los casos de `lib/agents/__fixtures__/casos.ts`,
antes y después del refinamiento v2 (knowledge para los 4 agentes sin base, gates de
registro y coherencia, chequeo LATAM, contratos apretados, few-shot en los creativos,
temperatura por tarea).

## Cómo se generaron

No había key de proveedor disponible. Las salidas las produjo Claude Sonnet actuando
como el modelo: recibió el system prompt y el mensaje del usuario textuales que devuelve
`buildPrompts()` (ver `scripts/PROMPT-MODELO.md`) y respondió sin herramientas.
Es un proxy de `claude-sonnet-5`, no una llamada a `executeAgent()`. Para repetirlo
contra la API real: `ANTHROPIC_API_KEY=... npx tsx scripts/run-real.mts despues`.

Los scripts corren desde esta carpeta: `npx tsx scripts/dump-prompts.mts despues` genera `prompts/despues/`
y `npx tsx scripts/measure.mts despues` lee `salidas/despues/`. Los prompts no están versionados: se regeneran desde el código.

## Archivos

- `salidas/antes/`, `salidas/despues/`: una salida por agente y `_resumen.md` con las assertions.
- `auditoria-antes.md`: fallas citadas de la fase "antes" que motivaron cada cambio.
- `scripts/check.mts`: métricas estáticas sobre el prompt (ejemplos, anti-relleno, contrato, evidencia, knowledge).
- `scripts/dump-prompts.mts`: valida los casos contra el catálogo y vuelca los prompts.
- `scripts/measure.mts`: assertions sobre la salida (preámbulo, hedging, muletillas, secciones, confianza, cifras sin origen, copia del few-shot, límites de caracteres).

## Limitaciones del medidor

`cifras-sin-origen` marca todo número que no esté en el input ni en el system prompt. No
reconoce derivaciones legítimas: un CPM calculado (gasto / impresiones × 1000), un benchmark
en USD convertido por TRM o un precio sin IVA (129.900 / 1,19) cuentan como "sin origen".
Sirve para comparar fases entre sí, no como conteo absoluto de invenciones.
