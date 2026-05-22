'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
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
  LogOut,
  Palette,
  Building,
  Wrench,
} from 'lucide-react'
import { useLogout } from '@/lib/hooks/useAuth'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Ringkasan performa & statistik' },
  { href: '/consultations', label: 'Consultations', icon: CalendarDays, hint: 'Kelola data leads konsultasi' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, hint: 'Laporan & analitik mendalam' },
  { href: '/accounts', label: 'Cabang / Accounts', icon: Building, hint: 'Manajemen cabang dan akun', adminOnly: true },
  { href: '/master-data', label: 'Master Data', icon: Database, hint: 'Kategori, status & data referensi', adminOnly: true },
  { href: '/report-attendances', label: 'Absensi', icon: FileSpreadsheet, hint: 'Laporan absensi harian' },
  { href: '/audit-logs', label: 'Audit Logs', icon: History, hint: 'Log aktivitas sistem', adminOnly: true },
  { href: '/debug', label: 'Debug & Test', icon: Wrench, hint: 'Data dummy & pengujian sistem' },
  { href: '/settings', label: 'Settings', icon: Settings, hint: 'Pengaturan akun & preferensi' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isOpen, toggle, close } = useSidebarStore()
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogout()

  const handleLogout = () => logoutMutation.mutate()
  const userThemeColor = user?.primary_color || '#f59e0b'

  return (
    <TooltipProvider delay={isOpen ? 9999 : 350}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 flex flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-2xl transition-all duration-300 ease-in-out z-50',
          'lg:relative lg:translate-x-0 lg:bg-sidebar/75 lg:backdrop-blur-xl',
          isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0'
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
            <Palette
              className="h-6 w-6 shrink-0"
              style={{
                color: userThemeColor,
                filter: `drop-shadow(0 0 8px ${userThemeColor}60)`,
              }}
            />
            <span className="font-bold text-base tracking-wider whitespace-nowrap uppercase bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
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
            if (link.adminOnly && user?.role !== 'super_admin') return null

            const isActive = pathname === link.href
            const Icon = link.icon

            return (
              <Tooltip key={link.href}>
                <TooltipTrigger className="w-full text-left">
                  <Link
                    href={link.href}
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
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-950 font-extrabold shrink-0 text-xs"
              style={{
                background: `linear-gradient(135deg, ${userThemeColor}, color-mix(in srgb, ${userThemeColor} 70%, black))`,
                boxShadow: `0 4px 12px ${userThemeColor}25`,
              }}
            >
              {user?.name.slice(0, 2).toUpperCase() || 'US'}
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            )}
            {isOpen && (
              <Tooltip>
                <TooltipTrigger
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-red-400 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  Keluar dari akun
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
