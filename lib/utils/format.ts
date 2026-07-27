/** "Hace 2 horas", "Ayer", "Hace 3 días"... */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) return 'Recién'
  if (minutes < 60) return `Hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} días`

  const months = Math.floor(days / 30)
  if (months < 12) return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`

  const years = Math.floor(months / 12)
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`
}

export function formatTokens(tokens: number): string {
  return tokens.toLocaleString('es-CO')
}

/** Los costos son chicos, así que redondear a 2 decimales muestra "$0.00". */
export function formatCost(usd: number): string {
  if (usd === 0) return '$0'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}
