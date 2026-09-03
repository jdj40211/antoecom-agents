import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
/**
 * Medición estática sobre los 28 agentes: para cada uno arma el system prompt
 * con `buildPrompts(agent, { x: 'test' })` y chequea, por regex, qué capas
 * están presentes. No llama a ningún proveedor de IA: es puramente textual.
 *
 * Uso: npx tsx check.mts
 */
import { getAllAgents, type AgentDef } from '../../../../lib/agents/catalog'
import { buildPrompts } from '../../../../lib/agents/prompt-builder'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

const KNOWLEDGE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'lib', 'agents', 'knowledge')
const MIN_KNOWLEDGE_CONST_LEN = 200
const MIN_DOMAIN_LEN = 1800

interface CheckRow {
  slug: string
  ejemplos: boolean
  antiRelleno: boolean
  contrato: boolean
  evidencia: boolean
  supuestos: boolean
  knowledge: boolean
}

async function loadKnowledgeConstants(): Promise<string[]> {
  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(KNOWLEDGE_DIR, f))

  const constants: string[] = []
  for (const file of files) {
    const mod: Record<string, unknown> = await import(pathToFileURL(file).href)
    for (const value of Object.values(mod)) {
      if (typeof value === 'string' && value.length >= MIN_KNOWLEDGE_CONST_LEN) {
        constants.push(value)
      }
    }
  }
  return constants
}

/**
 * La parte "de dominio" del system prompt es todo lo que viene ANTES de la
 * capa de escritura (WRITING_GATES empieza con "CÓMO ESCRIBÍS"). Esa capa se
 * inyecta igual a los 28 agentes, así que no cuenta como conocimiento propio.
 */
function domainPart(systemPrompt: string): string {
  const marker = 'CÓMO ESCRIBÍS'
  const idx = systemPrompt.indexOf(marker)
  return idx === -1 ? systemPrompt : systemPrompt.slice(0, idx)
}

async function main() {
  const agents: AgentDef[] = getAllAgents()
  const knowledgeConstants = await loadKnowledgeConstants()

  const rows: CheckRow[] = agents.map((agent) => {
    const { systemPrompt } = buildPrompts(agent, { x: 'test' })
    const domain = domainPart(systemPrompt)

    const ejemplos = /Mal:|Bien:|ejemplo/i.test(systemPrompt)
    const antiRelleno = /Prohibido|no negociable|MULETILLAS/.test(systemPrompt)
    const contrato = /FORMATO DE SALIDA/.test(systemPrompt)
    const evidencia = /Confianza: alta/.test(systemPrompt)
    const supuestos = /Asumí/.test(systemPrompt)

    const knowledgeByLength = domain.length > MIN_DOMAIN_LEN
    const knowledgeByConstant = knowledgeConstants.some((c) => domain.includes(c))
    const knowledge = knowledgeByLength || knowledgeByConstant

    return { slug: agent.slug, ejemplos, antiRelleno, contrato, evidencia, supuestos, knowledge }
  })

  const cols: Array<keyof Omit<CheckRow, 'slug'>> = [
    'ejemplos',
    'antiRelleno',
    'contrato',
    'evidencia',
    'supuestos',
    'knowledge',
  ]
  const headerLabels: Record<(typeof cols)[number], string> = {
    ejemplos: 'Ejemplos',
    antiRelleno: 'Anti-relleno',
    contrato: 'Contrato',
    evidencia: 'Evidencia',
    supuestos: 'Supuestos',
    knowledge: 'Knowledge',
  }

  const mark = (b: boolean) => (b ? '✅' : '❌')

  const lines: string[] = []
  lines.push(`| Slug | ${cols.map((c) => headerLabels[c]).join(' | ')} |`)
  lines.push(`|------|${cols.map(() => '---').join('|')}|`)
  for (const row of rows) {
    lines.push(`| ${row.slug} | ${cols.map((c) => mark(row[c])).join(' | ')} |`)
  }

  const totals: Record<string, number> = {}
  for (const c of cols) {
    totals[c] = rows.filter((r) => r[c]).length
  }
  lines.push(`| **TOTAL** | ${cols.map((c) => `**${totals[c]}/${rows.length}**`).join(' | ')} |`)

  console.log(lines.join('\n'))

  // Antes del refinamiento v2 eran hook-writer, competitor-watch, broll-generator y supplier-finder.
  const expectedFalseKnowledge: string[] = []
  const actualFalseKnowledge = rows.filter((r) => !r.knowledge).map((r) => r.slug).sort()
  const expectedSorted = [...expectedFalseKnowledge].sort()
  const matches = JSON.stringify(actualFalseKnowledge) === JSON.stringify(expectedSorted)

  console.log('\n---')
  console.log(`Agentes con knowledge=false: ${actualFalseKnowledge.join(', ') || '(ninguno)'}`)
  console.log(`Esperados: ${expectedSorted.join(', ')}`)
  console.log(matches ? '✅ Coincide exactamente con lo esperado.' : '❌ NO coincide con lo esperado.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
