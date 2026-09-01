'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Bot, History, Bookmark, TrendingUp, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserKeys } from '@/lib/store/user-keys'
import { Logo } from './Logo'

const NAV_LINKS = [
  { href: '/hub', label: 'Hub', icon: Home },
  { href: '/agents', label: 'Agentes', icon: Bot },
  { href: '/history', label: 'Historial', icon: History },
  { href: '/saved', label: 'Guardados', icon: Bookmark },
  { href: '/usage', label: 'Uso', icon: TrendingUp },
] as const

/**
 * Sidebar de escritorio: 5 accesos directos, sin el catálogo de agentes.
 *
 * El árbol de 8 categorías x 28 agentes vivía acá antes y duplicaba lo que
 * `/agents` ya resuelve con filtros. Explorar agentes ahora es tarea de esa
 * pantalla, no del shell.
 */
export function AppSidebar() {
  const pathname = usePathname()
  const { ready, hasAnyValidKey } = useUserKeys()
  const settingsActive = pathname.startsWith('/settings')
  const showKeyWarning = ready && !hasAnyValidKey

  return (
    <aside className="hidden md:sticky md:top-0 md:flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Logo size={24} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {NAV_LINKS.map((link) => {
          const active = link.href === '/hub' ? pathname === link.href : pathname.startsWith(link.href)
          return <SidebarLink key={link.href} {...link} active={active} />
        })}
      </nav>

      <div className="mt-auto shrink-0 border-t border-sidebar-border px-2.5 py-3">
        <Link
          href="/settings/keys"
          className={cn(
            'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
            settingsActive
              ? 'bg-sidebar-accent text-foreground font-medium'
              : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
          )}
        >
          <Settings className="size-4 shrink-0" />
          <span className="flex-1 truncate">Configuración</span>
          {showKeyWarning && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-warning"
              aria-label="Falta configurar una API key"
              title="Falta configurar una API key"
            />
          )}
        </Link>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-foreground font-medium'
          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}
