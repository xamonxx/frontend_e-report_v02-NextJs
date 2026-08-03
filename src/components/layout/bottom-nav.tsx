'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { canAccess, isManagerSurveyor, isSurveyor, isSurveyTeam } from '@/lib/auth/roles'
import type { UserRole } from '@/types'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  hint?: string
  superOnly?: boolean
  roles?: UserRole[]
}

// The four tabs that flank the centre (+) FAB. Identical for every role so the
// bar never shifts shape between admin and super-admin.
const PRIMARY_TABS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/consultations', label: 'Konsultasi', icon: MessagesSquare },
  { href: '/analytics', label: 'Analitik', icon: ChartNoAxesCombined },
]

const SURVEY_TEAM_TABS: NavItem[] = [
  { href: '/surveys', label: 'Survey', icon: ClipboardCheck },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

const SURVEYOR_TABS: NavItem[] = [
  { href: '/surveys', label: 'Survey', icon: ClipboardCheck },
  { href: '/survey-consumers', label: 'Data', icon: UsersRound },
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
  { href: '/surveys', label: 'Survey', icon: ClipboardCheck, hint: 'Penugasan & hasil survey' },
  { href: '/rekap-jadwal-surveyor', label: 'Rekap Jadwal', icon: CalendarClock, hint: 'Jadwal mingguan surveyor', superOnly: true },
  { href: '/survey-consumers', label: 'Data Konsumen Survey', icon: UsersRound, hint: 'Konsumen & hasil survey', roles: ['admin', 'manager_surveyor', 'surveyor'] },
  { href: '/accounts', label: 'Akun', icon: Building2, hint: 'Manajemen akun', superOnly: true },
  { href: '/geo-analytics', label: 'Analisis Wilayah', icon: Map, hint: 'Persebaran konsumen per wilayah', superOnly: true },
  { href: '/report-attendances', label: 'Absensi', icon: CalendarCheck, hint: 'Laporan absensi harian' },
]

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
  // Swipe-turun untuk menutup More sheet — pengganti ringan drag framer lama,
  // tanpa menarik runtime animasi ke bundle shell.
  const sheetTouchStartY = useRef<number | null>(null)

  const isSuperAdmin = user?.role === 'super_admin'
  const surveyTeam = isSurveyTeam(user)
  const primaryTabs = isManagerSurveyor(user) ? MANAGER_SURVEY_TABS : isSurveyor(user) ? SURVEYOR_TABS : surveyTeam ? SURVEY_TEAM_TABS : PRIMARY_TABS
  const visible = (item: NavItem) => (!item.superOnly || isSuperAdmin) && canAccess(user, item.roles)

  const moreItems = surveyTeam ? [] : MORE_ITEMS.filter(visible)
  // Pengaturan already sits in the header profile menu (alongside Keluar), which
  // is visible on mobile too. It is only kept in the sheet for super admins,
  // whose settings group holds other entries anyway.
  const settingsItems = SETTINGS_ITEMS.filter(visible).filter((item) => item.href !== '/settings' || isSuperAdmin)
  const sheetItems = [...moreItems, ...settingsItems]

  // Highlight "More" whenever the active route lives inside the sheet.
  const moreActive = sheetItems.some((i) => pathname.startsWith(i.href))

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
      {/* Dulu pakai framer (AnimatePresence + drag-to-dismiss). Diganti render
          bersyarat + slide tw-animate agar framer-motion tak ikut ke bundle shell
          yang dimuat tiap halaman. Tutup lewat tap backdrop, tombol X, atau
          swipe turun (handler touch ringan di bawah). */}
      {moreOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden duration-200 animate-in fade-in">
            {/* Backdrop */}
            <button
              aria-label="Tutup menu"
              onClick={() => setMoreOpen(false)}
              className="absolute inset-0 bg-black/40"
            />

            {/* Panel */}
            <div
              onTouchStart={(e) => {
                sheetTouchStartY.current = e.touches[0]?.clientY ?? null
              }}
              onTouchEnd={(e) => {
                const start = sheetTouchStartY.current
                sheetTouchStartY.current = null
                const end = e.changedTouches[0]?.clientY
                // Swipe turun cukup jauh menutup sheet, meniru gesture drag lama.
                if (start !== null && end !== undefined && end - start > 60) {
                  setMoreOpen(false)
                }
              }}
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[22px] border-t bg-card pb-6 shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.32)] duration-300 animate-in slide-in-from-bottom dark:shadow-[0_-8px_24px_-18px_rgba(2,6,23,0.72)]"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
            >
              {/* Grab handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="h-1 w-9 rounded-full bg-foreground/18 dark:bg-white/22" />
              </div>

              <div className="relative flex items-center justify-between px-4 pb-2.5 pt-1">
                <div>
                  <h2 className="text-sm font-bold text-foreground/92">Menu Lainnya</h2>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border text-muted-foreground transition-[background-color,border-color,color,transform] duration-200 hover:text-foreground active:scale-95"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border) 84%, transparent)',
                    background: 'color-mix(in srgb, var(--background) 72%, transparent)',
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {sheetItems.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {sheetItems.map((item) => (
                      <SheetTile
                        key={item.href}
                        item={item}
                        active={pathname.startsWith(item.href)}
                        themeColor={userThemeColor}
                        onPrefetch={handlePrefetch}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Logout */}
              <div className="px-4 pt-4">
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                  style={{ color: '#fda4af' }}
                >
                  <LogOut className="h-4 w-4" />
                  {logoutMutation.isPending ? 'Keluar...' : 'Keluar dari akun'}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* ── Floating pill bar ───────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden px-2.5 flex justify-center pointer-events-none sm:px-4 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-24 before:bg-gradient-to-t before:from-background before:via-background/82 before:to-transparent"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        {/* Vibrancy material: heavy blur with a saturation lift so colour bleeds
            through the way Apple's does, a hairline that is brighter on the top
            edge to read as a lit surface, and a two-stop shadow (tight contact +
            wide ambient) rather than one heavy drop. */}
        <div className="pointer-events-auto relative flex h-[70px] w-full max-w-[400px] items-center justify-between rounded-[24px] border border-slate-300/70 bg-white px-1.5 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.42),0_1px_0_rgba(255,255,255,0.7)_inset] sm:h-[72px] sm:px-2 dark:border-slate-600/55 dark:bg-[#182233] dark:shadow-[0_14px_34px_-20px_rgba(0,0,0,0.78),0_1px_0_rgba(255,255,255,0.05)_inset]">
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
              <div
                onMouseEnter={() => setFabHovered(true)}
                onMouseLeave={() => setFabHovered(false)}
                className="flex size-[52px] cursor-pointer items-center justify-center rounded-full text-zinc-950 ring-[5px] ring-background transition-[transform,box-shadow] duration-200 hover:scale-[1.04] active:scale-[0.94] sm:size-[56px] dark:text-zinc-950"
                style={{
                  background: userThemeColor,
                  boxShadow: `0 ${fabHovered ? 12 : 8}px ${fabHovered ? 24 : 18}px -9px ${userThemeColor}aa`,
                }}
              >
                <span className="flex items-center justify-center">
                  <Plus className="size-6" strokeWidth={2.25} />
                </span>
              </div>
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
              {sheetItems.length > 0 && (
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
    <div className="relative isolate flex h-full w-full flex-col items-center justify-center gap-[4px] py-1">
      {active && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-1 inset-y-[7px] -z-10 overflow-hidden rounded-[20px] border backdrop-blur-xl duration-200 animate-in fade-in"
            style={{
              background: `linear-gradient(145deg, color-mix(in srgb, ${themeColor} 18%, var(--card)) 0%, color-mix(in srgb, ${themeColor} 10%, var(--background)) 58%, color-mix(in srgb, ${themeColor} 7%, var(--card)) 100%)`,
              borderColor: `color-mix(in srgb, ${themeColor} 28%, var(--border))`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.56), inset 0 -10px 18px -18px ${themeColor}, 0 12px 24px -20px ${themeColor}`,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-x-3 top-1 h-px rounded-full opacity-70"
              style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${themeColor} 45%, transparent), rgba(255,255,255,0.72), transparent)` }}
            />
          </span>
      )}

      <Icon
        aria-hidden
        className={cn(
          'relative size-[22px] shrink-0 transition-[color,filter,transform] duration-200',
          !active && 'text-slate-500 dark:text-slate-400'
        )}
        strokeWidth={active ? 2.2 : 1.7}
        style={active ? { color: themeColor, filter: `drop-shadow(0 0 5px ${themeColor}45)`, transform: 'translateY(-1px)' } : undefined}
      />

      <span
        className={cn(
          'relative max-w-[62px] truncate text-[10px] font-semibold leading-none transition-colors duration-200 select-none',
          !active && 'text-slate-500 dark:text-slate-400'
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
        'relative flex min-h-[76px] items-center gap-2.5 overflow-hidden rounded-2xl border px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.97] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_30%,transparent)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        active
          ? 'bg-[color:color-mix(in_srgb,var(--primary-theme)_8%,var(--card))]'
          : 'bg-[color:color-mix(in_srgb,var(--card)_82%,var(--background))] hover:bg-[color:color-mix(in_srgb,var(--card)_92%,var(--background))]'
      )}
      style={
        active 
          ? {
              borderColor: `color-mix(in srgb, ${themeColor} 42%, var(--border))`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 28px ${themeColor}12`,
            }
          : { borderColor: 'color-mix(in srgb, var(--border) 84%, transparent)' }
      }
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: `linear-gradient(135deg, ${themeColor}12, transparent 72%)`,
          }}
        />
      )}
      <span
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-[background-color,border-color,color,box-shadow] duration-200',
          !active && 'text-slate-500 dark:text-slate-400'
        )}
        style={{
          borderColor: active ? `${themeColor}42` : 'color-mix(in srgb, var(--border) 88%, transparent)',
          background: active ? `${themeColor}16` : 'color-mix(in srgb, var(--muted) 45%, transparent)',
          color: active ? themeColor : undefined,
        }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span
          className="block text-[13px] font-semibold leading-tight transition-colors select-none sm:text-sm"
          style={{ color: active ? themeColor : 'color-mix(in srgb, var(--foreground) 90%, transparent)' }}
        >
          {item.label}
        </span>
      </span>
      <ChevronRight className="relative h-4 w-4 shrink-0 text-muted-foreground/55" />
    </Link>
  )
}
