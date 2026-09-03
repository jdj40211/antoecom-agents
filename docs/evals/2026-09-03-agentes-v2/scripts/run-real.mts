/**
 * Corre los 28 (o uno solo) casos contra la API real de Anthropic y guarda
 * la respuesta de texto en `salidas/<fase>/<slug>.md`.
 *
 * Uso: npx tsx run-real.mts <antes|despues> [slug]
 *
 * Requiere ANTHROPIC_API_KEY en el entorno. No se ejecuta como parte del
 * pipeline de validación estática: pega contra la API real y consume cuota.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { getAllAgents, getAgent, type AgentDef } from '../../../../lib/agents/catalog'
import { buildPrompts } from '../../../../lib/agents/prompt-builder'
import { executeAgent } from '../../../../lib/agents/executor'
import { CASOS, type CasoAgente } from '../../../../lib/agents/__fixtures__/casos'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const EVAL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const OUT_DIR = join(EVAL_ROOT, 'salidas')
const MODEL = 'claude-sonnet-5'

async function runOne(agent: AgentDef, caso: CasoAgente, apiKey: string, outDir: string): Promise<void> {
  const { systemPrompt, userPrompt } = buildPrompts(agent, caso.input)

  const { stream, usage } = executeAgent({
    agent,
    input: caso.input,
    apiKey,
    model: MODEL,
    systemPrompt,
    userPrompt,
  })

  const decoder = new TextDecoder()
  let text = ''
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()

  fs.writeFileSync(path.join(outDir, `${agent.slug}.md`), text, 'utf-8')

  const finalUsage = await usage
  console.log(`  [${agent.slug}] OK — ${text.length} chars. usage: ${JSON.stringify(finalUsage)}`)
}

async function main() {
  const fase = process.argv[2]
  const onlySlug = process.argv[3]

  if (fase !== 'antes' && fase !== 'despues') {
    console.error('Uso: npx tsx run-real.mts <antes|despues> [slug]')
    process.exit(1)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Falta ANTHROPIC_API_KEY en el entorno. No se puede ejecutar contra la API real.')
    process.exit(1)
  }

  const agents = getAllAgents()
  const outDir = path.join(OUT_DIR, fase)
  fs.mkdirSync(outDir, { recursive: true })

  let casos = CASOS
  if (onlySlug) {
    const agent = getAgent(onlySlug)
    if (!agent) {
      console.error(`No existe el agente "${onlySlug}" en el catálogo.`)
      process.exit(1)
    }
    casos = CASOS.filter((c) => c.slug === onlySlug)
    if (casos.length === 0) {
      console.error(`No hay caso en CASOS para el slug "${onlySlug}".`)
      process.exit(1)
    }
  }

  console.log(`Corriendo ${casos.length} agente(s), fase="${fase}", modelo="${MODEL}"...`)

  for (const caso of casos) {
    const agent = agents.find((a) => a.slug === caso.slug)
    if (!agent) {
      console.error(`  [${caso.slug}] SKIP — no existe en el catálogo`)
      continue
    }
    try {
      await runOne(agent, caso, apiKey, outDir)
    } catch (err) {
      console.error(`  [${caso.slug}] ERROR — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('Listo.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
