import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileBottomNav } from '@/components/layout/MobileNav'
import { getUser } from '@/lib/auth/dal'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // El proxy ya redirige, pero esta es la verificación que realmente manda:
  // el proxy no debe ser la única línea de defensa.
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar isAdmin={user.isAdmin} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar userEmail={user.email} isAdmin={user.isAdmin} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
