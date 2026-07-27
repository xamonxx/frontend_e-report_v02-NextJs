'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { useAccounts } from '@/lib/hooks/useMasterData'
import { useAccountGroups } from '@/lib/hooks/useReportAttendances'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CardExportButtons } from '@/components/ui/card-export-buttons'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Users,
  Target,
  TrendingUp,
  Clock,
  Building2,
  ArrowUpRight,
  Info,
  Activity,
  Award,
  FileDown,
  FileImage,
  CalendarIcon,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ClipboardList,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend,
  LabelList,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Cell,
  CartesianGrid,
} from 'recharts'
import { ChartBox } from '@/components/ui/chart-box'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { saveCardAsPng, saveCardAsPdf } from '@/lib/export-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const COLORS = ['var(--primary-theme)', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']
const ACCOUNTS_PER_PAGE = 10

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; fill?: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    const color = payload[0].fill || 'var(--primary-theme)'
    return (
      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
        <p className="text-[11px] font-bold text-foreground">{label}</p>
        <p className="text-[11px] mt-0.5 font-semibold" style={{ color }}>{payload[0].value} leads</p>
      </div>
    )
  }
  return null
}

function CustomAreaTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl backdrop-blur-md text-[11px] text-foreground">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-semibold" style={{ color: p.stroke || p.color || p.fill }}>
            {p.name} : {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

/* â”€â”€ Editorial section marker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * A numbered chip + uppercase title + trailing gradient rule. Gives the stacked
 * dashboard a magazine-like spine so each block reads as an intentional section
 * rather than another floating card. */
function SectionLabel({ index, title, sub }: { index: string; title: string; sub?: string }) {
  return (
    <div className="flex min-h-8 items-center gap-3 border-b border-border/70 pb-2">
      <span className="inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 font-mono text-[10px] font-black leading-none text-amber-500">
        {index}
      </span>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h2 className="whitespace-nowrap text-xs font-bold text-foreground">
          {title}
        </h2>
        {sub && <span className="hidden truncate text-[10px] text-muted-foreground sm:inline">{sub}</span>}
      </div>
    </div>
  )
}

function GrowthBadge({ label, positive }: { label: string; positive?: boolean }) {
  return (
    <span
      className={cn(
        'text-[10px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap',
        positive === true
          ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-400'
          : positive === false
          ? 'text-rose-600 bg-rose-500/10 border-rose-500/25 dark:text-rose-400'
          : 'text-muted-foreground bg-muted border-border'
      )}
    >
      {label}
    </span>
  )
}

/* â”€â”€ KPI accent tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Each supporting metric owns a hue so the row is scannable at a glance instead
 * of five identical amber chips. `amber` is the only theme-reactive tone (see the
 * --color-amber-* overrides in globals.css) and stays reserved for the hero KPI.
 * Class strings are written in full so Tailwind's JIT can see them. */
const KPI_ACCENTS = {
  amber: {
    chip: 'border-amber-500/25 bg-amber-500/10 group-hover:bg-amber-500/15',
    icon: 'text-amber-600 dark:text-amber-500',
    rule: 'bg-amber-500/45',
  },
  emerald: {
    chip: 'border-emerald-500/25 bg-emerald-500/10 group-hover:bg-emerald-500/15',
    icon: 'text-emerald-600 dark:text-emerald-400',
    rule: 'bg-emerald-500/45',
  },
  sky: {
    chip: 'border-sky-500/25 bg-sky-500/10 group-hover:bg-sky-500/15',
    icon: 'text-sky-600 dark:text-sky-400',
    rule: 'bg-sky-500/45',
  },
  violet: {
    chip: 'border-violet-500/25 bg-violet-500/10 group-hover:bg-violet-500/15',
    icon: 'text-violet-600 dark:text-violet-400',
    rule: 'bg-violet-500/45',
  },
  cyan: {
    chip: 'border-cyan-500/25 bg-cyan-500/10 group-hover:bg-cyan-500/15',
    icon: 'text-cyan-600 dark:text-cyan-400',
    rule: 'bg-cyan-500/45',
  },
} as const

type KpiAccent = keyof typeof KPI_ACCENTS

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  tooltip: string
  accent?: KpiAccent
  badge?: { label: string; positive?: boolean }
}

/* Secondary KPI tile: compact, restrained, carrying its accent on a top hairline
 * and the icon chip. Deliberately quieter than the hero so the bento has hierarchy. */
function StatCard({ title, value, description, icon: Icon, tooltip, accent = 'amber', badge }: StatCardProps) {
  const tone = KPI_ACCENTS[accent]
  return (
    <Card className="dashboard-metric group relative min-h-40 overflow-hidden">
      <span className={cn('pointer-events-none absolute inset-x-0 top-0 h-px', tone.rule)} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger className="flex shrink-0 cursor-help items-center leading-none">
              <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-center text-[11px] leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors', tone.chip)}>
          <Icon className={cn('h-4 w-4', tone.icon)} strokeWidth={2} />
        </div>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="font-heading text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-medium text-muted-foreground/80">{description}</p>
          {badge && <GrowthBadge label={badge.label} positive={badge.positive} />}
        </div>
      </CardContent>
    </Card>
  )
}

interface FeatureStatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  tooltip: string
  badge?: { label: string; positive?: boolean }
}

/* Primary KPI uses the same footprint as the supporting metrics, with a stronger
 * theme accent for hierarchy. */
function FeatureStatCard({ title, value, description, icon: Icon, tooltip, badge }: FeatureStatCardProps) {
  return (
    <Card className="dashboard-metric dashboard-metric-feature group relative flex h-full min-h-40 flex-col overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
      <Icon className="pointer-events-none absolute -bottom-5 right-3 h-32 w-32 text-amber-500/[0.055]" strokeWidth={1.25} />

      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </CardTitle>
            <Tooltip>
              <TooltipTrigger className="flex shrink-0 cursor-help items-center leading-none">
                <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-center text-[11px] leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase text-amber-500">
            <Sparkles className="h-2.5 w-2.5" />
            Utama
          </span>
        </div>
      </CardHeader>

      <CardContent className="relative mt-auto pt-3">
        <div>
          <div className="text-gradient-amber font-heading text-4xl font-bold leading-none tracking-tight tabular-nums">
            {value}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">{description}</p>
            {badge && <GrowthBadge label={badge.label} positive={badge.positive} />}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useDashboard()
  const user = useAuthStore((s) => s.user)
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })
  const isSuperAdmin = user?.role === 'super_admin'

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Ref to the trend card; PNG/PDF export helpers live in @/lib/export-card.
  const trendCardRef = useRef<HTMLDivElement>(null)

  // Filter States
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly')
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>(undefined)
  const [selectedAccountGroup, setSelectedAccountGroup] = useState<string | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [weekDate, setWeekDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [customStartPickerOpen, setCustomStartPickerOpen] = useState(false)
  const [customEndPickerOpen, setCustomEndPickerOpen] = useState(false)
  const [accountsPage, setAccountsPage] = useState(1)

  const { data: accounts } = useAccounts()
  const { data: accountGroupsResponse } = useAccountGroups()
  const accountGroups = accountGroupsResponse?.data ?? []

  const accountOptions = useMemo(() => {
    const opts: AutocompleteOption[] = [{ label: 'Semua Akun', value: 'all' }]
    if (accounts) {
      accounts.forEach((acc) => {
        opts.push({ label: acc.name, value: String(acc.id) })
      })
    }
    return opts
  }, [accounts])

  const { data: analyticsResponse, isLoading: analyticsLoading, isRefetching: analyticsRefetching } = useAnalytics({
    period_type: periodType,
    account: selectedAccount,
    account_group: selectedAccountGroup,
    month: periodType === 'monthly' ? selectedMonth : undefined,
    year: selectedYear,
    week_date: periodType === 'weekly' ? weekDate : undefined,
    start_date: periodType === 'custom' ? customStartDate : undefined,
    end_date: periodType === 'custom' ? customEndDate : undefined,
  })

  const trendData = analyticsResponse?.data?.trendSeries || []

  const needsDistribution = useMemo(() => {
    return analyticsResponse?.data?.needsDistribution || dashboard?.needs_distribution || []
  }, [dashboard, analyticsResponse])

  const accountsData = useMemo(() => {
    if (!analyticsResponse?.data?.accountRanking) {
      return dashboard?.accounts || []
    }
    return analyticsResponse.data.accountRanking.map((acct: any) => {
      const matched = dashboard?.accounts?.find((a: any) => a.name === acct.name)
      return {
        id: matched?.id || acct.name,
        name: acct.name,
        admins: acct.admins || [],
        total_leads: acct.total,
        surveys: acct.surveys,
        survey_rate: acct.rate,
        deals: acct.deals,
        conversion_rate: acct.deal_rate,
      }
    })
  }, [dashboard, analyticsResponse])

  useEffect(() => {
    setAccountsPage(1)
  }, [accountsData.length])

  const totalAccountsPages = Math.max(1, Math.ceil(accountsData.length / ACCOUNTS_PER_PAGE))
  const accountsPageStart = (accountsPage - 1) * ACCOUNTS_PER_PAGE
  const paginatedAccountsData = useMemo(() => {
    return accountsData.slice(accountsPageStart, accountsPageStart + ACCOUNTS_PER_PAGE)
  }, [accountsData, accountsPageStart])

  // NOTE: keep every hook above the early returns below. Calling a hook after
  // a conditional `return` makes the hook order vary between renders (loading
  // vs. loaded), which trips React's Rules of Hooks.
  const stats = useMemo(() => {
    if (!analyticsResponse?.data) {
      return dashboard?.stats
    }
    const d = analyticsResponse.data
    return {
      total_leads: d.totalLeads,
      avg_conversion: d.conversionRate,
      conversion_rate: d.conversionRate,
      active_accounts: dashboard?.stats?.active_accounts,
      total_accounts: dashboard?.stats?.total_accounts,
      pending_surveys: dashboard?.stats?.pending_surveys,
      completed_this_month: d.totalDeals,
      growth_percent: d.growthPercent,
      total_request_surveys: dashboard?.stats?.total_request_surveys,
    }
  }, [dashboard, analyticsResponse])

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Activity className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">Gagal memuat dashboard. Silakan periksa koneksi Anda.</p>
      </div>
    )
  }

  const growthPercent = stats?.growth_percent || 0
  const growthPositive = growthPercent >= 0
  const hasOperationalSummary = Boolean(
    (isSuperAdmin && dashboard?.admin_attendances) || (!isSuperAdmin && dashboard?.top_admin)
  )

  return (
    <TooltipProvider delay={400}>
      <div className="dashboard-page mx-auto w-full max-w-[1680px] space-y-7">

        {/* â•â•â• Editorial header â•â•â• */}
        <header className="dash-rise dashboard-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {today}
              </p>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Selamat Datang,{' '}
                <span className="text-gradient-amber">{user?.name}</span>
              </h1>
              <p className="mt-1 max-w-xl text-xs font-medium text-muted-foreground">
                Ikhtisar performa leads dan konsultasi interior Anda hari ini.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {analyticsResponse?.data?.periodLabel && (
                <span className="hidden items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-bold text-muted-foreground sm:inline-flex dark:border-zinc-800/60">
                  <CalendarIcon className="h-3 w-3 text-amber-500" />
                  {analyticsResponse.data.periodLabel}
                </span>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Ringkasan. */}
        <section className="dash-rise space-y-4" style={{ animationDelay: '60ms' }}>
          <SectionLabel index="01" title="Ringkasan" sub="Metrik utama periode terpilih" />
          <div className={cn("grid gap-3 sm:grid-cols-2", isSuperAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
            <FeatureStatCard
              title="Total Leads"
              value={stats?.total_leads || 0}
              description={analyticsResponse?.data ? 'Dalam periode terpilih' : 'Seluruh waktu terdaftar'}
              icon={Users}
              tooltip="Jumlah total leads konsultasi interior yang pernah terdaftar di sistem, termasuk semua status."
            />
            <StatCard
              title="Rata-rata Deal"
              value={`${stats?.avg_conversion !== undefined ? stats.avg_conversion : (stats?.conversion_rate || 0)}%`}
              description={analyticsResponse?.data ? "Rasio konversi periode terpilih" : "Rasio konversi leads menjadi deal"}
              icon={Target}
              accent="emerald"
              tooltip="Persentase rata-rata leads yang berhasil dikonversi menjadi proyek interior aktif (deal)."
            />
            {isSuperAdmin ? (
              <StatCard
                title="Akun Aktif"
                value={stats?.active_accounts || 0}
                description={`Dari ${stats?.total_accounts || 0} akun terdaftar`}
                icon={Building2}
                accent="sky"
                tooltip="Jumlah akun yang aktif beroperasi dari total seluruh akun yang terdaftar di sistem."
              />
            ) : (
              <StatCard
                title="Menunggu Survey"
                value={stats?.pending_surveys || 0}
                description="Leads berstatus request survey"
                icon={Clock}
                accent="violet"
                tooltip="Jumlah leads yang sudah meminta jadwal survey lapangan namun belum dijadwalkan."
              />
            )}
            {isSuperAdmin && (
              <StatCard
                title="Request Survey"
                value={stats?.total_request_surveys || 0}
                description="Total leads berstatus request survey"
                icon={ClipboardList}
                accent="violet"
                tooltip="Jumlah seluruh leads dari semua akun yang berstatus request survey (menunggu dijadwalkan)."
              />
            )}
            <StatCard
              title={analyticsResponse?.data?.periodLabel ? `Periode: ${analyticsResponse.data.periodLabel}` : "Bulan Ini"}
              value={stats?.completed_this_month || 0}
              description={analyticsResponse?.data ? "Leads closing periode terpilih" : "Leads closing bulan ini"}
              icon={TrendingUp}
              accent="cyan"
              tooltip="Jumlah leads yang berhasil closing (deal) dalam periode terpilih."
              badge={{
                label: `${growthPositive ? '+' : ''}${growthPercent}% vs bln lalu`,
                positive: growthPositive,
              }}
            />
          </div>
        </section>

        {/* Tren dan distribusi. */}
        <section className="dash-rise space-y-4" style={{ animationDelay: '120ms' }}>
          <SectionLabel index="02" title="Tren & Distribusi" sub="Pergerakan lead dan minat produk" />

          {/* Control deck â€” opaque surface, no backdrop-blur (perf) */}
          <div className="dashboard-filter max-w-full rounded-2xl border p-4 shadow-lg sm:p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <RefreshCw className={cn("h-3 w-3 text-amber-500", analyticsRefetching && "animate-spin")} />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                Filter Tren Pendaftaran & Konversi
              </h3>
              {analyticsRefetching && (
                <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> memuat...
                </span>
              )}
            </div>
            <div className={cn(
              "grid gap-3 grid-cols-1 sm:grid-cols-2",
              isSuperAdmin
                ? (periodType === 'yearly' ? "md:grid-cols-4" : "md:grid-cols-5")
                : (periodType === 'yearly' ? "md:grid-cols-2" : "md:grid-cols-3")
            )}>
              {/* Period Type */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Rentang Periode</Label>
                <Select value={periodType} onValueChange={(v) => v && setPeriodType(v as any)}>
                  <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-xs dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 hover:bg-muted/50">
                    <SelectValue>
                      {periodType === 'weekly' ? 'Mingguan' : periodType === 'monthly' ? 'Bulanan' : periodType === 'yearly' ? 'Tahunan' : 'Kustom'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="yearly">Tahunan</SelectItem>
                    <SelectItem value="custom">Kustom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Selector (Super Admin Only) */}
              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Akun</Label>
                  <Autocomplete
                    value={selectedAccount ? String(selectedAccount) : 'all'}
                    onChange={(v) => setSelectedAccount(v && v !== 'all' ? parseInt(v, 10) : undefined)}
                    options={accountOptions}
                    placeholder="Cari Akun..."
                    onlyChangeOnSelect={true}
                    clearOnFocus
                    className="h-10 rounded-xl border-border bg-background/60 text-xs dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 hover:bg-muted/50"
                  />
                </div>
              )}

              {/* Group Selector (Super Admin Only) */}
              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Grup Akun</Label>
                  <Select
                    value={selectedAccountGroup ?? 'all'}
                    onValueChange={(v) => setSelectedAccountGroup(v && v !== 'all' ? v : undefined)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-xs dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 hover:bg-muted/50">
                      <SelectValue>
                        {selectedAccountGroup
                          ? accountGroups.find((g) => g.value === selectedAccountGroup)?.label ?? selectedAccountGroup
                          : 'Semua Grup'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Grup</SelectItem>
                      {accountGroups.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Month Select (if Monthly) */}
              {periodType === 'monthly' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bulan</Label>
                  <Select value={String(selectedMonth)} onValueChange={(v) => v && setSelectedMonth(parseInt(v, 10))}>
                    <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-xs dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 hover:bg-muted/50">
                      <SelectValue>
                        {new Date(2000, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Week date select (if Weekly) */}
              {periodType === 'weekly' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tanggal Acuan</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger className="inline-flex w-full h-10 items-center justify-start gap-2 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground transition-all hover:bg-muted/50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 cursor-pointer">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {weekDate ? format(new Date(weekDate + 'T12:00:00'), 'd MMM yyyy') : 'Pilih tanggal'}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={weekDate ? new Date(weekDate + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setWeekDate(format(date, 'yyyy-MM-dd'))
                            setDatePickerOpen(false)
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Custom date range (if Custom) */}
              {periodType === 'custom' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Dari Tanggal</Label>
                    <Popover open={customStartPickerOpen} onOpenChange={setCustomStartPickerOpen}>
                      <PopoverTrigger className="inline-flex w-full h-10 items-center justify-start gap-2 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground transition-all hover:bg-muted/50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 cursor-pointer">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {customStartDate ? format(new Date(customStartDate + 'T12:00:00'), 'd MMM yyyy') : 'Pilih tanggal'}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customStartDate ? new Date(customStartDate + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setCustomStartDate(format(date, 'yyyy-MM-dd'))
                              setCustomStartPickerOpen(false)
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sampai Tanggal</Label>
                    <Popover open={customEndPickerOpen} onOpenChange={setCustomEndPickerOpen}>
                      <PopoverTrigger className="inline-flex w-full h-10 items-center justify-start gap-2 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground transition-all hover:bg-muted/50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 cursor-pointer">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {customEndDate ? format(new Date(customEndDate + 'T12:00:00'), 'd MMM yyyy') : 'Pilih tanggal'}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customEndDate ? new Date(customEndDate + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setCustomEndDate(format(date, 'yyyy-MM-dd'))
                              setCustomEndPickerOpen(false)
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* Year Input */}
              {periodType !== 'custom' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tahun</Label>
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="h-10 border-border bg-background/60 text-xs text-foreground rounded-xl focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Charts â€” asymmetric 3:2 split */}
          <div className="grid gap-4 xl:grid-cols-5">
            {/* Tren Pendaftaran & Konversi Area Chart */}
            <Card ref={trendCardRef} className="dashboard-panel overflow-hidden xl:col-span-3">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Tren Pendaftaran & Konversi
                      <Tooltip>
                        <TooltipTrigger className="cursor-help leading-none">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-[11px]">
                          Perbandingan pendaftaran lead baru, pengajuan request survey, dan deal closing dalam periode terpilih.
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Perbandingan pendaftaran lead, request survey, dan deal dalam periode terpilih
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveCardAsPng(trendCardRef.current, 'Tren Pendaftaran & Konversi')}
                      className="shrink-0 h-8 gap-1.5 rounded-xl border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-[11px] font-semibold transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                      title="Simpan kartu ini sebagai gambar PNG"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      Save PNG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveCardAsPdf(trendCardRef.current, 'Tren Pendaftaran & Konversi')}
                      className="shrink-0 h-8 gap-1.5 rounded-xl border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-[11px] font-semibold transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                      title="Simpan kartu ini sebagai PDF"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Save PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                {!isMounted || analyticsLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : trendData.length > 0 ? (
                  <ChartBox>
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="totalG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary-theme)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="var(--primary-theme)" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="surveysG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="dealsG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" opacity={0.5} vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<CustomAreaTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} />
                      <Area name="Total Lead" type="monotone" dataKey="total" stroke="var(--primary-theme)" strokeWidth={2} fill="url(#totalG)" animationDuration={400} />
                      <Area name="Survey" type="monotone" dataKey="surveys" stroke="#3b82f6" strokeWidth={1.5} fill="url(#surveysG)" animationDuration={400} animationBegin={30} />
                      <Area name="Deal" type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={1.5} fill="url(#dealsG)" animationDuration={400} animationBegin={60} />
                    </AreaChart>
                  </ChartBox>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/50 text-xs">Belum ada data tren periode ini</div>
                )}
              </CardContent>
            </Card>

            {/* Needs Category Bar Chart */}
            <Card className="dashboard-panel overflow-hidden xl:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Kategori Kebutuhan
                      <Tooltip>
                        <TooltipTrigger className="cursor-help leading-none">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-[11px]">
                          Distribusi kategori kebutuhan interior - menunjukkan minat produk terbanyak dari calon klien.
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Minat produk interior terbanyak
                    </CardDescription>
                  </div>
                  <CardExportButtons filename="Kategori Kebutuhan" compact />
                </div>
              </CardHeader>
              <CardContent className="h-72 sm:h-80">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : needsDistribution && needsDistribution.length > 0 ? (
                  (() => {
                    const totalNeeds = needsDistribution.reduce((acc: number, curr: any) => acc + curr.count, 0)
                    // Compute the sorted top-10 once and reuse for both the chart
                    // data and the per-bar <Cell> colours (was sorted twice).
                    const topNeeds = [...needsDistribution].sort((a: any, b: any) => b.count - a.count).slice(0, 10)
                    return (
                      <ChartBox>
                        <BarChart
                          layout="vertical"
                          data={topNeeds}
                          margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" opacity={0.5} horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            width={90}
                            tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '...' : v}
                          />
                          <ChartTooltip content={<CustomBarTooltip />} />
                          <Bar dataKey="count" name="Jumlah" radius={[0, 4, 4, 0]} maxBarSize={16} animationDuration={450}>
                            {topNeeds.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            <LabelList
                              dataKey="count"
                              content={(props: any) => {
                                const { x, y, height, value } = props
                                if (value === undefined || value === null) return null
                                const pct = totalNeeds > 0 ? ((value / totalNeeds) * 100).toFixed(1) : '0.0'
                                return (
                                  <text
                                    x={x + 6}
                                    y={y + height / 2}
                                    fill="#ffffff"
                                    fontSize="9px"
                                    fontWeight="bold"
                                    textAnchor="start"
                                    dominantBaseline="central"
                                  >
                                    {pct}%
                                  </text>
                                )
                              }}
                            />
                            <LabelList
                              dataKey="count"
                              position="right"
                              formatter={(value: any) => String(value)}
                              style={{ fontSize: '9px', fill: '#94a3b8' }}
                            />
                          </Bar>
                        </BarChart>
                      </ChartBox>
                    )
                  })()
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-muted-foreground/50">Belum ada data kategori</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Peringkat akun untuk Super Admin. */}
        {isSuperAdmin && accountsData && accountsData.length > 0 && (
          <section className="dash-rise space-y-4" style={{ animationDelay: '180ms' }}>
            <SectionLabel index="03" title="Peringkat Akun" sub="Closing deal per akun wilayah" />
            <Card className="border-border/60 bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Performa Akun Wilayah
                      <Tooltip>
                        <TooltipTrigger className="cursor-help leading-none">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-[11px]">
                          Peringkat performa setiap akun berdasarkan jumlah leads, total deal, dan rasio konversi.
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Peringkat closing deal per akun
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-amber-600 text-[10px] dark:text-amber-400">
                    {accountsData.length} Akun
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="pb-3 px-1 w-8">#</th>
                        <th className="pb-3 px-1">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Nama Akun</TooltipTrigger>
                            <TooltipContent className="text-[11px]">Nama akun</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="pb-3 px-1">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Admin</TooltipTrigger>
                            <TooltipContent className="text-[11px]">Admin yang mengelola akun ini</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="pb-3 px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Leads</TooltipTrigger>
                            <TooltipContent className="text-[11px]">Total leads yang terdaftar di akun ini</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="pb-3 px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Survey</TooltipTrigger>
                            <TooltipContent className="text-[11px]">Total leads yang sudah request survey</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="pb-3 px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Deal</TooltipTrigger>
                            <TooltipContent className="text-[11px]">Total leads yang berhasil closing</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="pb-3 px-1 text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">Rasio</TooltipTrigger>
                            <TooltipContent className="text-[11px]">Persentase konversi leads ke deal</TooltipContent>
                          </Tooltip>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {paginatedAccountsData.map((acct: any, idx: number) => {
                        const rankIndex = accountsPageStart + idx

                        return (
                          <tr key={acct.id} className="hover:bg-muted/40 transition-colors group dark:hover:bg-zinc-800/20">
                            <td className="py-3.5 px-1">
                              <span
                                className={cn(
                                  'inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black',
                                  rankIndex === 0
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : rankIndex === 1
                                    ? 'bg-muted text-muted-foreground'
                                    : rankIndex === 2
                                    ? 'bg-orange-100 text-orange-600 dark:bg-orange-800/20 dark:text-orange-400'
                                    : 'text-muted-foreground/60'
                                )}
                              >
                                {rankIndex + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-1 font-bold text-foreground/80 group-hover:text-foreground transition-colors">
                              {acct.name}
                            </td>
                            <td className="py-3.5 px-1 text-muted-foreground text-[11px]">
                              {acct.admins.map((a: any) => a.name).join(', ') || '-'}
                            </td>
                            <td className="py-3.5 px-1 text-center text-muted-foreground">{acct.total_leads}</td>
                            <td className="py-3.5 px-1 text-center text-muted-foreground">{acct.surveys ?? 0} <span className="text-[9px] font-semibold text-foreground/60">({acct.survey_rate ?? 0}%)</span></td>
                            <td className="py-3.5 px-1 text-center text-muted-foreground">{acct.deals}</td>
                            <td className="py-3.5 px-1 text-right">
                              <Tooltip>
                                <TooltipTrigger className="font-black text-amber-500 cursor-default">
                                  {acct.conversion_rate}%
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px]">
                                  {acct.deals} deal dari {acct.total_leads} leads
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {accountsData.length > ACCOUNTS_PER_PAGE && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground text-center sm:text-left">
                      Menampilkan {accountsPageStart + 1} - {Math.min(accountsPageStart + ACCOUNTS_PER_PAGE, accountsData.length)} dari {accountsData.length} akun
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        disabled={accountsPage === 1}
                        onClick={() => setAccountsPage((page) => Math.max(1, page - 1))}
                        className="border-border"
                        aria-label="Halaman sebelumnya"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      {Array.from({ length: totalAccountsPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          type="button"
                          variant={page === accountsPage ? 'default' : 'outline'}
                          size="xs"
                          onClick={() => setAccountsPage(page)}
                          className={cn(
                            'h-6 min-w-6 px-2 text-[10px] font-bold',
                            page === accountsPage
                              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        disabled={accountsPage === totalAccountsPages}
                        onClick={() => setAccountsPage((page) => Math.min(totalAccountsPages, page + 1))}
                        className="border-border"
                        aria-label="Halaman berikutnya"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Operasional. */}
        <section className="dash-rise space-y-4" style={{ animationDelay: '240ms' }}>
          <SectionLabel index="04" title="Operasional" sub="Absensi admin & aktivitas terbaru" />
          <div className={cn('grid gap-4', hasOperationalSummary && 'xl:grid-cols-2')}>
            {isSuperAdmin && dashboard?.admin_attendances ? (
              <Card className="border-border/60 bg-card shadow-sm rounded-2xl dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Laporan Absensi Hari Ini
                      <Tooltip>
                        <TooltipTrigger className="cursor-help leading-none">
                          <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-[11px]">
                          Status pengisian laporan harian oleh setiap admin untuk hari ini.
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                      Status laporan harian admin
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-muted-foreground">Hari Ini</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 pr-2">
                    <div className="space-y-2">
                      {dashboard.admin_attendances.map((att, idx) => (
                        <Tooltip key={att.id || idx}>
                          <TooltipTrigger className="flex w-full items-center justify-between rounded-xl bg-muted/40 p-3 border border-border/60 hover:border-border hover:bg-muted/60 transition-all duration-200 cursor-default text-left dark:bg-zinc-950/30 dark:border-zinc-800/50 dark:hover:border-zinc-700/60 dark:hover:bg-zinc-900/20">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center text-[10px] font-black text-foreground/70 shrink-0 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
                                {att.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{att.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {att.account_name || 'Tanpa Akun'}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {att.has_reported ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[9px] font-semibold dark:text-emerald-400"
                                >
                                  Reported
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-red-500/30 bg-red-500/10 text-red-600 text-[9px] font-semibold dark:text-red-400"
                                >
                                  Belum
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-[11px]">
                            {att.has_reported
                              ? `${att.name} sudah mengisi laporan${att.report_category ? ` (${att.report_category})` : ''}`
                              : `${att.name} belum mengisi laporan hari ini`}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              dashboard?.top_admin && (
                <Card className="border-border/60 bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-500" />
                      Admin Terunggul
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Performa closing rate tertinggi bulan ini
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="relative mb-4">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-xl font-black text-white shadow-xl shadow-amber-500/20">
                        {dashboard.top_admin.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                        <Badge className="bg-amber-500 text-white text-[9px] font-black px-2 shadow-lg">
                          #1 CLOSER
                        </Badge>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-foreground mt-2">{dashboard.top_admin.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Staff Terbaik</p>
                    <Tooltip>
                      <TooltipTrigger className="mt-4 border border-border bg-muted/40 rounded-xl px-6 py-3 cursor-default hover:border-amber-500/30 hover:bg-muted/60 transition-colors dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-950/60">
                        <span className="block text-xl font-black text-amber-500">
                          {dashboard.top_admin.deal_count}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                          Closing Deal Bulan Ini
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-[11px]">
                        {dashboard.top_admin.name} berhasil closing {dashboard.top_admin.deal_count} deal bulan ini
                      </TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
              )
            )}

            {/* Recent Consultations */}
            <Card className="border-border/60 bg-card shadow-sm rounded-2xl dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    Aktivitas Leads Terbaru
                    <Tooltip>
                      <TooltipTrigger className="cursor-help leading-none">
                        <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-[11px]">
                        Pendaftaran leads konsultasi interior yang paling baru ditambahkan.
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Klien konsultasi terbaru
                  </CardDescription>
                </div>
                <a
                  href="/consultations"
                  className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-amber-500 transition-colors"
                >
                  Lihat semua
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 pr-2">
                  <div className={cn('space-y-2', !hasOperationalSummary && 'md:grid md:grid-cols-2 md:gap-2 md:space-y-0')}>
                    {dashboard?.recent_consultations && dashboard.recent_consultations.length > 0 ? (
                      dashboard.recent_consultations.map((lead) => (
                        <Tooltip key={lead.id}>
                          <TooltipTrigger className="flex w-full items-center justify-between rounded-xl bg-muted/40 p-3 border border-border/60 hover:border-border hover:bg-muted/60 transition-all duration-200 cursor-default text-left dark:bg-zinc-950/30 dark:border-zinc-800/50 dark:hover:border-zinc-700/60 dark:hover:bg-zinc-900/20">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-foreground truncate">
                                  {lead.client_name}
                                </p>
                                <span className="text-[9px] font-mono font-semibold text-muted-foreground/60 shrink-0">
                                  {lead.consultation_id}
                                </span>
                              </div>
                              <p className="text-[10px] font-medium text-muted-foreground truncate mt-0.5">
                                {lead.city || 'Luar Kota'} - {lead.needs_category?.name || 'Kebutuhan Umum'}
                              </p>
                            </div>
                            <div className="shrink-0 ml-2">
                              {lead.status_category && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] rounded-lg px-2 py-0.5 font-bold uppercase tracking-wide"
                                  style={{
                                    borderColor: `${lead.status_category.css_class}60`,
                                    color: lead.status_category.css_class,
                                    backgroundColor: `${lead.status_category.css_class}12`,
                                  }}
                                >
                                  {lead.status_category.name}
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-[11px] max-w-[200px]">
                            <span className="font-bold">{lead.client_name}</span>
                            {lead.status_category && ` - ${lead.status_category.name}`}
                            {lead.needs_category && ` - ${lead.needs_category.name}`}
                          </TooltipContent>
                        </Tooltip>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <Activity className="h-6 w-6 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground/50">Belum ada aktivitas leads</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </TooltipProvider>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-px w-full" />
      </div>
      {/* KPI cards */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="min-h-40 overflow-hidden rounded-xl border-border/60 bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </CardHeader>
              <CardContent className="mt-auto space-y-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* charts */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-5">
          <Card className="md:col-span-3 border-border/60 bg-card rounded-2xl">
            <CardHeader className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-xl" />
            </CardContent>
          </Card>
          <Card className="md:col-span-2 border-border/60 bg-card rounded-2xl">
            <CardHeader className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
