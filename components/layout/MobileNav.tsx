'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Bot, History, TrendingUp, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_TABS = [
  { href: '/hub', label: 'Hub', icon: Home },
  { href: '/agents', label: 'Agentes', icon: Bot },
  { href: '/history', label: 'Historial', icon: History },
  { href: '/usage', label: 'Uso', icon: TrendingUp },
  { href: '/settings', label: 'Config', icon: Settings },
] as const

/**
 * Bottom nav de mobile. Reemplaza al sheet lateral con categorías: con estos
 * 5 tabs más el catálogo filtrable en /agents no queda contenido que
 * justifique un drawer aparte.
 */
export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-16 items-center justify-around">
        {MOBILE_TABS.map((tab) => {
          const active =
            tab.href === '/hub' ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex min-w-11 flex-col items-center gap-1 px-3 py-1.5 transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
