'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { prefetchRoute } from '@/lib/prefetch'
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Database,
  FileSpreadsheet,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  Building,
  Wrench,
  ClipboardCheck,
  ClipboardList,
} from 'lucide-react'
import Logo from '@/components/brand/logo'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { canAccess } from '@/lib/auth/roles'
import type { UserRole } from '@/types'

const NAV_LINKS: { href: string; label: string; icon: typeof LayoutDashboard; hint: string; roles?: UserRole[] }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Ringkasan performa & statistik', roles: ['admin'] },
  { href: '/consultations', label: 'Konsultasi', icon: CalendarDays, hint: 'Kelola data leads konsultasi', roles: ['admin'] },
  { href: '/analytics', label: 'Analitik', icon: BarChart3, hint: 'Laporan & analitik mendalam', roles: ['admin'] },
  { href: '/surveys', label: 'Survey', icon: ClipboardCheck, hint: 'Penugasan dan hasil survey', roles: ['admin', 'manager_surveyor', 'surveyor'] },
  { href: '/rekap-jadwal-surveyor', label: 'Rekap Jadwal', icon: CalendarDays, hint: 'Jadwal mingguan surveyor', roles: ['manager_surveyor'] },
  { href: '/survey-consumers', label: 'Data Konsumen Survey', icon: ClipboardList, hint: 'Daftar konsumen dan hasil survey', roles: ['manager_surveyor'] },
  { href: '/accounts', label: 'Akun', icon: Building, hint: 'Manajemen akun', roles: ['super_admin'] },
  { href: '/master-data', label: 'Master Data', icon: Database, hint: 'Kategori, status & data referensi', roles: ['super_admin'] },
  { href: '/report-attendances', label: 'Absensi', icon: FileSpreadsheet, hint: 'Laporan absensi harian', roles: ['admin'] },
  { href: '/audit-logs', label: 'Audit Logs', icon: History, hint: 'Log aktivitas sistem', roles: ['super_admin'] },
  { href: '/debug', label: 'Debug & Test', icon: Wrench, hint: 'Data dummy & pengujian sistem', roles: ['super_admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, hint: 'Pengaturan akun & preferensi' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { isOpen, toggle, close } = useSidebarStore()
  const user = useAuthStore((s) => s.user)

  // Warm the route's data cache on hover/focus (skip the page we're already on).
  const handlePrefetch = (href: string) => {
    if (href !== pathname) prefetchRoute(queryClient, href)
  }
  const userThemeColor = user?.primary_color || '#f59e0b'

  return (
    <TooltipProvider delay={isOpen ? 9999 : 350}>
      <aside
        className={cn(
          // Desktop-only: the mobile bottom nav replaces the sidebar on small screens.
          'hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm transition-all duration-300 ease-in-out z-50',
          'lg:relative lg:translate-x-0 lg:bg-sidebar/90 lg:backdrop-blur-sm',
          isOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border/60 bg-sidebar/20">
          <div
            className={cn(
              'flex items-center gap-2 overflow-hidden transition-all duration-300',
              !isOpen && 'opacity-0 w-0'
            )}
          >
            <Logo
              className="h-6 w-6 shrink-0"
              style={{
                color: userThemeColor,
                filter: `drop-shadow(0 0 8px ${userThemeColor}60)`,
              }}
            />
            <span className="font-bold text-base tracking-wider whitespace-nowrap uppercase text-amber-500">
              Putra Corp
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger
              onClick={toggle}
              className="rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
            >
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[11px]">
              {isOpen ? 'Tutup menu' : 'Buka menu'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-2.5 py-5 overflow-y-auto">
          {NAV_LINKS.map((link) => {
            if (!canAccess(user, link.roles)) return null

            const isActive = pathname === link.href
            const Icon = link.icon

            return (
              <Tooltip key={link.href}>
                <TooltipTrigger className="w-full text-left">
                  <Link
                    href={link.href}
                    onMouseEnter={() => handlePrefetch(link.href)}
                    onFocus={() => handlePrefetch(link.href)}
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) close()
                    }}
                    style={{ borderColor: isActive ? userThemeColor : 'transparent' }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 group border-l-2 relative overflow-hidden',
                      isActive
                        ? 'bg-amber-500/5 text-sidebar-foreground font-semibold shadow-lg shadow-amber-500/5'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-[2px]'
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute inset-0 opacity-5 pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse at left, ${userThemeColor}, transparent 70%)`,
                        }}
                      />
                    )}
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-105',
                        !isActive && 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90'
                      )}
                      style={{ color: isActive ? userThemeColor : undefined }}
                    />
                    <span
                      className={cn(
                        'transition-all duration-300 whitespace-nowrap',
                        !isOpen && 'opacity-0 w-0 pointer-events-none'
                      )}
                    >
                      {link.label}
                    </span>
                  </Link>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right" className="text-[11px]">
                    <span className="font-semibold block">{link.label}</span>
                    <span className="opacity-70 text-[10px]">{link.hint}</span>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-sidebar-border/60 p-3 bg-sidebar/20">
          <div className="flex items-center justify-center">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40"
              style={{
                boxShadow: `0 4px 12px ${userThemeColor}18`,
              }}
            >
              <Logo
                className="h-5 w-5"
                style={{
                  color: userThemeColor,
                  filter: `drop-shadow(0 0 7px ${userThemeColor}55)`,
                }}
              />
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
