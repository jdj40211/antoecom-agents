'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, Search, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUIStore } from '@/lib/store/ui'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/hub': { title: 'Hub', subtitle: '¿Qué quieres hacer hoy?' },
  '/agents': { title: 'Agentes', subtitle: 'Explora todos los agentes disponibles' },
  '/history': { title: 'Historial', subtitle: 'Tus ejecuciones recientes' },
  '/saved': { title: 'Guardados', subtitle: 'Outputs que has guardado' },
  '/usage': { title: 'Uso', subtitle: 'Tu consumo de tokens y costos' },
  '/settings': { title: 'Configuración', subtitle: 'API keys y perfil' },
  '/settings/keys': { title: 'API Keys', subtitle: 'Configura tus proveedores de IA' },
  '/settings/profile': { title: 'Perfil', subtitle: 'Tu información personal' },
}

export function Topbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const { setMobileSidebarOpen } = useUIStore()

  const pageInfo = PAGE_TITLES[pathname] || { title: 'AntoEcom Agents', subtitle: '' }
  const initial = (userEmail.trim()[0] ?? 'U').toUpperCase()

  async function handleSignOut() {
    await fetch('/auth/signout', { method: 'POST' })
    // Recarga completa para descartar cualquier estado del cliente.
    window.location.href = '/login'
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{pageInfo.title}</h1>
          {pageInfo.subtitle && (
            <p className="text-xs text-muted-foreground">{pageInfo.subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar agente..."
            className="pl-9 w-56 h-9 bg-muted/50 border-transparent focus-visible:border-border"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors cursor-pointer outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand/20 text-brand text-xs font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {userEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Link href="/settings/profile" className="flex items-center gap-2 w-full">
                <User className="h-4 w-4" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
