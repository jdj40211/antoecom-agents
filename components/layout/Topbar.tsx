'use client'

import Link from 'next/link'
import { Search, LogOut, User, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from './Logo'

export function Topbar({
  userEmail,
  isAdmin = false,
}: {
  userEmail: string
  /** El acceso a /admin vive acá además del sidebar: es la única
   *  navegación que también se ve en el celular. */
  isAdmin?: boolean
}) {
  const initial = (userEmail.trim()[0] ?? 'U').toUpperCase()

  async function handleSignOut() {
    await fetch('/auth/signout', { method: 'POST' })
    // Recarga completa para descartar cualquier estado del cliente.
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      {/* El título de cada página vive en su propio PageHeader, no acá. */}
      <div className="flex items-center md:hidden">
        <Logo size={22} />
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <div className="relative hidden sm:flex">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar agente..."
            className="h-9 w-64 border-transparent bg-muted/50 pl-9 focus-visible:border-border"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
            <div className="px-2 py-1.5">
              <p className="max-w-[180px] truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Link href="/settings/profile" className="flex w-full items-center gap-2">
                <User className="h-4 w-4" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Link href="/admin" className="flex w-full items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Administración
                </Link>
              </DropdownMenuItem>
            )}
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
