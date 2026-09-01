import type { Variants } from 'framer-motion'

/** Duraciones en segundos, las que espera Framer Motion. */
export const DURATION = { micro: 0.12, enter: 0.2, overlay: 0.3 } as const

/** Espejo en JS del token `--ease-out-expo` de globals.css. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

/** Contenedor de listas y grids: escalona la entrada de sus hijos. */
export const listContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0 },
  },
}

/** Item de lista o grid. Va siempre dentro de `listContainer`. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.enter, ease: EASE_OUT_EXPO },
  },
}

/** Aparición simple, sin desplazamiento: secciones y paneles. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.enter, ease: EASE_OUT_EXPO },
  },
}
