'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { KeyRound, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUserKeys } from '@/lib/store/user-keys'

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
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-brand/30 bg-brand/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
            <KeyRound className="h-4 w-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Cargá una API key para empezar</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Los agentes corren con tu propia key, así que pagás solo lo que usás y nadie
              más ve tu consumo. Con una alcanza para arrancar.
            </p>
          </div>
          <Link href="/settings/keys" className="shrink-0">
            <Button size="sm" className="bg-brand hover:bg-brand-dark text-white gap-1.5">
              Configurar
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}
