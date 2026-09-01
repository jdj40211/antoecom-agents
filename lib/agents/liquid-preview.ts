/**
 * Vista previa de secciones Liquid de Shopify.
 *
 * Lógica pura extraída de la pantalla de ejecución del agente: parsea el código
 * que devuelve el modelo, resuelve las variables de Liquid con los valores por
 * defecto del schema y arma un HTML autocontenido para el iframe de preview.
 * No contiene JSX ni depende de React.
 */

/** Agentes cuyo output se puede previsualizar como HTML. */
export const PREVIEWABLE_AGENTS: ReadonlySet<string> = new Set([
  'shopify-section-builder',
  'landing-page-builder',
])

export function extractLiquidCode(markdown: string): string | null {
  const taggedMatch = markdown.match(/```(?:liquid|html)\n([\s\S]*?)```/)
  if (taggedMatch) return taggedMatch[1].trim()

  const untaggedMatch = markdown.match(/```\n([\s\S]*?)```/)
  if (untaggedMatch) return untaggedMatch[1].trim()

  const allBlocks = [...markdown.matchAll(/```(?:\w*)\n([\s\S]*?)```/g)]
  if (allBlocks.length > 1) {
    return allBlocks.map((m) => m[1].trim()).join('\n\n')
  }

  if (markdown.includes('{% schema %}') || markdown.includes('<style>') || markdown.includes('<section')) {
    return markdown.trim()
  }

  return null
}

function extractSchemaDefaults(liquidCode: string): Record<string, string> {
  const defaults: Record<string, string> = {}
  const schemaMatch = liquidCode.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/)
  if (!schemaMatch) return defaults

  try {
    const schema: {
      settings?: Array<{ id?: string; default?: string | number | boolean }>
      presets?: Array<{ settings?: Record<string, string | number | boolean> }>
    } = JSON.parse(schemaMatch[1])

    if (Array.isArray(schema.settings)) {
      for (const setting of schema.settings) {
        if (setting.id && setting.default !== undefined) {
          defaults[setting.id] = String(setting.default)
        }
      }
    }
    if (Array.isArray(schema.presets) && schema.presets[0]?.settings) {
      const presetSettings = schema.presets[0].settings
      for (const [key, value] of Object.entries(presetSettings)) {
        defaults[key] = String(value)
      }
    }
  } catch {
    // Schema JSON parse failed
  }

  return defaults
}

function resolveExpression(expr: string, defaults: Record<string, string>): string {
  const parts = expr.split('|')
  const cleanExpr = parts[0].trim()
  const hasImageTag = parts.some((f) => f.trim().startsWith('image_tag'))

  let resolved = ''

  if (cleanExpr === 'section.id') {
    resolved = 'preview-section'
  } else {
    const stringLiteral = cleanExpr.match(/^['"](.*)['"]$/)
    if (stringLiteral) {
      resolved = stringLiteral[1]
    } else {
      const sectionMatch = cleanExpr.match(/^section\.settings\.(\w+)$/)
      if (sectionMatch) {
        const key = sectionMatch[1]
        if (defaults[key] !== undefined) resolved = defaults[key]
        else if (/title|heading/i.test(key)) resolved = 'Título de ejemplo'
        else if (/description|text|subtitle|content/i.test(key)) resolved = 'Descripción de ejemplo para esta sección'
        else if (/button|cta/i.test(key)) resolved = 'Comprar ahora'
        else if (/image/i.test(key)) resolved = 'https://placehold.co/800x600/e2e8f0/64748b?text=Imagen'
        else if (/color/i.test(key)) resolved = '#1a1a2e'
        else if (/url|link/i.test(key)) resolved = '#'
        else if (/spacing|padding/i.test(key)) resolved = '50'
      } else {
        const blockMatch = cleanExpr.match(/^block\.settings\.(\w+)$/)
        if (blockMatch) {
          const key = blockMatch[1]
          if (/title|heading/i.test(key)) resolved = 'Elemento'
          else if (/text|description|content/i.test(key)) resolved = 'Texto de ejemplo'
          else if (/image/i.test(key)) resolved = 'https://placehold.co/400x400/e2e8f0/64748b?text=Imagen'
          else if (/icon/i.test(key)) resolved = ''
          else if (/url|link/i.test(key)) resolved = '#'
        }
      }
    }
  }

  if (hasImageTag && resolved) {
    return `<img src="${resolved}" alt="" style="max-width:100%;height:auto;" loading="lazy">`
  }

  return resolved
}

export function buildPreviewHtml(liquidCode: string): string {
  const defaults = extractSchemaDefaults(liquidCode)
  let html = liquidCode

  html = html.replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, '')
  html = html.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
  html = html.replace(/\{%-?\s*style\s*-?%\}/g, '<style>')
  html = html.replace(/\{%-?\s*endstyle\s*-?%\}/g, '</style>')

  html = html.replace(/\{\{-?\s*([\s\S]*?)\s*-?\}\}/g, (_, expr: string) => {
    return resolveExpression(expr.trim(), defaults)
  })

  html = html.replace(/\{%-?[\s\S]*?-?%\}/g, '')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; color: #1a1a1a; }
  img { max-width: 100%; height: auto; }
  a { color: inherit; text-decoration: none; }
  :root { --rpn: 0px; --rpp: 0px; }
</style>
</head>
<body>
<div id="shopify-section-preview-section">
${html}
</div>
</body>
</html>`
}
