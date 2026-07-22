'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutGrid,
  MessagesSquare,
  ChartNoAxesCombined,
  Plus,
  Building2,
  FileClock,
  DatabaseZap,
  History,
  Bug,
  SlidersHorizontal,
  LogOut,
  MoreHorizontal,
  ChevronRight,
  X,
  MapPinned,
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/consultations', label: 'Konsultasi', icon: MessagesSquare },
  { href: '/analytics', label: 'Analisa', icon: ChartNoAxesCombined },
]

const SURVEY_TEAM_TABS: NavItem[] = [
  { href: '/surveys', label: 'Survey', icon: MapPinned },
  { href: '/settings', label: 'Pengaturan', icon: SlidersHorizontal },
]

const MANAGER_SURVEY_TABS: NavItem[] = [
  { href: '/surveys', label: 'Survey', icon: MapPinned },
  { href: '/rekap-jadwal-surveyor', label: 'Rekap', icon: CalendarClock },
  { href: '/survey-consumers', label: 'Data', icon: UsersRound },
  { href: '/settings', label: 'Pengaturan', icon: SlidersHorizontal },
]

// Overflow items surfaced in the "More" sheet. Role gating mirrors the sidebar.
const MORE_ITEMS: NavItem[] = [
  { href: '/accounts', label: 'Akun', icon: Building2, hint: 'Manajemen akun', superOnly: true },
  { href: '/report-attendances', label: 'Absensi', icon: FileClock, hint: 'Laporan absensi harian' },
]

// Notch mask is no longer needed since we are using a floating glassmorphism pill layout.

// Items grouped under "Pengaturan" inside the More sheet.
const SETTINGS_ITEMS: NavItem[] = [
  { href: '/master-data', label: 'Master Data', icon: DatabaseZap, hint: 'Kategori, status & referensi', superOnly: true },
  { href: '/audit-logs', label: 'Audit Log', icon: History, hint: 'Log aktivitas sistem', superOnly: true },
  { href: '/debug', label: 'Debug & Test', icon: Bug, hint: 'Data dummy & pengujian', superOnly: true },
  { href: '/settings', label: 'Pengaturan', icon: SlidersHorizontal, hint: 'Preferensi & akun' },
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
  const settingsItems = SETTINGS_ITEMS.filter(visible).filter((item) => !surveyTeam || item.href !== '/settings')

  // Highlight "More" whenever the active route lives inside the sheet.
  const moreActive = [...moreItems, ...settingsItems].some((i) => pathname.startsWith(i.href))

  const primaryIndex = primaryTabs.findIndex((item) => pathname.startsWith(item.href))
  let activeIndex = surveyTeam ? primaryIndex : -1
  if (!surveyTeam) {
    if (pathname.startsWith('/dashboard')) activeIndex = 0
    else if (pathname.startsWith('/consultations')) activeIndex = 1
    else if (pathname.startsWith('/analytics')) activeIndex = 3
    else if (moreActive) activeIndex = 4
  } else if (moreActive) {
    activeIndex = primaryTabs.length
  }

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
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[30px] border-t bg-[color-mix(in_srgb,var(--card)_88%,var(--primary-theme)_6%)] shadow-[0_-24px_70px_rgba(2,8,23,0.34),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl backdrop-saturate-150 touch-none pb-6 dark:bg-[color-mix(in_srgb,var(--card)_82%,var(--primary-theme)_8%)]"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)',
                borderColor: `color-mix(in srgb, ${userThemeColor} 20%, var(--border))`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-70"
                style={{
                  background: `radial-gradient(circle at 50% -25%, ${userThemeColor}22, transparent 64%)`,
                }}
              />
              {/* Grab handle */}
              <div className="flex justify-center pt-3 pb-1">
                <span className="h-1.5 w-14 rounded-full bg-foreground/20 dark:bg-white/25" />
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
        <div className="relative h-16 w-full max-w-[400px] rounded-[26px] border border-zinc-200/80 dark:border-white/15 bg-zinc-50/95 dark:bg-zinc-800/85 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-center justify-between px-1.5 pointer-events-auto transition-all duration-300 sm:h-[68px] sm:rounded-[28px] sm:px-2">
          {!surveyTeam && <>
          {/* Centre FAB Action Button — floats beautifully above the bar */}
          <div className="absolute left-1/2 bottom-[22px] -translate-x-1/2 z-20 sm:bottom-[24px]">
            <Link
              href="/consultations/create"
              onTouchStart={() => handlePrefetch('/consultations/create')}
              aria-label="Tambah data konsultasi"
              className="relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Outer Breathing Glow Ring */}
              <motion.div
                className="absolute -inset-1.5 rounded-full pointer-events-none -z-10"
                style={{
                  border: `2px solid ${userThemeColor}33`,
                }}
                animate={{
                  scale: fabHovered ? [1, 1.15, 1] : [1, 1.08, 1],
                  opacity: fabHovered ? [0.8, 0.2, 0.8] : [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* FAB Inner Core */}
              <motion.div
                onMouseEnter={() => setFabHovered(true)}
                onMouseLeave={() => setFabHovered(false)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-zinc-950 dark:text-zinc-900 cursor-pointer shadow-lg sm:h-[56px] sm:w-[56px]"
                style={{
                  background: `linear-gradient(135deg, ${userThemeColor}, color-mix(in srgb, ${userThemeColor} 75%, black))`,
                  boxShadow: fabHovered 
                    ? `0 10px 25px ${userThemeColor}59` 
                    : `0 8px 20px ${userThemeColor}26`,
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
              >
                <motion.span
                  animate={{ rotate: fabHovered ? 90 : 0, scale: fabHovered ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="flex items-center justify-center"
                >
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </motion.span>
              </motion.div>
            </Link>
          </div>

          {/* Navigation items group */}
          {/* Left group */}
          <div className="flex flex-1 items-stretch h-full justify-around">
            {PRIMARY_TABS.slice(0, 2).map((tab, idx) => (
              <Tab
                key={tab.href}
                item={tab}
                active={pathname.startsWith(tab.href)}
                position={idx}
                indicatorPosition={activeIndex}
                themeColor={userThemeColor}
                onPrefetch={handlePrefetch}
              />
            ))}
          </div>

          {/* Gap spacer for Center FAB */}
          <div className="w-[56px] shrink-0 sm:w-[68px]" aria-hidden="true" />

          {/* Right group */}
          <div className="flex flex-1 items-stretch h-full justify-around">
            <Tab
              item={PRIMARY_TABS[2]}
              active={pathname.startsWith(PRIMARY_TABS[2].href)}
              position={3}
              indicatorPosition={activeIndex}
              themeColor={userThemeColor}
              onPrefetch={handlePrefetch}
            />
            <button
              onClick={() => setMoreOpen(true)}
              aria-label="Menu lainnya"
              className="relative flex flex-1 items-center justify-center rounded-2xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <TabInner 
                icon={MoreHorizontal} 
                label="Lainnya" 
                active={moreActive} 
                position={4}
                indicatorPosition={activeIndex}
                themeColor={userThemeColor}
              />
            </button>
          </div>
          </>}
          {surveyTeam && (
            <div className="flex h-full w-full items-stretch justify-around">
              {primaryTabs.map((tab, index) => (
                <Tab
                  key={tab.href}
                  item={tab}
                  active={pathname.startsWith(tab.href)}
                  position={index}
                  indicatorPosition={activeIndex}
                  themeColor={userThemeColor}
                  onPrefetch={handlePrefetch}
                />
              ))}
              <button
                onClick={() => setMoreOpen(true)}
                aria-label="Menu lainnya"
                className="relative flex flex-1 items-center justify-center rounded-2xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <TabInner icon={MoreHorizontal} label="Lainnya" active={moreActive} position={primaryTabs.length} indicatorPosition={activeIndex} themeColor={userThemeColor} />
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
  position,
  indicatorPosition,
  themeColor,
  onPrefetch,
}: {
  item: NavItem
  active: boolean
  position: number
  indicatorPosition: number
  themeColor: string
  onPrefetch: (href: string) => void
}) {
  return (
    <Link
      href={item.href}
      onTouchStart={() => onPrefetch(item.href)}
      aria-label={item.label}
      className="relative flex flex-1 items-center justify-center rounded-2xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <TabInner 
        icon={item.icon} 
        label={item.label} 
        active={active} 
        position={position}
        indicatorPosition={indicatorPosition}
        themeColor={themeColor}
      />
    </Link>
  )
}

function TabInner({
  icon: Icon,
  label,
  active,
  position,
  indicatorPosition,
  themeColor,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  position: number
  indicatorPosition: number
  themeColor: string
}) {
  const distance = Math.abs(indicatorPosition - position);
  const spotlightOpacity = active ? 1 : Math.max(0, 1 - distance * 0.6);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full py-1">
      {/* Dynamic Theme Spotlight Glow */}
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[12px] w-14 h-20 bg-gradient-to-b blur-md rounded-full pointer-events-none transition-opacity duration-300"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${themeColor}33, ${themeColor}05, transparent)`,
          opacity: spotlightOpacity,
        }}
      />

      {/* Floating Active Pill - using z-0 to stack above background but below content */}
      {active && (
        <motion.span
          layoutId="active-pill"
          className="absolute inset-x-0.5 inset-y-[10px] rounded-xl z-0 border"
          style={{
            backgroundColor: `${themeColor}1a`,
            borderColor: `${themeColor}26`,
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30
          }}
        />
      )}

      {/* Content Container - using relative z-10 to stay on top of the active pill */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Icon with lift animation */}
        <motion.span
          animate={{ y: active ? -2 : 0 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30
          }}
          className="relative flex items-center justify-center"
        >
          <Icon
            className="h-[20px] w-[20px] transition-colors duration-300"
            style={{
              color: active ? themeColor : '#9CA3AF',
            }}
          />
        </motion.span>

        {/* Label Text */}
        <span
          className="max-w-[58px] truncate text-[8px] sm:text-[10px] tracking-tight font-medium mt-0.5 select-none transition-colors duration-300"
          style={{
            color: active ? themeColor : '#9CA3AF',
            opacity: active ? 1 : 0.8,
          }}
        >
          {label}
        </span>
      </div>
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
