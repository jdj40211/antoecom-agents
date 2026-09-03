export type ProviderName = 'anthropic' | 'openai' | 'google' | 'openrouter'

/**
 * Deduce el proveedor a partir del prefijo del modelo.
 *
 * Vive en su propio archivo, separado de executor.ts, para que los componentes
 * del cliente puedan usarlo sin arrastrar los SDKs de cada proveedor al bundle.
 */
export function resolveProvider(model: string): ProviderName {
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt')) return 'openai'
  if (model.startsWith('gemini')) return 'google'
  return 'openrouter'
}

export const PROVIDER_NAMES: readonly ProviderName[] = ['anthropic', 'openai', 'google', 'openrouter']

/**
 * Type guard para los `provider` que llegan como texto suelto: la columna
 * `user_api_keys.provider` y el store de desarrollo son strings, y sin esto
 * había que castearlos para compararlos contra un `ProviderName`.
 */
export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(value)
}
