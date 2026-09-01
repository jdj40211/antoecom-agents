import type { AgentDef } from '@/lib/agents/catalog'

export type ModelTier = AgentDef['modelTier']

/**
 * Etiquetas del tier de modelo. Única fuente de verdad para la UI: antes vivía
 * duplicada en el catálogo de agentes y en la pantalla de ejecución.
 */
export const TIER_LABELS: Record<ModelTier, { label: string; badge: string }> = {
  economy: { label: 'Económico', badge: '$' },
  standard: { label: 'Estándar', badge: '$$' },
  premium: { label: 'Premium', badge: '$$$' },
}

const TIER_BADGE_CLASS: Record<ModelTier, string> = {
  economy: 'bg-success/10 text-success border-success/20',
  standard: 'bg-muted text-muted-foreground border-transparent',
  premium: 'bg-elite/10 text-elite border-elite/20',
}

const TIER_TEXT_CLASS: Record<ModelTier, string> = {
  economy: 'text-success',
  standard: 'text-muted-foreground',
  premium: 'text-elite',
}

/** Clases para el badge de tier (fondo, texto y borde). */
export function tierBadgeClass(tier: ModelTier): string {
  return TIER_BADGE_CLASS[tier]
}

/** Clases solo de texto, para menciones inline como el costo estimado. */
export function tierTextClass(tier: ModelTier): string {
  return TIER_TEXT_CLASS[tier]
}

/** Etiqueta legible del tier: "Económico", "Estándar", "Premium". */
export function tierLabel(tier: ModelTier): string {
  return TIER_LABELS[tier].label
}
