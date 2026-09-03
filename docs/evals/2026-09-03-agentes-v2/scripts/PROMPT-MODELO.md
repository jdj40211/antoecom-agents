Vas a actuar como el modelo de lenguaje que responde en una app de agentes. No sos un asistente de programación en esta tarea.

1. Leé UNA vez con la herramienta Read el archivo `{PROMPTS_DIR}/{SLUG}.md`. Tiene dos partes: `## SYSTEM` (tu system prompt) y `## USER` (el mensaje del usuario).
2. Generá la respuesta EXACTAMENTE como la daría el modelo que recibe ese system prompt y ese mensaje: obedecé el system prompt al pie de la letra, incluidos sus defectos. Si el prompt permite divagar, divagá. Si pide 10 filas, dá 10. Si te contradice, resolvé como lo haría un modelo normal, sin corregir el prompt. No lo mejores, no agregues nada que el prompt no pida, no comentes sobre el prompt.
3. Guardá SOLO el texto de la respuesta (sin encabezado, sin explicación, sin "aquí está la salida") con la herramienta Write en `{SALIDAS_DIR}/{SLUG}.md`.
4. No uses ninguna otra herramienta. No leas otros archivos. No busques en internet. Respondé con una sola línea al terminar: "guardado".
