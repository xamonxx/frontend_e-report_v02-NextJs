'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { useSidebarStore } from '@/lib/stores/sidebarStore'
import { useLogout } from '@/lib/hooks/useAuth'
import { usePathname, useRouter } from 'next/navigation'
import NotificationCenter from './notification-center'
import ThemeToggle from './theme-toggle'
import { Landmark, User, Shield, Menu, ChevronRight, Settings, LogOut, Clock, Building, ShieldCheck, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/consultations': 'Konsultasi',
  '/analytics': 'Analitik',
  '/accounts': 'Cabang & Akun',
  '/master-data': 'Master Data',
  '/report-attendances': 'Absensi',
  '/audit-logs': 'Audit Logs',
  '/debug': 'Debug & Testing',
  '/settings': 'Pengaturan',
}

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const toggleSidebar = useSidebarStore((s) => s.toggle)
  const pathname = usePathname()
  const logoutMutation = useLogout()

  const pageName = Object.entries(PAGE_NAMES).find(([key]) => pathname.startsWith(key))?.[1] ?? ''

  const lastLogin = user?.last_login_at
    ? new Date(user.last_login_at).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <TooltipProvider delay={400}>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card/30 px-4 sm:px-6 backdrop-blur-xl z-20">

        {/* Left: menu toggle + account context + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger
              onClick={toggleSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/40 text-muted-foreground hover:text-foreground lg:hidden hover:bg-accent transition-colors cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[11px]">Toggle menu</TooltipContent>
          </Tooltip>

          {user?.account ? (
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-2 rounded-xl bg-card/30 px-3 py-1.5 border border-border/60 backdrop-blur-md shadow-sm cursor-default">
                <Landmark className="h-4 w-4 text-amber-500 drop-shadow-[0_0_4px_var(--primary-theme)] shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground truncate max-w-[140px]">
                  {user.account.name}
                </span>
                {user.role === 'super_admin' && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/20 bg-amber-500/5 text-amber-400 text-[10px] h-4 font-semibold shrink-0"
                  >
                    Super Admin
                  </Badge>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Akun aktif: {user.account.name}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-2 rounded-xl bg-card/30 px-3 py-1.5 border border-border/60 backdrop-blur-md shadow-sm cursor-default">
                <Shield className="h-4 w-4 text-amber-500 drop-shadow-[0_0_4px_var(--primary-theme)] shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground">Super Admin</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Mode Super Admin — akses semua akun
              </TooltipContent>
            </Tooltip>
          )}

          {pageName && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-500">
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold text-zinc-400 truncate">{pageName}</span>
            </div>
          )}
        </div>

        {/* Right: theme toggle, notifications, profile */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />
          <NotificationCenter />
          <div className="h-4 w-[1px] bg-border" />

          {/* Profile Popover */}
          <Popover>
            <PopoverTrigger className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-muted/60 transition-colors cursor-pointer group">
              <div className="hidden text-right md:block">
                <p className="text-xs font-semibold text-foreground/90 truncate max-w-[120px] group-hover:text-foreground transition-colors">
                  {user?.name}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border text-amber-500 shadow-inner group-hover:border-amber-500/40 group-hover:bg-amber-500/5 transition-all">
                <User className="h-4 w-4 drop-shadow-[0_0_6px_var(--primary-theme)]" />
              </div>
            </PopoverTrigger>

            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="w-72 p-0 border-border bg-card shadow-xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden"
            >
              {/* Profile header */}
              <div className="relative px-4 pt-4 pb-3 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent border-b border-border dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
                    <User className="h-6 w-6 drop-shadow-[0_0_8px_var(--primary-theme)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0",
                        user?.role === 'super_admin'
                          ? "border-amber-500/30 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20"
                          : "border-border text-muted-foreground dark:border-zinc-700"
                      )}
                    >
                      {user?.role === 'super_admin' ? (
                        <><ShieldCheck className="h-2.5 w-2.5 mr-1 inline" />Super Admin</>
                      ) : (
                        'Admin'
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div className="px-4 py-3 space-y-2.5">
                {user?.account && (
                  <div className="flex items-center gap-2.5 text-[11px]">
                    <Building className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-muted-foreground">Cabang:</span>
                    <span className="font-semibold text-foreground/80 truncate">{user.account.name}</span>
                  </div>
                )}
                {lastLogin && (
                  <div className="flex items-center gap-2.5 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-muted-foreground">Login terakhir:</span>
                    <span className="font-semibold text-foreground/70 truncate">{lastLogin}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-border px-2 py-2 space-y-0.5 dark:border-zinc-800">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors dark:hover:bg-zinc-800"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  Pengaturan Akun
                </Link>

                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-950/20 disabled:opacity-50"
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  {logoutMutation.isPending ? 'Keluar...' : 'Keluar'}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
    </TooltipProvider>
  )
}
