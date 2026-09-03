/**
 * Lee `salidas/<fase>/*.md` y evalúa, por slug, un set de assertions nombradas
 * (estilo promptfoo) sobre la salida real de cada agente. No llama a ningún
 * proveedor de IA: solo analiza texto ya generado por `run-real.mts`.
 *
 * Uso: npx tsx measure.mts <antes|despues>
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { getAllAgents, type AgentDef } from '../../../../lib/agents/catalog'
import { WRITING_GATES } from '../../../../lib/agents/knowledge/writing-gates'
import { OUTPUT_CONTRACTS } from '../../../../lib/agents/output-contracts'
import { CASOS, type CasoAgente } from '../../../../lib/agents/__fixtures__/casos'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const EVAL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const EVAL_DIR = EVAL_ROOT
const SALIDAS_DIR = path.join(EVAL_DIR, 'salidas')
const PROMPTS_DIR = path.join(EVAL_DIR, 'prompts')

// -------------------------------------------------------------- utilidades

function nonEmptyLines(text: string): string[] {
  return text.split('\n').filter((l) => l.trim().length > 0)
}

function firstNonEmptyLine(text: string): string {
  return nonEmptyLines(text)[0] ?? ''
}

function lastNLines(text: string, n: number): string[] {
  const lines = nonEmptyLines(text)
  return lines.slice(Math.max(0, lines.length - n))
}

// -------------------------------------------------------- extracción de datos

/** Punto 4 de WRITING_GATES: lista de muletillas prohibidas, entre comillas. */
function extractMuletillas(): string[] {
  const match = WRITING_GATES.match(/4\.\s*MULETILLAS PROHIBIDAS\.([\s\S]*?)\n\n5\./)
  const section = match ? match[1] : ''
  return Array.from(section.matchAll(/"([^"]+)"/g)).map((m) => m[1])
}

/** Títulos de sección que abren un ítem numerado del contrato: `N. "Título"`. */
function extractContractSections(slug: string): string[] {
  const contract = OUTPUT_CONTRACTS[slug] ?? ''
  return Array.from(contract.matchAll(/^\d+\.\s+"([^"]{3,40})"/gm)).map((m) => m[1])
}

/** Todos los números de >=2 dígitos en un texto, con la línea donde aparecen. */
interface NumberOccurrence {
  raw: string
  normalized: string
  line: string
}

function extractNumbers(text: string): NumberOccurrence[] {
  const lines = text.split('\n')
  const occurrences: NumberOccurrence[] = []
  const numRegex = /\d(?:[\d.,]*\d)?/g
  for (const rawLine of lines) {
    // Conteos de caracteres "(26)" / "(118/125)" y desviaciones "−36%" / "+27%" son cálculos, no datos.
    const line = rawLine
      .replace(/\(\d+(?:\/\d+)?\)/g, ' ')
      .replace(/[−+-]\s?\d+(?:[.,]\d+)?\s?%/g, ' ')
    for (const m of line.matchAll(numRegex)) {
      const raw = m[0]
      const digitCount = (raw.match(/\d/g) ?? []).length
      if (digitCount < 2) continue
      occurrences.push({ raw, normalized: raw.replace(/[.,]/g, ''), line })
    }
  }
  return occurrences
}

function extractNormalizedNumberSet(text: string): Set<string> {
  return new Set(extractNumbers(text).map((n) => n.normalized))
}

// -------------------------------------------------------------- assertions

interface AssertionResult<T = boolean> {
  pass: boolean
  detail: T
}

function checkSinPreambulo(output: string): AssertionResult<string> {
  const line = firstNonEmptyLine(output).trim()
  const prohibited = /^(¡|Claro|Por supuesto|Excelente|Aquí|A continuación|Analizando|Perfecto|Entendido|Vamos|Como |Te )/i
  const isAnnouncement =
    line.endsWith(':') && /^(aquí|a continuación|esto es|lo siguiente|resultado|resumen)/i.test(line)
  const bad = prohibited.test(line) || isAnnouncement
  return { pass: !bad, detail: line.slice(0, 80) }
}

function checkSinDespedida(output: string): AssertionResult<string> {
  // La línea de Confianza es obligatoria y va al final: no cuenta como despedida.
  const tail = lastNLines(output, 3)
    .filter((l) => !/^\s*\**Confianza/i.test(l))
    .join(' | ')
  const bad = /espero que (esto |te )?(sirva|ayude)|¡?éxitos!?|avisame|en resumen|si necesit\w* (algo|alguna|cualquier|más)/i.test(tail)
  return { pass: !bad, detail: tail.slice(0, 100) }
}

function checkSinHedging(output: string): AssertionResult<number> {
  const matches = output.match(/podría|es posible que|puede que|suele|dependiendo de|en general|quizás|tal vez/gi) ?? []
  return { pass: matches.length === 0, detail: matches.length }
}

function checkSinMuletillas(output: string, muletillas: string[]): AssertionResult<{ count: number; found: string[] }> {
  const lower = output.toLowerCase()
  const found: string[] = []
  let count = 0
  for (const m of muletillas) {
    const needle = m.toLowerCase()
    let idx = 0
    let hits = 0
    while (true) {
      const found_ = lower.indexOf(needle, idx)
      if (found_ === -1) break
      hits++
      idx = found_ + needle.length
    }
    if (hits > 0) {
      count += hits
      found.push(`${m} (${hits})`)
    }
  }
  return { pass: count === 0, detail: { count, found } }
}

// El gate REGISTRO hace que el título del contrato ("Verificá antes de pagar") salga
// conjugado según el país ("Verifica antes de pagar"). Comparar sin tildes evita contar
// como sección faltante lo que es la conjugación correcta.
function sinTildes(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function checkSeccionesContrato(output: string, slug: string): AssertionResult<{ presentes: number; esperadas: number; faltantes: string[] }> {
  const sections = extractContractSections(slug)
  const lower = sinTildes(output.toLowerCase())
  const faltantes: string[] = []
  let presentes = 0
  for (const s of sections) {
    if (lower.includes(sinTildes(s.toLowerCase()))) presentes++
    else faltantes.push(s)
  }
  return { pass: sections.length > 0 && faltantes.length === 0, detail: { presentes, esperadas: sections.length, faltantes } }
}

function checkConfianza(output: string): AssertionResult<boolean> {
  const pass = /Confianza:\s*(alta|media|baja)/i.test(output)
  return { pass, detail: pass }
}

function checkCifrasSinOrigen(
  output: string,
  inputText: string,
  systemPromptText: string
): AssertionResult<{ count: number; ejemplos: string[] }> {
  const inputNums = extractNormalizedNumberSet(inputText)
  const systemNums = extractNormalizedNumberSet(systemPromptText)
  const occurrences = extractNumbers(output)

  const sinOrigen: string[] = []
  for (const occ of occurrences) {
    if (inputNums.has(occ.normalized)) continue
    if (systemNums.has(occ.normalized)) continue
    if (/asumí|asum|verificalo/i.test(occ.line)) continue
    sinOrigen.push(occ.raw)
  }

  return { pass: sinOrigen.length <= 2, detail: { count: sinOrigen.length, ejemplos: sinOrigen.slice(0, 5) } }
}

function checkLongitud(output: string): { lineas: number; palabras: number } {
  const lineas = nonEmptyLines(output).length
  const palabras = output.split(/\s+/).filter((w) => w.length > 0).length
  return { lineas, palabras }
}

function checkCopiaFewshot(output: string, systemPromptText: string): AssertionResult<boolean> {
  const marker = 'EJEMPLO DE SALIDA CORRECTA'
  const idx = systemPromptText.indexOf(marker)
  if (idx === -1) return { pass: false, detail: false }

  const endIdx = systemPromptText.indexOf('No reutilices', idx)
  const exampleBlock = systemPromptText.slice(idx + marker.length, endIdx === -1 ? idx + marker.length + 4000 : endIdx)
  // Solo cuenta copia de CONTENIDO (filas de tabla con datos, diálogos, hooks entre comillas),
  // no de encabezados de tabla ni de frases fijas del contrato ("Test A/B", "Confianza").
  const contentLines = exampleBlock
    .split('\n')
    .filter((l) => /^\s*\|\s*\d/.test(l) || /"[^"]{12,}"/.test(l) || /^\s*-\s*[AB]:/.test(l))
  const outputLower = output.toLowerCase()

  for (const line of contentLines) {
    const words = line.replace(/\(\d+(?:\/\d+)?\)/g, '').split(/\s+/).filter((w) => w.length > 0)
    for (let i = 0; i + 6 <= words.length; i++) {
      const window = words.slice(i, i + 6).join(' ').toLowerCase()
      if (window.length < 12) continue
      if (outputLower.includes(window)) {
        return { pass: true, detail: true } // "pass" acá es informativo: true = se detectó copia literal
      }
    }
  }
  return { pass: false, detail: false }
}

interface LimitesCaracteresResult {
  aplica: boolean
  violaciones: string[]
}

function checkLimitesCaracteres(output: string): LimitesCaracteresResult {
  const lines = output.split('\n')
  let headerIdx = -1
  let headlineCol = -1
  let textoCol = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim().startsWith('|')) continue
    const cells = line.split('|').map((c) => c.trim().toLowerCase())
    const hIdx = cells.findIndex((c) => c.includes('headline'))
    const tIdx = cells.findIndex((c) => c.includes('texto principal'))
    if (hIdx !== -1 && tIdx !== -1) {
      headerIdx = i
      headlineCol = hIdx
      textoCol = tIdx
      break
    }
  }

  if (headerIdx === -1) return { aplica: false, violaciones: [] }

  const violaciones: string[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim().startsWith('|')) break
    if (/^\s*\|[\s-:|]+\|\s*$/.test(line)) continue // fila separadora ---
    const cells = line.split('|').map((c) => c.trim())
    // El contrato pide que cada celda termine con su conteo "(26)" o "(118/125)":
    // el sufijo no es parte del copy.
    const stripCount = (c: string): string => c.replace(/\s*\(\d+(?:\/\d+)?\)\s*$/, '')
    const headline = stripCount(cells[headlineCol] ?? '')
    const texto = stripCount(cells[textoCol] ?? '')
    if (headline.length > 40) violaciones.push(`headline "${headline}" (${headline.length} car.)`)
    if (texto.length > 125) violaciones.push(`texto principal "${texto.slice(0, 40)}..." (${texto.length} car.)`)
  }

  return { aplica: true, violaciones }
}

// -------------------------------------------------------------------- main

interface SlugReport {
  slug: string
  sinSalida: boolean
  sinPreambulo?: AssertionResult<string>
  sinDespedida?: AssertionResult<string>
  sinHedging?: AssertionResult<number>
  sinMuletillas?: AssertionResult<{ count: number; found: string[] }>
  secciones?: AssertionResult<{ presentes: number; esperadas: number; faltantes: string[] }>
  confianza?: AssertionResult<boolean>
  cifras?: AssertionResult<{ count: number; ejemplos: string[] }>
  longitud?: { lineas: number; palabras: number }
  copiaFewshot?: AssertionResult<boolean>
  limitesCaracteres?: LimitesCaracteresResult
}

function readIfExists(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null
}

function extractSystemFromPromptFile(content: string): string {
  const idx = content.indexOf('## SYSTEM')
  const endIdx = content.indexOf('## USER')
  if (idx === -1) return ''
  return content.slice(idx + '## SYSTEM'.length, endIdx === -1 ? undefined : endIdx)
}

function main() {
  const fase = process.argv[2]
  if (!/^[a-z0-9-]+$/.test(fase)) {
    console.error('Uso: npx tsx measure.mts <antes|despues>')
    process.exit(1)
  }

  const agents = getAllAgents()
  const muletillas = extractMuletillas()
  const salidasDir = path.join(SALIDAS_DIR, fase)
  const promptsDir = path.join(PROMPTS_DIR, fase)

  const reports: SlugReport[] = []

  for (const caso of CASOS as readonly CasoAgente[]) {
    const agent: AgentDef | undefined = agents.find((a) => a.slug === caso.slug)
    if (!agent) continue

    const outputPath = path.join(salidasDir, `${caso.slug}.md`)
    const output = readIfExists(outputPath)

    if (output === null) {
      reports.push({ slug: caso.slug, sinSalida: true })
      continue
    }

    const promptFile = readIfExists(path.join(promptsDir, `${caso.slug}.md`))
    const systemPromptText = promptFile ? extractSystemFromPromptFile(promptFile) : ''
    const inputText = Object.values(caso.input).join('\n')

    const report: SlugReport = {
      slug: caso.slug,
      sinSalida: false,
      sinPreambulo: checkSinPreambulo(output),
      sinDespedida: checkSinDespedida(output),
      sinHedging: checkSinHedging(output),
      sinMuletillas: checkSinMuletillas(output, muletillas),
      secciones: checkSeccionesContrato(output, caso.slug),
      confianza: checkConfianza(output),
      cifras: checkCifrasSinOrigen(output, inputText, systemPromptText),
      longitud: checkLongitud(output),
      copiaFewshot: checkCopiaFewshot(output, systemPromptText),
    }

    if (caso.slug === 'ad-copy-generator') {
      report.limitesCaracteres = checkLimitesCaracteres(output)
    }

    reports.push(report)
  }

  const mark = (b: boolean) => (b ? '✅' : '❌')

  const lines: string[] = []
  lines.push(
    '| Slug | Sin salida | Sin preámbulo | Sin despedida | Sin hedging | Sin muletillas | Secciones contrato | Confianza | Cifras sin origen | Líneas/Palabras | Copia few-shot | Límites caracteres |'
  )
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|')

  let totSinPreambulo = 0
  let totSinDespedida = 0
  let totSinHedging = 0
  let totSinMuletillas = 0
  let totSecciones = 0
  let totConfianza = 0
  let totCifras = 0
  let totConSalida = 0
  let totLimitesOk = 0
  let totLimitesAplica = 0

  for (const r of reports) {
    if (r.sinSalida) {
      lines.push(`| ${r.slug} | sin salida | - | - | - | - | - | - | - | - | - | - |`)
      continue
    }
    totConSalida++
    if (r.sinPreambulo!.pass) totSinPreambulo++
    if (r.sinDespedida!.pass) totSinDespedida++
    if (r.sinHedging!.pass) totSinHedging++
    if (r.sinMuletillas!.pass) totSinMuletillas++
    if (r.secciones!.pass) totSecciones++
    if (r.confianza!.pass) totConfianza++
    if (r.cifras!.pass) totCifras++

    let limitesCell = '—'
    if (r.limitesCaracteres) {
      totLimitesAplica++
      if (r.limitesCaracteres.violaciones.length === 0) {
        totLimitesOk++
        limitesCell = '✅ 0 violaciones'
      } else {
        limitesCell = `❌ ${r.limitesCaracteres.violaciones.length} violaciones`
      }
    }

    lines.push(
      [
        `| ${r.slug}`,
        '❌',
        `${mark(r.sinPreambulo!.pass)}`,
        `${mark(r.sinDespedida!.pass)}`,
        `${mark(r.sinHedging!.pass)} (${r.sinHedging!.detail})`,
        `${mark(r.sinMuletillas!.pass)} (${r.sinMuletillas!.detail.count})`,
        `${mark(r.secciones!.pass)} (${r.secciones!.detail.presentes}/${r.secciones!.detail.esperadas})`,
        `${mark(r.confianza!.pass)}`,
        `${mark(r.cifras!.pass)} (${r.cifras!.detail.count})`,
        `${r.longitud!.lineas}L / ${r.longitud!.palabras}p`,
        `${r.copiaFewshot!.pass ? '⚠️ sí' : 'no'}`,
        limitesCell,
        '|',
      ].join(' | ')
    )
  }

  lines.push(
    `| **TOTAL (sobre ${totConSalida} con salida)** | ${28 - totConSalida} sin salida | **${totSinPreambulo}/${totConSalida}** | **${totSinDespedida}/${totConSalida}** | **${totSinHedging}/${totConSalida}** | **${totSinMuletillas}/${totConSalida}** | **${totSecciones}/${totConSalida}** | **${totConfianza}/${totConSalida}** | **${totCifras}/${totConSalida}** | - | - | **${totLimitesOk}/${totLimitesAplica}** |`
  )

  const detalle: string[] = ['', '## Detalle de fallos', '']
  for (const r of reports) {
    if (!r.cifras || !r.sinMuletillas) continue
    const partes: string[] = []
    if (!r.cifras.pass) partes.push(`cifras: ${r.cifras.detail.ejemplos.join(', ')}`)
    if (!r.sinMuletillas.pass) partes.push(`muletillas: ${JSON.stringify(r.sinMuletillas.detail)}`)
    if (r.limitesCaracteres && r.limitesCaracteres.violaciones.length > 0) partes.push(`límites: ${r.limitesCaracteres.violaciones.join(' · ')}`)
    if (partes.length > 0) detalle.push(`- **${r.slug}**: ${partes.join(' | ')}`)
  }
  const table = lines.join('\n') + '\n' + detalle.join('\n')
  console.log(table)

  const resumenPath = path.join(salidasDir, '_resumen.md')
  fs.mkdirSync(salidasDir, { recursive: true })
  fs.writeFileSync(resumenPath, `# Resumen measure.mts — fase "${fase}"\n\n${table}\n`, 'utf-8')
  console.log(`\nResumen guardado en ${resumenPath}`)
}

main()
