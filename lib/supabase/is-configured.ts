export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'eyJ...'
  )
}

/**
 * Si se permite el bypass de desarrollo: sin Supabase, la app corre con un
 * usuario ficticio y sin auth.
 *
 * Solo fuera de producción. Un deploy al que le falten las vars de Supabase
 * (los previews de Vercel, por ejemplo, que las tenían solo en Production)
 * quedaba abierto en una URL pública, con todos los visitantes compartiendo
 * el mismo usuario y las mismas API keys. Ahora ese caso se cierra.
 *
 * NODE_ENV vale 'production' en cualquier build de Vercel, preview incluido.
 */
export function isDevBypassAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}
