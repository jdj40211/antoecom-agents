'use client'

import { motion } from 'framer-motion'
import { Star, BookmarkX } from 'lucide-react'

export default function SavedPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookmarkX className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Sin outputs guardados</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Cuando ejecutes un agente, puedes guardar el resultado para acceder a él después
        </p>
      </motion.div>
    </div>
  )
}
