'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessagesSquare,
  ChartNoAxesCombined,
  Plus,
  Building2,
  CalendarCheck,
  Database,
  History,
  Settings,
  LogOut,
  MoreHorizontal,
  ChevronRight,
  X,
  ClipboardCheck,
  Map,
  CalendarClock,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useLogout } from '@/lib/hooks/useAuth'
import { prefetchRoute } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { isManagerSurveyor, isSurveyTeam } from '@/lib/auth/roles'

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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/consultations', label: 'Konsultasi', icon: MessagesSquare },
  { href: '/analytics', label: 'Analisa', icon: ChartNoAxesCombined },
]

const SURVEY_TEAM_TABS: NavItem[] = [
  { href: '/surveys', label: 'Survey', icon: ClipboardCheck },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

const MANAGER_SURVEY_TABS: NavItem[] = [
  { href: '/surveys', label: 'Survey', icon: ClipboardCheck },
  { href: '/rekap-jadwal-surveyor', label: 'Rekap', icon: CalendarClock },
  { href: '/survey-consumers', label: 'Data', icon: UsersRound },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

// Overflow items surfaced in the "More" sheet. Role gating mirrors the sidebar.
const MORE_ITEMS: NavItem[] = [
  { href: '/accounts', label: 'Akun', icon: Building2, hint: 'Manajemen akun', superOnly: true },
  { href: '/geo-analytics', label: 'Analisis Wilayah', icon: Map, hint: 'Persebaran konsumen per wilayah', superOnly: true },
  { href: '/report-attendances', label: 'Absensi', icon: CalendarCheck, hint: 'Laporan absensi harian' },
]

// Notch mask is no longer needed since we are using a floating glassmorphism pill layout.

// Items grouped under "Pengaturan" inside the More sheet.
const SETTINGS_ITEMS: NavItem[] = [
  { href: '/master-data', label: 'Master Data', icon: Database, hint: 'Kategori, status & referensi', superOnly: true },
  { href: '/audit-logs', label: 'Audit Log', icon: History, hint: 'Log aktivitas sistem', superOnly: true },
  { href: '/settings', label: 'Pengaturan', icon: Settings, hint: 'Preferensi & akun' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogout()
  const [moreOpen, setMoreOpen] = useState(false)
  const [fabHovered, setFabHovered] = useState(false)

  const isSuperAdmin = user?.role === 'super_admin'
  const surveyTeam = isSurveyTeam(user)
  const primaryTabs = isManagerSurveyor(user) ? MANAGER_SURVEY_TABS : surveyTeam ? SURVEY_TEAM_TABS : PRIMARY_TABS
  const visible = (item: NavItem) => !item.superOnly || isSuperAdmin

  const moreItems = surveyTeam ? [] : MORE_ITEMS.filter(visible)
  // Pengaturan already sits in the header profile menu (alongside Keluar), which
  // is visible on mobile too. It is only kept in the sheet for super admins,
  // whose settings group holds other entries anyway.
  const settingsItems = SETTINGS_ITEMS.filter(visible).filter((item) => item.href !== '/settings' || isSuperAdmin)

  // Highlight "More" whenever the active route lives inside the sheet.
  const moreActive = [...moreItems, ...settingsItems].some((i) => pathname.startsWith(i.href))

  // With Pengaturan gone, a plain admin's sheet holds a single destination
  // (Absensi). A whole bottom sheet for one link is not worth the tap, so it is
  // promoted to a direct tab and the More button is dropped for that role.
  // Derived rather than role-checked so it adapts if the item lists change.
  const soleMoreItem = !surveyTeam && moreItems.length === 1 && settingsItems.length === 0 ? moreItems[0] : null

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
              className="absolute inset-0 bg-black/40"
            />

            {/* Panel */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.75 }}
              onDragEnd={(event, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) {
                  setMoreOpen(false)
                }
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 360 }}
              // Same vibrancy material as the bar, so the two surfaces read as
              // one system. The accent tint that used to wash the panel and the
              // radial glow over its top edge are gone: an Apple sheet is a
              // neutral frosted plane and lets its contents carry the colour.
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[28px] border-t border-black/[0.06] bg-white/78 pb-6 shadow-[0_-1px_2px_rgba(0,0,0,0.06),0_-20px_60px_-12px_rgba(0,0,0,0.28)] backdrop-blur-2xl backdrop-saturate-[1.8] touch-none dark:border-white/[0.09] dark:bg-zinc-900/78"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
            >
              {/* Grab handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="h-1 w-9 rounded-full bg-foreground/25 dark:bg-white/30" />
              </div>

              <div className="relative flex items-center justify-between px-6 pb-3 pt-2">
                <h2 className="text-sm font-bold text-foreground/90">
                  Menu Lainnya
                </h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-muted-foreground/75 transition-[background-color,border-color,color,transform] duration-200 hover:border-border/70 hover:bg-background/45 hover:text-foreground active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick items grid */}
              {moreItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3.5 px-6 pb-4">
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
              {settingsItems.length > 0 && <div className="relative px-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  Pengaturan
                </p>
                <div
                  className="overflow-hidden rounded-2xl border bg-background/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl divide-y divide-border/55"
                  style={{ borderColor: `color-mix(in srgb, ${userThemeColor} 12%, var(--border))` }}
                >
                  {settingsItems.map((item) => {
                    const Icon = item.icon
                    const active = pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onTouchStart={() => handlePrefetch(item.href)}
                        className="group flex items-center gap-4 px-4 py-3.5 transition-[background-color,transform] duration-200 hover:bg-background/55 active:translate-y-px"
                        style={{
                          background: active ? `color-mix(in srgb, ${userThemeColor} 10%, transparent)` : undefined,
                        }}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-background/45 transition-colors"
                          style={{
                            borderColor: active ? `${userThemeColor}33` : 'color-mix(in srgb, var(--border) 72%, transparent)',
                            color: active ? userThemeColor : 'var(--muted-foreground)',
                          }}
                        >
                        <Icon
                          className="h-[18px] w-[18px] shrink-0 transition-colors"
                        />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground/90">{item.label}</span>
                          {item.hint && (
                            <span className="block truncate text-[11px] text-muted-foreground/60 mt-0.5">{item.hint}</span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/25" />
                      </Link>
                    )
                  })}
                </div>
              </div>}

              {/* Logout */}
              <div className="px-6 pt-5">
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/[0.07] py-3 text-sm font-semibold text-rose-500 transition-[background-color,border-color,transform] duration-200 hover:border-rose-500/40 hover:bg-rose-500/[0.11] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 dark:border-rose-400/18 dark:bg-rose-400/[0.09] dark:text-rose-300"
                >
                  <LogOut className="h-4 w-4" />
                  {logoutMutation.isPending ? 'Keluar...' : 'Keluar dari akun'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating pill bar ───────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden px-2.5 flex justify-center pointer-events-none sm:px-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        {/* Vibrancy material: heavy blur with a saturation lift so colour bleeds
            through the way Apple's does, a hairline that is brighter on the top
            edge to read as a lit surface, and a two-stop shadow (tight contact +
            wide ambient) rather than one heavy drop. */}
        <div className="pointer-events-auto relative flex h-16 w-full max-w-[400px] items-center justify-between rounded-[28px] border border-black/[0.06] bg-white/72 px-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-8px_rgba(0,0,0,0.18)] backdrop-blur-2xl backdrop-saturate-[1.8] before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent sm:h-[68px] sm:px-2 dark:border-white/[0.09] dark:bg-zinc-900/72 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_16px_40px_-8px_rgba(0,0,0,0.6)] dark:before:via-white/15">
          {!surveyTeam && <>
          {/* Centre FAB Action Button — floats beautifully above the bar */}
          <div className="absolute left-1/2 bottom-[22px] -translate-x-1/2 z-20 sm:bottom-[24px]">
            <Link
              href="/consultations/create"
              onTouchStart={() => handlePrefetch('/consultations/create')}
              aria-label="Tambah data konsultasi"
              className="relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* A ring that pulses forever is the least Apple thing here: their
                  controls sit still until touched. Emphasis now comes from the
                  fill and an elevation shadow, and motion only answers a press.
                  The inner top highlight is the standard glossy-button read. */}
              <motion.div
                onMouseEnter={() => setFabHovered(true)}
                onMouseLeave={() => setFabHovered(false)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                className="flex size-[52px] cursor-pointer items-center justify-center rounded-full text-zinc-950 sm:size-[56px] dark:text-zinc-900"
                style={{
                  background: `linear-gradient(180deg, color-mix(in srgb, ${userThemeColor} 88%, white), ${userThemeColor})`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.12), 0 ${fabHovered ? 12 : 8}px ${fabHovered ? 28 : 20}px -6px ${userThemeColor}${fabHovered ? '66' : '4d'}`,
                  transition: 'box-shadow 0.25s ease',
                }}
              >
                <motion.span
                  animate={{ rotate: fabHovered ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="flex items-center justify-center"
                >
                  <Plus className="size-6" strokeWidth={2.25} />
                </motion.span>
              </motion.div>
            </Link>
          </div>

          {/* Navigation items group */}
          {/* Left group */}
          <div className="flex h-full flex-1 items-stretch justify-around">
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

          {/* Gap spacer for Center FAB */}
          <div className="w-[56px] shrink-0 sm:w-[68px]" aria-hidden="true" />

          {/* Right group */}
          <div className="flex h-full flex-1 items-stretch justify-around">
            <Tab
              item={PRIMARY_TABS[2]}
              active={pathname.startsWith(PRIMARY_TABS[2].href)}
              themeColor={userThemeColor}
              onPrefetch={handlePrefetch}
            />
            {soleMoreItem ? (
              <Tab
                item={soleMoreItem}
                active={pathname.startsWith(soleMoreItem.href)}
                themeColor={userThemeColor}
                onPrefetch={handlePrefetch}
              />
            ) : (
              <button
                onClick={() => setMoreOpen(true)}
                aria-label="Menu lainnya"
                aria-expanded={moreOpen}
                className="relative flex flex-1 cursor-pointer items-center justify-center rounded-2xl outline-none transition-transform duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_55%,transparent)]"
              >
                <TabInner icon={MoreHorizontal} label="Lainnya" active={moreActive} themeColor={userThemeColor} />
              </button>
            )}
          </div>
          </>}
          {surveyTeam && (
            <div className="flex h-full w-full items-stretch justify-around">
              {primaryTabs.map((tab) => (
                <Tab
                  key={tab.href}
                  item={tab}
                  active={pathname.startsWith(tab.href)}
                  themeColor={userThemeColor}
                  onPrefetch={handlePrefetch}
                />
              ))}
              <button
                onClick={() => setMoreOpen(true)}
                aria-label="Menu lainnya"
                aria-expanded={moreOpen}
                className="relative flex flex-1 cursor-pointer items-center justify-center rounded-2xl outline-none transition-transform duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_55%,transparent)]"
              >
                <TabInner icon={MoreHorizontal} label="Lainnya" active={moreActive} themeColor={userThemeColor} />
              </button>
            </div>
          )}
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
      aria-current={active ? 'page' : undefined}
      className="relative flex flex-1 items-center justify-center rounded-2xl cursor-pointer outline-none transition-transform duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_55%,transparent)]"
    >
      <TabInner icon={item.icon} label={item.label} active={active} themeColor={themeColor} />
    </Link>
  )
}

/**
 * A tab in the Apple-style bar: tint carries the selection, not a container.
 *
 * The previous version stacked a blurred "spotlight" gradient, a bordered fill
 * pill and a lift animation on the active tab. Apple's own tab bars do none of
 * that — UIKit tints the glyph and label and stops there — and the three effects
 * together read as glow rather than selection. What remains is a very light tint
 * wash (about 8%) to anchor the shared layout animation, plus the colour itself.
 *
 * Weight substitutes for SF Symbols' filled variants: the active glyph thickens
 * from 1.7 to 2.1, which reads as emphasis at 22px without changing footprint.
 */
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
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-[3px] py-1">
      {active && (
        <motion.span
          layoutId="active-pill"
          aria-hidden
          className="pointer-events-none absolute inset-x-1 inset-y-[7px] -z-10 rounded-[14px]"
          style={{ backgroundColor: `${themeColor}14` }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}

      <Icon
        aria-hidden
        className={cn(
          'size-[22px] shrink-0 transition-colors duration-200',
          !active && 'text-muted-foreground'
        )}
        strokeWidth={active ? 2.1 : 1.7}
        style={active ? { color: themeColor } : undefined}
      />

      <span
        className={cn(
          'max-w-[62px] truncate text-[10px] font-medium leading-none tracking-[-0.01em] transition-colors duration-200 select-none',
          !active && 'text-muted-foreground'
        )}
        style={active ? { color: themeColor } : undefined}
      >
        {label}
      </span>
    </div>
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
        'relative overflow-hidden flex flex-col items-center justify-center gap-2.5 rounded-[18px] border px-4 py-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.97] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_30%,transparent)]',
        active
          ? 'bg-background/58'
          : 'bg-background/42 hover:bg-background/58'
      )}
      style={
        active 
          ? {
              borderColor: `color-mix(in srgb, ${themeColor} 34%, var(--border))`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 14px 28px ${themeColor}12`,
            }
          : { borderColor: 'color-mix(in srgb, var(--border) 72%, transparent)' }
      }
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: `linear-gradient(135deg, ${themeColor}16, transparent 62%)`,
          }}
        />
      )}
      <span
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border transition-[background-color,border-color,color] duration-200"
        style={{
          borderColor: active ? `${themeColor}30` : 'transparent',
          background: active ? `${themeColor}14` : 'color-mix(in srgb, var(--muted) 35%, transparent)',
          color: active ? themeColor : undefined,
        }}
      >
        <Icon className={cn('h-5 w-5', !active && 'text-muted-foreground/80')} />
      </span>
      <span
        className="relative text-xs font-bold transition-colors select-none"
        style={{ color: active ? themeColor : 'var(--foreground)' }}
      >
        {item.label}
      </span>
    </Link>
  )
}
