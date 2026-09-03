/**
 * Valida CASOS contra el catálogo real y, si pasa, vuelca los prompts
 * construidos (system + user) de cada caso a `prompts/<fase>/<slug>.md`.
 *
 * Uso: npx tsx dump-prompts.mts <antes|despues>
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { getAllAgents, type AgentDef } from '../../../../lib/agents/catalog'
import { buildPrompts } from '../../../../lib/agents/prompt-builder'
import { CASOS, type CasoAgente } from '../../../../lib/agents/__fixtures__/casos'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const EVAL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const OUT_DIR = join(EVAL_ROOT, 'prompts')

function fail(errors: string[]): never {
  console.error(`Se encontraron ${errors.length} error(es) de validación:\n`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

function validate(agents: AgentDef[], casos: readonly CasoAgente[]): string[] {
  const errors: string[] = []

  const agentSlugs = new Set(agents.map((a) => a.slug))
  const casoSlugs = casos.map((c) => c.slug)
  const casoSlugSet = new Set(casoSlugs)

  // Duplicados en CASOS
  const seen = new Set<string>()
  for (const slug of casoSlugs) {
    if (seen.has(slug)) errors.push(`CASOS tiene un slug duplicado: "${slug}"`)
    seen.add(slug)
  }

  // Cobertura exacta: ni más ni menos que los slugs del catálogo
  for (const slug of agentSlugs) {
    if (!casoSlugSet.has(slug)) errors.push(`Falta un caso para el agente "${slug}"`)
  }
  for (const slug of casoSlugSet) {
    if (!agentSlugs.has(slug)) errors.push(`CASOS tiene un slug que no existe en el catálogo: "${slug}"`)
  }

  // Validación por caso: keys existen en inputSchema, enums válidos, required presentes
  for (const caso of casos) {
    const agent = agents.find((a) => a.slug === caso.slug)
    if (!agent) continue // ya reportado arriba

    for (const [key, value] of Object.entries(caso.input)) {
      const field = agent.inputSchema[key]
      if (!field) {
        errors.push(`[${caso.slug}] el campo "${key}" no existe en inputSchema`)
        continue
      }
      if (field.enum && !field.enum.includes(value)) {
        errors.push(
          `[${caso.slug}] el campo "${key}" tiene valor "${value}" que no está en su enum: [${field.enum.join(', ')}]`
        )
      }
    }

    for (const [key, field] of Object.entries(agent.inputSchema)) {
      if (field.required && !(key in caso.input)) {
        errors.push(`[${caso.slug}] falta el campo required "${key}"`)
      } else if (field.required && caso.input[key].trim().length === 0) {
        errors.push(`[${caso.slug}] el campo required "${key}" está vacío`)
      }
    }
  }

  return errors
}

function main() {
  const fase = process.argv[2]
  if (fase !== 'antes' && fase !== 'despues') {
    console.error('Uso: npx tsx dump-prompts.mts <antes|despues>')
    process.exit(1)
  }

  const agents = getAllAgents()
  const errors = validate(agents, CASOS)
  if (errors.length > 0) fail(errors)

  const outDir = path.join(OUT_DIR, fase)
  fs.mkdirSync(outDir, { recursive: true })

  for (const caso of CASOS) {
    const agent = agents.find((a) => a.slug === caso.slug)
    if (!agent) continue
    const { systemPrompt, userPrompt } = buildPrompts(agent, caso.input)
    const content = `# ${caso.slug}\n## SYSTEM\n${systemPrompt}\n## USER\n${userPrompt}\n`
    fs.writeFileSync(path.join(outDir, `${caso.slug}.md`), content, 'utf-8')
  }

  console.log(`OK: ${CASOS.length} archivos escritos en ${outDir}`)
}

main()
