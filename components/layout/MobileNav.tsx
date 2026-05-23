'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Bot, History, Settings } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store/ui'
import { AGENT_CATEGORIES } from '@/lib/utils/constants'
import { Logo } from './Logo'

const MOBILE_TABS = [
  { href: '/hub', label: 'Hub', icon: Home },
  { href: '/agents', label: 'Agentes', icon: Bot },
  { href: '/history', label: 'Historial', icon: History },
  { href: '/settings', label: 'Config', icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-14">
        {MOBILE_TABS.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors',
                active ? 'text-brand' : 'text-muted-foreground'
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileSidebarSheet() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  const pathname = usePathname()

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
        <div className="flex items-center px-4 h-16">
          <Logo size={28} />
        </div>
        <Separator className="bg-sidebar-border" />
        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <Link
            href="/hub"
            onClick={() => setMobileSidebarOpen(false)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-3',
              pathname === '/hub'
                ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                : 'text-muted-foreground'
            )}
          >
            <Home className="h-4 w-4" />
            Hub
          </Link>

          <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Categorías
          </span>

          <div className="mt-2 space-y-1">
            {AGENT_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.id}
                  href={`/agents?category=${cat.id}`}
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                >
                  <Icon className="h-4 w-4" style={{ color: cat.color }} />
                  {cat.label}
                </Link>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
