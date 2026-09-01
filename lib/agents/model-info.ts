export type ModelTier = 'economy' | 'standard' | 'premium'

export interface ModelInfo {
  id: string
  name: string
  provider: 'anthropic' | 'openai' | 'google' | 'openrouter'
  tier: ModelTier
  estimatedCostPerRequest: number
  costLabel: string
  inputPricePer1M: number
  outputPricePer1M: number
}

export const MODEL_CATALOG: ModelInfo[] = [
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', provider: 'openai', tier: 'economy', estimatedCostPerRequest: 0.005, costLabel: '~$0.005', inputPricePer1M: 0.2, outputPricePer1M: 1.2 },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic', tier: 'economy', estimatedCostPerRequest: 0.02, costLabel: '~$0.02', inputPricePer1M: 1, outputPricePer1M: 5 },
  { id: 'gemini-2.5-flash', name: 'Gemini Flash', provider: 'google', tier: 'economy', estimatedCostPerRequest: 0.003, costLabel: '~$0.003', inputPricePer1M: 0.15, outputPricePer1M: 0.6 },
  { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', provider: 'openai', tier: 'standard', estimatedCostPerRequest: 0.05, costLabel: '~$0.05', inputPricePer1M: 2, outputPricePer1M: 12 },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'anthropic', tier: 'standard', estimatedCostPerRequest: 0.06, costLabel: '~$0.06', inputPricePer1M: 3, outputPricePer1M: 15 },
  { id: 'gemini-2.5-pro', name: 'Gemini Pro', provider: 'google', tier: 'standard', estimatedCostPerRequest: 0.04, costLabel: '~$0.04', inputPricePer1M: 1.25, outputPricePer1M: 10 },
  { id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'anthropic', tier: 'premium', estimatedCostPerRequest: 0.10, costLabel: '~$0.10', inputPricePer1M: 5, outputPricePer1M: 25 },
]

export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.id === modelId)
}

export function getModelsByProvider(provider: string): ModelInfo[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider)
}

// TIER_LABELS vive ahora en lib/utils/tier.ts, junto con las utilidades que
// traducen el tier a clases. Acá había una copia con un campo `color` de
// nombres sueltos ('green', 'blue', 'purple') que ya nadie usa.
