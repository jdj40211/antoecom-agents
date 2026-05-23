'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function ProfilePage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tu perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-brand/20 text-brand text-xl font-semibold">
                  U
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Usuario</p>
                <Badge variant="secondary" className="mt-1">Club</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input placeholder="Tu nombre" defaultValue="" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="tu@email.com" disabled />
              </div>
            </div>

            <Button className="bg-brand hover:bg-brand-dark text-white">
              Guardar cambios
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
