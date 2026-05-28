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
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', tier: 'economy', estimatedCostPerRequest: 0.003, costLabel: '~$0.003', inputPricePer1M: 0.15, outputPricePer1M: 0.6 },
  { id: 'claude-haiku-4-20250414', name: 'Claude Haiku 4', provider: 'anthropic', tier: 'economy', estimatedCostPerRequest: 0.005, costLabel: '~$0.005', inputPricePer1M: 0.8, outputPricePer1M: 4 },
  { id: 'gemini-2.5-flash', name: 'Gemini Flash', provider: 'google', tier: 'economy', estimatedCostPerRequest: 0.003, costLabel: '~$0.003', inputPricePer1M: 0.15, outputPricePer1M: 0.6 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', tier: 'standard', estimatedCostPerRequest: 0.04, costLabel: '~$0.04', inputPricePer1M: 2.5, outputPricePer1M: 10 },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', tier: 'standard', estimatedCostPerRequest: 0.06, costLabel: '~$0.06', inputPricePer1M: 3, outputPricePer1M: 15 },
  { id: 'gemini-2.5-pro', name: 'Gemini Pro', provider: 'google', tier: 'standard', estimatedCostPerRequest: 0.04, costLabel: '~$0.04', inputPricePer1M: 1.25, outputPricePer1M: 10 },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', tier: 'premium', estimatedCostPerRequest: 0.30, costLabel: '~$0.30', inputPricePer1M: 15, outputPricePer1M: 75 },
]

export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.id === modelId)
}

export function getModelsByProvider(provider: string): ModelInfo[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider)
}

export const TIER_LABELS: Record<ModelTier, { label: string; badge: string; color: string }> = {
  economy: { label: 'Económico', badge: '$', color: 'green' },
  standard: { label: 'Estándar', badge: '$$', color: 'blue' },
  premium: { label: 'Premium', badge: '$$$', color: 'purple' },
}
