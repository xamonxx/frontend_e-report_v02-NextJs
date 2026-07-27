'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { useLogout } from '@/lib/hooks/useAuth'
import { usePathname } from 'next/navigation'
import NotificationCenter from './notification-center'
import ThemeToggle from './theme-toggle'
import PwaInstallButton from './pwa-install-button'
import {
  User,
  Shield,
  Settings,
  LogOut,
  Clock,
  ShieldCheck,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { roleLabel, isSuperAdmin } from '@/lib/auth/roles'
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
import { APP_BAR_HEIGHT_CLASS } from './header-action'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/consultations': 'Konsultasi',
  '/analytics': 'Analitik',
  '/geo-analytics': 'Analisis Wilayah',
  '/surveys': 'Survey',
  '/rekap-jadwal-surveyor': 'Rekap Jadwal',
  '/survey-consumers': 'Data Konsumen Survey',
  '/accounts': 'Akun',
  '/master-data': 'Master Data',
  '/report-attendances': 'Absensi',
  '/audit-logs': 'Audit Logs',
  '/settings': 'Pengaturan',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const pathname = usePathname()
  const logoutMutation = useLogout()
  const userRoleLabel = roleLabel(user)
  const primaryColor = user?.primary_color || '#f59e0b'

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
      <header className={cn(APP_BAR_HEIGHT_CLASS, 'z-20 flex min-w-0 items-center justify-between border-b border-border/60 bg-card/60 px-4 backdrop-blur-lg sm:px-6')}>
        {/* -- Left: account context + breadcrumb -- */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-4">
          {user?.account ? (
            <Tooltip>
              <TooltipTrigger className="flex min-w-0 items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5 cursor-default focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_50%,transparent)]">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-md text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {user.account.name.charAt(0)}
                </div>
                {/* No cap below sm: the flex parent is already the binding
                    constraint there, so a fixed max-width only truncated earlier
                    than it had to. */}
                <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground sm:max-w-[160px]">
                  {user.account.name}
                </span>
                {isSuperAdmin(user) && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500 border border-amber-500/20">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    SA
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Akun: {user.account.name}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger className="flex min-w-0 items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5 cursor-default focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_50%,transparent)]">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-md text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Shield className="h-3 w-3" />
                </div>
                <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">
                  {userRoleLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Super Admin — akses semua akun
              </TooltipContent>
            </Tooltip>
          )}

          {pageName && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="h-1 w-1 rounded-full bg-zinc-400/50 shrink-0" />
              <span className="font-medium text-zinc-500 truncate">{pageName}</span>
            </div>
          )}
        </div>

        {/* -- Right: actions + profile -- */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <PwaInstallButton />
          <ThemeToggle />
          <NotificationCenter />
          {/* The divider earns its keep once the profile trigger shows a name to
              separate from; on a phone it is one more mark in a tight row. */}
          <div className="mx-0.5 hidden h-5 w-px bg-border/60 sm:block" />

          {/* Profile */}
          <Popover>
            <PopoverTrigger className="group flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_50%,transparent)] sm:px-2">
              {/* Avatar */}
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white/10 transition-all group-hover:ring-white/20 sm:size-7"
                style={{ backgroundColor: primaryColor }}
              >
                {user?.name ? getInitials(user.name) : <User className="h-3.5 w-3.5" />}
              </div>
              {/* Name + role (desktop) */}
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-foreground/80 leading-tight group-hover:text-foreground transition-colors">
                  {user?.name}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                  {userRoleLabel}
                </p>
              </div>
              <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
            </PopoverTrigger>

            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={6}
              className="w-72 p-0 border-border/60 bg-card shadow-xl overflow-hidden"
            >
              {/* Profile card header */}
              <div
                className="relative px-4 pt-5 pb-4 border-b border-border/40"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 10%, transparent), transparent)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white text-base font-bold ring-2 ring-white/10 shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {user?.name ? getInitials(user.name) : <User className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-auto',
                          'border-amber-500/20 bg-amber-500/5 text-amber-500',
                        )}
                      >
                        {isSuperAdmin(user) ? (
                          <><ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" />Super Admin</>
                        ) : (
                          userRoleLabel
                        )}
                      </Badge>
                      {user?.account && (
                        <span className="text-[9px] text-muted-foreground/60 truncate max-w-[100px]">
                          {user.account.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div className="px-4 py-3 space-y-2.5">
                {lastLogin && (
                  <div className="flex items-center gap-2.5 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-muted-foreground">Terakhir login:</span>
                    <span className="font-semibold text-foreground/70 truncate">{lastLogin}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-border/40 px-2 py-2 space-y-0.5">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Pengaturan Akun
                </Link>

                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-950/20 disabled:opacity-50"
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
