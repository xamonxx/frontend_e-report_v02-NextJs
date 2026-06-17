'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Plus,
  Building,
  FileSpreadsheet,
  Database,
  History,
  Wrench,
  Settings,
  LogOut,
  MoreHorizontal,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useLogout } from '@/lib/hooks/useAuth'
import { prefetchRoute } from '@/lib/prefetch'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  hint?: string
  superOnly?: boolean
}

// The four tabs that flank the centre (+) FAB. Identical for every role so the
// bar never shifts shape between admin and super-admin.
const PRIMARY_TABS: NavItem[] = [
  { href: '/dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/consultations', label: 'Konsultasi', icon: CalendarDays },
  { href: '/analytics', label: 'Analisa', icon: BarChart3 },
]

// Overflow items surfaced in the "More" sheet. Role gating mirrors the sidebar.
const MORE_ITEMS: NavItem[] = [
  { href: '/accounts', label: 'Akun', icon: Building, hint: 'Manajemen akun', superOnly: true },
  { href: '/report-attendances', label: 'Absensi', icon: FileSpreadsheet, hint: 'Laporan absensi harian' },
]

// Carves a semicircle out of the pill's top-centre edge so the FAB nests in it.
// Positioned at the top-centre (50% 0); transparent inside ~32px, opaque outside.
const NOTCH_MASK =
  'radial-gradient(circle 33px at 50% 0%, transparent 0 31px, #000 33px)'

// Items grouped under "Pengaturan" inside the More sheet.
const SETTINGS_ITEMS: NavItem[] = [
  { href: '/master-data', label: 'Master Data', icon: Database, hint: 'Kategori, status & referensi', superOnly: true },
  { href: '/audit-logs', label: 'Audit Log', icon: History, hint: 'Log aktivitas sistem', superOnly: true },
  { href: '/debug', label: 'Debug & Test', icon: Wrench, hint: 'Data dummy & pengujian', superOnly: true },
  { href: '/settings', label: 'Pengaturan', icon: Settings, hint: 'Preferensi & akun' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogout()
  const [moreOpen, setMoreOpen] = useState(false)

  const isSuperAdmin = user?.role === 'super_admin'
  const visible = (item: NavItem) => !item.superOnly || isSuperAdmin

  const moreItems = MORE_ITEMS.filter(visible)
  const settingsItems = SETTINGS_ITEMS.filter(visible)

  // Highlight "More" whenever the active route lives inside the sheet.
  const moreActive = [...moreItems, ...settingsItems].some((i) => pathname.startsWith(i.href))

  const handlePrefetch = (href: string) => {
    if (href !== pathname) prefetchRoute(queryClient, href)
  }

  // Close the sheet on navigation and lock body scroll while it is open.
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [moreOpen])

  const userThemeColor = user?.primary_color || '#f59e0b'

  return (
    <>
      {/* ── More sheet ─────────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-[60] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <button
              aria-label="Tutup menu"
              onClick={() => setMoreOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 360 }}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card/95 backdrop-blur-xl shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.45)]"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            >
              {/* Grab handle */}
              <div className="flex justify-center pt-3 pb-1">
                <span className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
              </div>

              <div className="flex items-center justify-between px-5 pb-3 pt-1">
                <h2 className="text-sm font-bold text-foreground">Menu Lainnya</h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick items grid */}
              {moreItems.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 px-5 pb-4">
                  {moreItems.map((item) => (
                    <SheetTile
                      key={item.href}
                      item={item}
                      active={pathname.startsWith(item.href)}
                      themeColor={userThemeColor}
                      onPrefetch={handlePrefetch}
                    />
                  ))}
                </div>
              )}

              {/* Pengaturan group */}
              <div className="px-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Pengaturan
                </p>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30 divide-y divide-border/50">
                  {settingsItems.map((item) => {
                    const Icon = item.icon
                    const active = pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onTouchStart={() => handlePrefetch(item.href)}
                        className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            background: active ? `${userThemeColor}1a` : 'var(--muted)',
                            color: active ? userThemeColor : undefined,
                          }}
                        >
                          <Icon className={cn('h-[18px] w-[18px]', !active && 'text-muted-foreground')} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                          {item.hint && (
                            <span className="block truncate text-[11px] text-muted-foreground">{item.hint}</span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Logout */}
              <div className="px-5 pt-4">
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 py-3 text-sm font-semibold text-red-500 transition-colors active:bg-red-500/10 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {logoutMutation.isPending ? 'Keluar...' : 'Keluar dari akun'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating pill bar with centre notch ───────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden px-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="relative mx-auto max-w-sm">
          {/* Centre FAB — cradled in the notch */}
          <Link
            href="/consultations/create"
            onTouchStart={() => handlePrefetch('/consultations/create')}
            aria-label="Tambah data konsultasi"
            className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-zinc-950 transition-transform active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${userThemeColor}, color-mix(in srgb, ${userThemeColor} 65%, black))`,
              boxShadow: `0 10px 24px -6px ${userThemeColor}80`,
            }}
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </Link>

          {/* Pill — a semicircle notch is carved from the top-centre via mask */}
          <div
            className="relative flex h-16 items-stretch rounded-[28px]"
            style={{
              background: 'var(--card)',
              WebkitMaskImage: NOTCH_MASK,
              maskImage: NOTCH_MASK,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
              filter: 'drop-shadow(0 6px 16px rgba(15,23,42,0.22))',
            }}
          >
            {/* Left group */}
            <div className="flex flex-1">
              {PRIMARY_TABS.slice(0, 2).map((tab) => (
                <Tab
                  key={tab.href}
                  item={tab}
                  active={pathname.startsWith(tab.href)}
                  themeColor={userThemeColor}
                  onPrefetch={handlePrefetch}
                />
              ))}
            </div>

            {/* Notch gap (keeps icons clear of the centre cut-out) */}
            <div className="w-16 shrink-0" aria-hidden="true" />

            {/* Right group */}
            <div className="flex flex-1">
              <Tab
                item={PRIMARY_TABS[2]}
                active={pathname.startsWith(PRIMARY_TABS[2].href)}
                themeColor={userThemeColor}
                onPrefetch={handlePrefetch}
              />
              <button
                onClick={() => setMoreOpen(true)}
                aria-label="Menu lainnya"
                className="relative flex flex-1 items-center justify-center"
              >
                <TabInner icon={MoreHorizontal} label="Lainnya" active={moreActive} themeColor={userThemeColor} />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

/* ── A single bottom-bar tab (Link) ───────────────────────────── */
function Tab({
  item,
  active,
  themeColor,
  onPrefetch,
}: {
  item: NavItem
  active: boolean
  themeColor: string
  onPrefetch: (href: string) => void
}) {
  return (
    <Link
      href={item.href}
      onTouchStart={() => onPrefetch(item.href)}
      aria-label={item.label}
      className="relative flex flex-1 items-center justify-center"
    >
      <TabInner icon={item.icon} label={item.label} active={active} themeColor={themeColor} />
    </Link>
  )
}

function TabInner({
  icon: Icon,
  label,
  active,
  themeColor,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  themeColor: string
}) {
  return (
    <span className="flex flex-col items-center justify-center gap-1">
      <span className="relative flex h-7 w-10 items-center justify-center rounded-xl transition-colors">
        {/* Soft highlight behind the active icon */}
        <span
          className={cn(
            'absolute inset-0 rounded-xl transition-opacity duration-300',
            active ? 'opacity-100' : 'opacity-0'
          )}
          style={{ background: `${themeColor}1f` }}
        />
        <Icon
          className={cn(
            'relative h-[21px] w-[21px] transition-transform duration-200',
            active ? 'scale-110' : 'text-muted-foreground'
          )}
          style={{ color: active ? themeColor : undefined }}
        />
      </span>
      <span
        className={cn(
          'text-[10px] leading-none transition-colors',
          active ? 'font-semibold' : 'font-medium text-muted-foreground'
        )}
        style={{ color: active ? themeColor : undefined }}
      >
        {label}
      </span>
    </span>
  )
}

/* ── A quick-action tile in the More sheet ────────────────────── */
function SheetTile({
  item,
  active,
  themeColor,
  onPrefetch,
}: {
  item: NavItem
  active: boolean
  themeColor: string
  onPrefetch: (href: string) => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onTouchStart={() => onPrefetch(item.href)}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-4 transition-colors active:scale-[0.98]',
        active ? 'border-transparent' : 'border-border/60 bg-muted/30'
      )}
      style={active ? { background: `${themeColor}14`, borderColor: `${themeColor}40` } : undefined}
    >
      <Icon
        className={cn('h-6 w-6', !active && 'text-muted-foreground')}
        style={{ color: active ? themeColor : undefined }}
      />
      <span
        className={cn('text-xs font-semibold', active ? '' : 'text-foreground')}
        style={{ color: active ? themeColor : undefined }}
      >
        {item.label}
      </span>
    </Link>
  )
}
