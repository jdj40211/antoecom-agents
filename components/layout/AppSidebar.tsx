'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  History,
  Star,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AGENT_CATEGORIES } from '@/lib/utils/constants'
import { useUIStore } from '@/lib/store/ui'
import { Logo } from './Logo'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const MOCK_AGENTS: Record<string, { slug: string; name: string }[]> = {
  copy: [
    { slug: 'content-engine', name: 'Content Engine' },
    { slug: 'ugc-scripts', name: 'UGC Scripts' },
    { slug: 'caption-generator', name: 'Caption Generator' },
    { slug: 'hook-writer', name: 'Hook Writer' },
  ],
  ads: [
    { slug: 'meta-doctor', name: 'Meta Doctor' },
    { slug: 'ad-copy-generator', name: 'Ad Copy Generator' },
    { slug: 'audience-analyzer', name: 'Audience Analyzer' },
  ],
  research: [
    { slug: 'product-hunter', name: 'Product Hunter' },
    { slug: 'competitor-watch', name: 'Competitor Watch' },
    { slug: 'niche-analyzer', name: 'Niche Analyzer' },
  ],
  ugc: [
    { slug: 'image-prompts', name: 'Image Prompts' },
    { slug: 'broll-generator', name: 'B-Roll Generator' },
  ],
  ecommerce: [
    { slug: 'shopify-assistant', name: 'Shopify Assistant' },
    { slug: 'logistics-tracker', name: 'Logistics Tracker' },
    { slug: 'supplier-finder', name: 'Supplier Finder' },
    { slug: 'product-descriptions', name: 'Product Descriptions' },
  ],
  analytics: [
    { slug: 'performance-tracker', name: 'Performance Tracker' },
    { slug: 'roi-calculator', name: 'ROI Calculator' },
  ],
  strategy: [
    { slug: 'business-planner', name: 'Business Planner' },
    { slug: 'launch-checklist', name: 'Launch Checklist' },
  ],
}

const BOTTOM_LINKS = [
  { href: '/history', label: 'Historial', icon: History },
  { href: '/saved', label: 'Guardados', icon: Star },
  { href: '/usage', label: 'Uso', icon: TrendingUp },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['copy']))

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 h-16 shrink-0">
        <Logo size={28} showText={!sidebarCollapsed} />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
          />
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-2 py-3">
        <SidebarLink
          href="/hub"
          icon={Home}
          label="Hub"
          active={pathname === '/hub'}
          collapsed={sidebarCollapsed}
        />

        <div className="mt-3 mb-1">
          {!sidebarCollapsed && (
            <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Agentes
            </span>
          )}
        </div>

        {AGENT_CATEGORIES.map((cat) => {
          const agents = MOCK_AGENTS[cat.id] || []
          const isExpanded = expandedCategories.has(cat.id) && !sidebarCollapsed
          const Icon = cat.icon
          const hasActiveChild = agents.some((a) => pathname === `/agents/${a.slug}`)

          if (sidebarCollapsed) {
            return (
              <Link
                key={cat.id}
                href={`/agents?category=${cat.id}`}
                title={cat.label}
                className={cn(
                  'flex items-center justify-center h-9 w-full rounded-md mb-0.5 transition-colors',
                  hasActiveChild
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" style={{ color: cat.color }} />
              </Link>
            )
          }

          return (
            <div key={cat.id} className="mb-0.5">
              <button
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors',
                  hasActiveChild
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
                <span className="flex-1 text-left truncate">{cat.label}</span>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    {agents.map((agent) => (
                      <Link
                        key={agent.slug}
                        href={`/agents/${agent.slug}`}
                        className={cn(
                          'flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-md text-[13px] transition-colors',
                          pathname === `/agents/${agent.slug}`
                            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                        )}
                      >
                        <span className="truncate">{agent.name}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      <div className="px-2 py-3 space-y-0.5 shrink-0">
        {BOTTOM_LINKS.map((link) => (
          <SidebarLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            active={pathname.startsWith(link.href)}
            collapsed={sidebarCollapsed}
          />
        ))}
      </div>
    </motion.aside>
  )
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
