'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AGENT_CATEGORIES } from '@/lib/utils/constants'

const FEATURED_AGENTS = [
  { slug: 'content-engine', name: 'Content Engine', category: 'copy', description: 'Genera ideas, hooks y scripts' },
  { slug: 'product-hunter', name: 'Product Hunter', category: 'research', description: 'Encuentra productos ganadores' },
  { slug: 'meta-doctor', name: 'Meta Doctor', category: 'ads', description: 'Diagnostica tus campañas' },
  { slug: 'ugc-scripts', name: 'UGC Scripts', category: 'ugc', description: 'Guiones UGC con tu voz de marca' },
  { slug: 'image-prompts', name: 'Image Prompts', category: 'ugc', description: 'Prompts para imágenes IA' },
  { slug: 'shopify-assistant', name: 'Shopify Assistant', category: 'ecommerce', description: 'Ayuda con tu tienda' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function HubPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand" />
          <h2 className="text-2xl font-bold tracking-tight">
            ¿Qué quieres hacer hoy?
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Elige una categoría o usa directamente un agente para empezar
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        {AGENT_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <motion.div key={cat.id} variants={item}>
              <Link href={`/agents?category=${cat.id}`}>
                <Card className="group hover:border-brand/30 transition-all duration-200 hover:shadow-lg hover:shadow-brand/5 cursor-pointer h-full">
                  <CardContent className="p-4 space-y-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-brand transition-colors">
                        {cat.label}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold">Acceso rápido</h3>
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {FEATURED_AGENTS.map((agent) => {
            const cat = AGENT_CATEGORIES.find((c) => c.id === agent.category)
            return (
              <motion.div key={agent.slug} variants={item}>
                <Link href={`/agents/${agent.slug}`}>
                  <Card className="group hover:border-brand/20 transition-all duration-200 cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat?.color || '#9500FF'}15` }}
                      >
                        {cat && <cat.icon className="h-4 w-4" style={{ color: cat.color }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate group-hover:text-brand transition-colors">
                            {agent.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                            {cat?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
