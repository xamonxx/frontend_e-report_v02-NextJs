'use client'

import Sidebar from './sidebar'
import Header from './header'
import BottomNav from './bottom-nav'
import { AuthGuard } from '../auth-guard'
import { usePathname } from 'next/navigation'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { useEffect } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const { isOpen, close } = useSidebarStore()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      const themeColor = (!isLoginPage && user?.primary_color) ? user.primary_color : '#f59e0b'
      root.style.setProperty('--primary-theme', themeColor)
    }
  }, [user?.primary_color, isLoginPage])

  useEffect(() => {
    // Automatically close sidebar on initial load on mobile/tablet screens
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      close()
    }
  }, [close])

  if (isLoginPage) {
    return <AuthGuard>{children}</AuthGuard>
  }

  return (
    <AuthGuard>
      <div className="flex h-screen w-screen bg-background overflow-hidden text-foreground relative">
        {/* Sphere grid backdrop (theme-aware: light vs dark) */}
        <div className="app-grid-bg absolute inset-0 z-0 pointer-events-none" />

        {/* Decorative subtle glows */}
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-amber-500/[0.02] blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-0 left-[200px] h-[300px] w-[300px] rounded-full bg-amber-700/[0.015] blur-[100px] pointer-events-none z-0" />

        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Overlay Backdrop */}
        {isOpen && (
          <div
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden cursor-pointer transition-opacity duration-300"
          />
        )}

        {/* Main Work Area */}
        <div className="flex flex-1 flex-col overflow-hidden z-10">
          {/* Top Navigation / Quick Info */}
          <Header />

          {/* Dynamic Content Frame */}
          <main className="flex-1 overflow-y-auto bg-muted/10 dark:bg-zinc-950/5 p-4 sm:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile-only Bottom Navigation */}
        <BottomNav />
      </div>
    </AuthGuard>
  )
}
