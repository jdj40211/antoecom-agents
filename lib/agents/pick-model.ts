import type { AgentDef } from './catalog'
import { resolveProvider, type ProviderName } from './resolve-provider'

/**
 * Elige con qué modelo corre un agente, según los proveedores que el usuario
 * tenga vinculados.
 *
 * Antes esto era un `<Select>` en el formulario, con `agent.defaultModel` como
 * valor inicial. El default es fijo por agente, así que quien solo tenía key de
 * OpenAI entraba a cualquiera de los 19 agentes que arrancan en Anthropic y lo
 * primero que veía era el aviso de "te falta la API key": la app le ofrecía por
 * defecto algo que no podía usar, y encima le pedía resolverlo eligiendo de una
 * lista donde varias opciones decían "(sin key)".
 *
 * `allowedModels` ya viene ordenado por preferencia en el catálogo: el primero
 * es el que mejor rinde para ese agente, y los que siguen son equivalentes de
 * otros proveedores. Recorrerlo en orden y quedarse con el primero que el
 * usuario pueda pagar respeta esa curaduría sin razonar sobre tiers: para un
 * agente estándar da Sonnet si hay Anthropic, y su equivalente en OpenAI o
 * Google si no.
 *
 * Sin ninguna key devuelve el default del agente, no `null`: quien decide qué
 * mensaje mostrar es quien pide la key, y así el error sigue nombrando un
 * proveedor concreto en vez de fallar acá.
 */
export function pickModel(agent: AgentDef, available: readonly ProviderName[]): string {
  const affordable = agent.allowedModels.find((model) =>
    available.includes(resolveProvider(model))
  )

  return affordable ?? agent.defaultModel
}
