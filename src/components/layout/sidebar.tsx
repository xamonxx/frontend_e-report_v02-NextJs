'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { LayoutGroup, motion } from 'framer-motion'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { prefetchRoute } from '@/lib/prefetch'
import {
  Gauge,
  MessagesSquare,
  ChartNoAxesCombined,
  DatabaseZap,
  FileClock,
  History,
  ChevronLeft,
  ChevronRight,
  Building2,
  SlidersHorizontal,
  LayoutGrid,
  MapPinned,
  Globe2,
  CalendarClock,
  UsersRound,
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

const NAV_LINKS: { href: string; label: string; icon: typeof Gauge; hint: string; roles?: UserRole[] }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, hint: 'Ringkasan performa & statistik', roles: ['admin'] },
  { href: '/consultations', label: 'Konsultasi', icon: MessagesSquare, hint: 'Kelola data leads konsultasi', roles: ['admin'] },
  { href: '/analytics', label: 'Analitik', icon: ChartNoAxesCombined, hint: 'Laporan & analitik mendalam', roles: ['admin'] },
  { href: '/geo-analytics', label: 'Analisis Wilayah', icon: Globe2, hint: 'Persebaran konsumen per wilayah', roles: ['super_admin'] },
  { href: '/surveys', label: 'Survey', icon: MapPinned, hint: 'Penugasan dan hasil survey', roles: ['admin', 'manager_surveyor', 'surveyor'] },
  { href: '/rekap-jadwal-surveyor', label: 'Rekap Jadwal', icon: CalendarClock, hint: 'Jadwal mingguan surveyor', roles: ['manager_surveyor'] },
  { href: '/survey-consumers', label: 'Data Konsumen Survey', icon: UsersRound, hint: 'Daftar konsumen dan hasil survey', roles: ['manager_surveyor'] },
  { href: '/accounts', label: 'Akun', icon: Building2, hint: 'Manajemen akun', roles: ['super_admin'] },
  { href: '/master-data', label: 'Master Data', icon: DatabaseZap, hint: 'Kategori, status & data referensi', roles: ['super_admin'] },
  { href: '/report-attendances', label: 'Absensi', icon: FileClock, hint: 'Laporan absensi harian', roles: ['admin'] },
  { href: '/audit-logs', label: 'Audit Logs', icon: History, hint: 'Log aktivitas sistem', roles: ['super_admin'] },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal, hint: 'Pengaturan akun & preferensi' },
]

const activeNavTransition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.85,
} as const

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
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--primary-theme)_22%,var(--sidebar-border))] bg-[color-mix(in_srgb,var(--primary-theme)_7%,var(--sidebar-accent))] text-sidebar-foreground/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_16px_-12px_var(--primary-theme)] transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-[color:color-mix(in_srgb,var(--primary-theme)_45%,var(--sidebar-border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_13%,var(--sidebar-accent))] hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_30%,transparent)]"
            >
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[11px]">
              {isOpen ? 'Tutup menu' : 'Buka menu'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation Links */}
        <LayoutGroup id="desktop-sidebar-nav">
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
                      style={{ borderColor: isActive ? `color-mix(in srgb, ${userThemeColor} 68%, transparent)` : 'transparent' }}
                      className={cn(
                        'group relative flex items-center gap-3 overflow-hidden rounded-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition-[border-color,background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_34%,transparent)]',
                        isActive
                          ? 'text-sidebar-foreground font-semibold'
                          : 'border-transparent text-sidebar-foreground/70 hover:border-[color:color-mix(in_srgb,var(--primary-theme)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--sidebar-accent))] hover:text-sidebar-foreground'
                      )}
                    >
                      {isActive && (
                        <>
                          <motion.span
                            layoutId="sidebar-active-surface"
                            transition={activeNavTransition}
                            className="pointer-events-none absolute inset-0 rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_6%,var(--sidebar))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-theme)_10%,transparent)] backdrop-blur-sm backdrop-saturate-125"
                          />
                          <motion.span
                            layoutId="sidebar-active-rail"
                            transition={activeNavTransition}
                            className="pointer-events-none absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full"
                            style={{
                              backgroundColor: userThemeColor,
                              boxShadow: `0 0 12px ${userThemeColor}58`,
                            }}
                          />
                        </>
                      )}
                      <motion.span
                        animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.04 : 1 }}
                        transition={activeNavTransition}
                        className="relative z-10 flex shrink-0 items-center justify-center"
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 shrink-0 stroke-[2.2] transition-[color,filter] duration-200',
                            isActive
                              ? 'drop-shadow-[0_0_8px_color-mix(in_srgb,var(--primary-theme)_50%,transparent)]'
                              : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90'
                          )}
                          style={{ color: isActive ? userThemeColor : undefined }}
                        />
                      </motion.span>
                      <span
                        className={cn(
                          'relative z-10 whitespace-nowrap transition-[opacity,color] duration-300',
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
        </LayoutGroup>

        {/* User Footer */}
        <div className="border-t border-sidebar-border/60 p-3 bg-sidebar/20">
          <div className="flex items-center justify-center">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--primary-theme)_30%,var(--sidebar-border))] bg-[color-mix(in_srgb,var(--primary-theme)_11%,var(--sidebar-accent))] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
              style={{
                boxShadow: `inset 0 1px 0 rgba(255,255,255,.07), 0 8px 18px -12px ${userThemeColor}80`,
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
