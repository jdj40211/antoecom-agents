'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { KeyRound } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUserKeys } from '@/lib/store/user-keys'
import { fadeIn } from '@/lib/motion/variants'

/**
 * Aviso para quien todavía no cargó ninguna API key.
 *
 * Los agentes corren con la key del usuario, así que sin una no se puede
 * ejecutar nada. Antes eso se descubría recién al apretar Ejecutar, con el
 * formulario ya lleno.
 */
export function KeysBanner() {
  const { ready, hasAnyValidKey } = useUserKeys()

  if (!ready || hasAnyValidKey) return null

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn}>
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
            <KeyRound className="size-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Cargá una API key para empezar
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Los agentes corren con tu propia key, así que pagás solo lo que usás y nadie
              más ve tu consumo. Con una alcanza para arrancar.
            </p>
          </div>
          <Button size="sm" render={<Link href="/settings/keys" />} className="shrink-0">
            Configurar
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
