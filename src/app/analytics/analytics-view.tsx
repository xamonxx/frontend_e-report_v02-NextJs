'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { useAccounts } from '@/lib/hooks/useMasterData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CardExportButtons } from '@/components/ui/card-export-buttons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Sector,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList
} from 'recharts'
import { ChartBox } from '@/components/ui/chart-box'
import {
  TrendingUp,
  BarChart3,
  Users,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  FileDown,
  FileImage,
  Download,
  Sparkles,
  Lightbulb,
  Target,
  Percent,
  Clock,
  CalendarIcon,
  Search,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { buildExportUrl } from '@/lib/api/client'
import { saveCardAsPng, saveCardAsPdf } from '@/lib/export-card'

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    // Small delay so the page layout settles before triggering entrance animations
    const t = setTimeout(() => setIsMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Ref to the trend card; PNG/PDF export helpers live in @/lib/export-card.
  const trendCardRef = useRef<HTMLDivElement>(null)

  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [weekDate, setWeekDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const { data: accounts } = useAccounts()

  const accountOptions = useMemo(() => {
    const opts: AutocompleteOption[] = [{ label: 'Semua Akun', value: 'all' }]
    if (accounts) {
      accounts.forEach((acc) => {
        opts.push({ label: acc.name, value: String(acc.id) })
      })
    }
    return opts
  }, [accounts])

  const { data: response, isLoading, isRefetching, refetch } = useAnalytics({
    period_type: periodType,
    account: selectedAccount,
    month: periodType === 'monthly' ? selectedMonth : undefined,
    year: selectedYear,
    week_date: periodType === 'weekly' ? weekDate : undefined,
  })

  const analytics = response?.data

  const trendData = analytics?.trendSeries || []
  const needsData = analytics?.needsDistribution || []
  const statusData = analytics?.statusDistribution || []
  const cityData = analytics?.cityDistribution || []
  const westJavaSegmentData = analytics?.westJavaSegmentDistribution || []
  const accountRanking = analytics?.accountRanking || []
  const adminRanking = analytics?.adminRanking || []
  const insights = analytics?.insights || []
  const surveyorLeaderboard = analytics?.surveyorLeaderboard || []
  const rescheduleStats = analytics?.rescheduleAnalytics || { total: 0, by_admin: 0, by_manager: 0, rescheduled_surveys: 0, rescheduled_deal_rate: 0 }
  const backlog = analytics?.surveyBacklog || { total_pending: 0, oldest_days: 0, avg_wait_days: 0, buckets: [] }
  const funnel = analytics?.funnel || { leads: 0, surveys: 0, deals: 0, survey_rate: 0, deal_rate: 0, deal_from_survey_rate: 0 }
  const dataQuality = analytics?.dataQuality || {}
  const summaryStats = analytics?.summaryStats || {}

  const [branchSearch, setBranchSearch] = useState('')
  const [branchPage, setBranchPage] = useState(1)

  // Reset pagination when search changes
  useEffect(() => {
    setBranchPage(1)
  }, [branchSearch])

  const filteredBranchRanking = useMemo(() => {
    if (!accountRanking) return []
    if (!branchSearch.trim()) return accountRanking
    const searchLower = branchSearch.toLowerCase()
    return accountRanking.filter((item: any) =>
      item.name?.toLowerCase().includes(searchLower)
    )
  }, [accountRanking, branchSearch])

  const ITEMS_PER_PAGE = 10
  const totalBranchPages = Math.ceil(filteredBranchRanking.length / ITEMS_PER_PAGE)

  const paginatedBranchRanking = useMemo(() => {
    const start = (branchPage - 1) * ITEMS_PER_PAGE
    return filteredBranchRanking.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredBranchRanking, branchPage])

  const [adminSearch, setAdminSearch] = useState('')
  const [adminPage, setAdminPage] = useState(1)

  // Reset pagination when search changes
  useEffect(() => {
    setAdminPage(1)
  }, [adminSearch])

  const filteredAdminRanking = useMemo(() => {
    if (!adminRanking) return []
    if (!adminSearch.trim()) return adminRanking
    const searchLower = adminSearch.toLowerCase()
    return adminRanking.filter((item: any) =>
      item.name?.toLowerCase().includes(searchLower) ||
      item.account?.toLowerCase().includes(searchLower)
    )
  }, [adminRanking, adminSearch])

  const totalAdminPages = Math.ceil(filteredAdminRanking.length / ITEMS_PER_PAGE)

  const paginatedAdminRanking = useMemo(() => {
    const start = (adminPage - 1) * ITEMS_PER_PAGE
    return filteredAdminRanking.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAdminRanking, adminPage])

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

  const chartTooltipStyle = {
    backgroundColor: 'var(--popover)',
    borderColor: 'var(--border)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    fontSize: '11px',
    color: 'var(--foreground)',
  }

  const renderBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const color = payload[0]?.fill || payload[0]?.color || '#f59e0b'
    return (
      <div style={{ ...chartTooltipStyle, padding: '8px 12px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: '11px', color }}>Jumlah : {payload[0]?.value}</p>
      </div>
    )
  }

  const renderAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ ...chartTooltipStyle, padding: '8px 12px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ fontSize: '11px', color: p.stroke || p.color || p.fill }}>
            {p.name} : {p.value}
          </p>
        ))}
      </div>
    )
  }

  const renderPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const color = payload[0]?.payload?.fill || payload[0]?.fill || payload[0]?.color || '#f59e0b'
    return (
      <div style={{ ...chartTooltipStyle, padding: '8px 12px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>{payload[0]?.name}</p>
        <p style={{ fontSize: '11px', color }}>Jumlah : {payload[0]?.value}</p>
      </div>
    )
  }

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="transparent"
      />
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-clip py-3 sm:space-y-6 sm:py-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Analitik Laporan
          </h1>
          <p className="max-w-2xl text-xs text-muted-foreground mt-1">
            Analisis performa leads, konversi penjualan, dan demografi wilayah penjualan interior.
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
          <a
            href={isMounted ? buildExportUrl('/api/v1/export/analytics/excel', {
              period_type: periodType,
              account: selectedAccount ? String(selectedAccount) : undefined,
              month: periodType === 'monthly' ? String(selectedMonth) : undefined,
              year: String(selectedYear),
              week_date: periodType === 'weekly' ? weekDate : undefined,
            }) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-border/80 bg-card px-2 py-2 text-[11px] font-semibold text-foreground/80 transition-all duration-300 hover:bg-muted hover:text-amber-600 hover:border-amber-500/30 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-amber-400 sm:gap-1.5 sm:px-3 sm:text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </a>
          <a
            href={isMounted ? buildExportUrl('/api/v1/export/analytics/pdf', {
              period_type: periodType,
              account: selectedAccount ? String(selectedAccount) : undefined,
              month: periodType === 'monthly' ? String(selectedMonth) : undefined,
              year: String(selectedYear),
              week_date: periodType === 'weekly' ? weekDate : undefined,
            }) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-border/80 bg-card px-2 py-2 text-[11px] font-semibold text-foreground/80 transition-all duration-300 hover:bg-muted hover:text-amber-600 hover:border-amber-500/30 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-amber-400 sm:gap-1.5 sm:px-3 sm:text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 rounded-xl border-border/80 bg-card px-2 text-[11px] text-foreground/80 transition-all duration-300 hover:bg-muted hover:text-amber-600 hover:border-amber-500/30 cursor-pointer dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-amber-400 sm:px-3 sm:text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1 sm:mr-2", isRefetching && "animate-spin")} />
            Perbarui Data
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel max-w-full p-4 border border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60 dark:bg-zinc-900/40 sm:p-5">
        <div className={cn(
          "grid gap-4 grid-cols-1 sm:grid-cols-2",
          isSuperAdmin 
            ? (periodType === 'yearly' ? "md:grid-cols-3" : "md:grid-cols-4") 
            : (periodType === 'yearly' ? "md:grid-cols-2" : "md:grid-cols-3")
        )}>
          {/* Period Type */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Rentang Periode</Label>
            <Select value={periodType} onValueChange={(v) => v && setPeriodType(v as any)}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-xs dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 hover:bg-muted/50">
                <SelectValue>
                  {periodType === 'weekly' ? 'Mingguan' : periodType === 'monthly' ? 'Bulanan' : 'Tahunan'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="yearly">Tahunan</SelectItem>
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
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {weekDate ? format(new Date(weekDate + 'T12:00:00'), 'd MMM yyyy') : 'Pilih tanggal'}
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

          {/* Year Input */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tahun</Label>
            <Input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="h-10 border-border bg-background/60 text-xs text-foreground rounded-xl focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          <span className="text-sm">Menganalisis data laporan...</span>
        </div>
      ) : (
        <div className="relative space-y-6">
          {/* Refetching visual feedback overlay */}
          {isRefetching && (
            <div className="absolute inset-0 bg-background/25 backdrop-blur-[1px] z-30 flex items-center justify-center transition-all duration-300">
              <div className="flex items-center gap-2.5 rounded-2xl bg-zinc-950/90 px-4 py-2.5 text-xs font-semibold text-amber-500 shadow-xl border border-zinc-800/80 backdrop-blur-md" style={{ borderColor: 'color-mix(in srgb, var(--primary-theme) 20%, transparent)', color: 'var(--primary-theme)' }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menganalisis data laporan baru...</span>
              </div>
            </div>
          )}
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Leads Card */}
            <Card className="min-w-0 h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-200 ease-out rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950" style={{ opacity: isMounted ? 1 : 0, transform: isMounted ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 250ms ease-out, transform 250ms ease-out' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Total Lead Terkumpul
                </CardTitle>
                <Users className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="text-2xl font-black text-foreground">{analytics?.totalLeads || 0}</div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted border border-border dark:bg-zinc-950 dark:border-zinc-900",
                      (analytics?.growthPercent || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {(analytics?.growthPercent || 0) >= 0 ? '+' : ''}
                    {analytics?.growthPercent || 0}%
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground/70">vs periode lalu ({analytics?.growthDelta >= 0 ? '+' : ''}{analytics?.growthDelta || 0} lead)</span>
                </div>
              </CardContent>
            </Card>

            {/* Survey Card */}
            <Card className="min-w-0 h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-200 ease-out rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950" style={{ opacity: isMounted ? 1 : 0, transform: isMounted ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 250ms ease-out 30ms, transform 250ms ease-out 30ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Survey Terjadwal
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="text-2xl font-black text-foreground">{analytics?.totalSurveys || 0}</div>
                <div>
                  <div className="flex items-center justify-between mt-1 gap-1">
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500">{analytics?.requestSurveyRate || 0}%</span>
                    <span className="text-[9px] font-medium text-muted-foreground/70">Rasio survey dari total lead</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1.5 dark:bg-zinc-900">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: isMounted ? `${analytics?.requestSurveyRate || 0}%` : '0%', transition: 'width 350ms ease-out 100ms' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deal Card */}
            <Card className="min-w-0 h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-200 ease-out rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950" style={{ opacity: isMounted ? 1 : 0, transform: isMounted ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 250ms ease-out 60ms, transform 250ms ease-out 60ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Closing Deal
                </CardTitle>
                <Target className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="text-2xl font-black text-foreground">{analytics?.totalDeals || 0}</div>
                <div>
                  <div className="flex items-center justify-between mt-1 gap-1">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{analytics?.dealRate || 0}%</span>
                    <span className="text-[9px] font-medium text-muted-foreground/70">Rasio closing dari total lead</span>
                  </div>
                  <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1.5 dark:bg-zinc-900">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: isMounted ? `${analytics?.dealRate || 0}%` : '0%', transition: 'width 350ms ease-out 120ms' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality/Active Days Card */}
            <Card className="min-w-0 h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-200 ease-out rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950" style={{ opacity: isMounted ? 1 : 0, transform: isMounted ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 250ms ease-out 90ms, transform 250ms ease-out 90ms' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Aktivitas Pengisian
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="text-2xl font-black text-foreground">{dataQuality?.active_days || 0} <span className="text-xs text-muted-foreground/70">Hari</span></div>
                <p className="text-[9px] font-medium text-muted-foreground/70 mt-1.5">
                  Rata-rata: <span className="font-bold text-foreground/80">{summaryStats?.avg_per_active_day || 0} lead/hari</span> aktif.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Trend Chart */}
            <Card ref={trendCardRef} className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Tren Pendaftaran & Konversi</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Perbandingan pendaftaran lead, request survey, dan deal dalam periode terpilih
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveCardAsPng(trendCardRef.current, 'Tren Pendaftaran & Konversi')}
                      className="shrink-0 h-8 gap-1.5 rounded-xl border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-[11px] font-semibold transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60 px-2 sm:px-3"
                      title="Simpan kartu ini sebagai gambar PNG"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Save PNG</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveCardAsPdf(trendCardRef.current, 'Tren Pendaftaran & Konversi')}
                      className="shrink-0 h-8 gap-1.5 rounded-xl border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-[11px] font-semibold transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60 px-2 sm:px-3"
                      title="Simpan kartu ini sebagai PDF"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Save PDF</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-72">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : trendData.length > 0 ? (
                  <ChartBox>
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="totalG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
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
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={renderAreaTooltip} />
                      <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                      <Area name="Total Lead" type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} fill="url(#totalG)" animationDuration={400} />
                      <Area name="Survey" type="monotone" dataKey="surveys" stroke="#3b82f6" strokeWidth={1.5} fill="url(#surveysG)" animationDuration={400} animationBegin={30} />
                      <Area name="Deal" type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={1.5} fill="url(#dealsG)" animationDuration={400} animationBegin={60} />
                    </AreaChart>
                  </ChartBox>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/50 text-xs">Belum ada data tren periode ini</div>
                )}
              </CardContent>
            </Card>

            {/* Needs Distribution */}
            <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Kategori Kebutuhan</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Minat produk interior terbanyak
                    </CardDescription>
                  </div>
                  <CardExportButtons filename="Kategori Kebutuhan" />
                </div>
              </CardHeader>
              <CardContent className="h-72">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : needsData.length > 0 ? (
                  (() => {
                    const totalNeeds = needsData.reduce((acc: number, curr: any) => acc + curr.count, 0)
                    // Sort the top-10 once and reuse for chart data + <Cell> colours.
                    const topNeeds = [...needsData].sort((a: any, b: any) => b.count - a.count).slice(0, 10)
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
                            tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v}
                          />
                          <Tooltip content={renderBarTooltip} />
                          <Bar dataKey="count" name="Jumlah" radius={[0, 4, 4, 0]} maxBarSize={16} animationDuration={400}>
                            {topNeeds.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            <LabelList
                              dataKey="count"
                              content={(props: any) => {
                                const { x, y, width, height, value } = props
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
                  <p className="text-xs text-muted-foreground/50 flex h-full items-center justify-center">Belum ada data kategori kebutuhan</p>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Distribusi Status Leads</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Status pipeline leads berjalan saat ini
                    </CardDescription>
                  </div>
                  <CardExportButtons filename="Distribusi Status Leads" />
                </div>
              </CardHeader>
              <CardContent className="h-72">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : statusData.length > 0 ? (
                  (() => {
                    const totalStatus = statusData.reduce((acc: number, curr: any) => acc + curr.count, 0)
                    return (
                      <ChartBox>
                        <BarChart data={statusData} margin={{ top: 15, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" opacity={0.5} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={8}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                            height={30}
                          />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip content={renderBarTooltip} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={400}>
                            {statusData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
                            ))}
                            <LabelList
                              dataKey="count"
                              content={(props: any) => {
                                const { x, y, width, height, value } = props
                                if (value === undefined || value === null || value === 0) return null
                                const pct = totalStatus > 0 ? ((value / totalStatus) * 100).toFixed(1) : '0.0'
                                if (height < 14) return null
                                return (
                                  <text
                                    x={x + width / 2}
                                    y={y + 12}
                                    fill="#ffffff"
                                    fontSize="9px"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {pct}%
                                  </text>
                                )
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ChartBox>
                    )
                  })()
                ) : (
                  <p className="text-xs text-muted-foreground/50 text-center py-20">Belum ada data distribusi status</p>
                )}
              </CardContent>
            </Card>

            {/* Geographical Segments */}
            <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Segmentasi Geografis (Jawa Barat)</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Konsentrasi wilayah terdaftar untuk segmentasi pasar
                    </CardDescription>
                  </div>
                  <CardExportButtons filename="Segmentasi Geografis Jawa Barat" />
                </div>
              </CardHeader>
              <CardContent className="h-72 flex items-center justify-center">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : westJavaSegmentData.length > 0 && westJavaSegmentData.some((s: any) => s.count > 0) ? (
                  <div className="flex flex-col sm:flex-row w-full h-full items-center justify-center sm:justify-around gap-4">
                    <div className="w-[170px] h-[170px] sm:w-[55%] sm:h-full flex items-center justify-center shrink-0">
                      <ChartBox>
                        <PieChart>
                          <Pie
                            data={westJavaSegmentData}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            animationDuration={400}
                            animationEasing="ease-in-out"
                            animationBegin={100}
                            activeShape={renderActiveShape}
                          >
                            {westJavaSegmentData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="transparent" strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip content={renderPieTooltip} />
                        </PieChart>
                      </ChartBox>
                    </div>
                    <div className="flex flex-wrap sm:flex-col justify-center gap-x-4 gap-y-2.5 max-h-[100px] sm:max-h-[90%] overflow-y-auto pr-2 scrollbar-thin w-full sm:w-auto px-4 sm:px-0">
                      {(() => {
                        const totalSegments = westJavaSegmentData.reduce((acc: number, curr: any) => acc + curr.count, 0)
                        return westJavaSegmentData.map((item: any, idx: number) => {
                          const pct = totalSegments > 0 ? ((item.count / totalSegments) * 100).toFixed(1) : '0.0'
                          return (
                            <div key={`${item.name}-${idx}`} className="flex items-center gap-2 min-w-[120px] sm:min-w-0">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }} />
                              <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[80px] sm:max-w-[100px]" title={item.name}>
                                {item.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70 font-bold ml-auto sm:ml-2">
                                {item.count} ({pct}%)
                              </span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider text-center">Kota Penjualan Teratas</p>
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {cityData.slice(0, 4).map((city: any, idx: number) => (
                        <div key={`${city.name}-${idx}`} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                            <span className="truncate max-w-[150px]">{city.name}</span>
                            <span>{city.percentage}% ({city.count})</span>
                          </div>
                          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden dark:bg-zinc-900">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: isMounted ? `${city.percentage}%` : '0%', transition: `width 350ms ease-out ${50 + idx * 50}ms` }} />
                          </div>
                        </div>
                      ))}
                      {cityData.length === 0 && (
                        <p className="text-xs text-muted-foreground/50 text-center py-10">Belum ada wilayah terdaftar</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lower Grid: Insights + Funnel / branch stats */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Funnel & System Insights */}
            <div className="space-y-6">
              {/* Funnel Analysis — Modern Redesign */}
              <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-[#111827] dark:shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Pipeline Konversi</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        Leads → Survey → Closing Deal
                      </CardDescription>
                    </div>
                    <CardExportButtons filename="Pipeline Konversi" compact />
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const stages = [
                      { key: 'leads', label: 'Leads', value: funnel.leads, color: '#f59e0b', textColor: '#f59e0b', conv: null as number | null, unit: 'lead' },
                      { key: 'surveys', label: 'Survey', value: funnel.surveys, color: '#3b82f6', textColor: '#629bf8', conv: funnel.survey_rate, unit: 'survey' },
                      { key: 'deals', label: 'Deal', value: funnel.deals, color: '#10b981', textColor: '#10b981', conv: funnel.deal_from_survey_rate, unit: 'deal' },
                    ]
                    const maxVal = Math.max(...stages.map((s) => s.value), 1)
                    return (
                      <div className="space-y-3.5">
                        {stages.map((s, i) => {
                          const barPct = s.value > 0 ? Math.max((s.value / maxVal) * 100, 8) : 0
                          const transitionLabel = i === 1 ? 'Lead -> Survey' : 'Survey -> Deal'
                          return (
                            <div key={s.key} className="space-y-2">
                              {/* Conversion rate connector */}
                              {i > 0 && (
                                <div className="flex items-center justify-center gap-2 py-1.5">
                                  <div className="h-px flex-1 bg-border/50 dark:bg-slate-700/45" />
                                  <span
                                    className="whitespace-nowrap text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full border"
                                    style={{ color: s.textColor, borderColor: `${s.color}30`, backgroundColor: `${s.color}0d` }}
                                  >
                                    {transitionLabel} {s.conv}%
                                  </span>
                                  <div className="h-px flex-1 bg-border/50 dark:bg-slate-700/45" />
                                </div>
                              )}
                              {/* Stage row */}
                              <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
                                {/* Label + value */}
                                <div className="min-w-0">
                                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</span>
                                  <span className="block text-xl font-black tabular-nums text-foreground leading-tight">{s.value}</span>
                                </div>
                                {/* Progress bar */}
                                <div className="min-w-0">
                                  <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <span className="truncate text-[10px] font-medium text-muted-foreground/80">{s.label} masuk funnel</span>
                                    <span className="shrink-0 text-[10px] font-black tabular-nums" style={{ color: s.textColor }}>
                                      {s.value} {s.unit}
                                    </span>
                                  </div>
                                  <div className="relative h-7 overflow-hidden rounded-lg bg-muted/40 ring-1 ring-inset ring-border/40 dark:bg-slate-950/50 dark:ring-slate-700/45">
                                    {s.value === 0 && (
                                      <div
                                        className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2"
                                        style={{ backgroundColor: `${s.color}35` }}
                                      />
                                    )}
                                    <div
                                      className="h-full rounded-lg"
                                      style={{
                                        width: isMounted ? `${barPct}%` : '0%',
                                        backgroundColor: s.color,
                                        transition: `width 400ms ease-out ${50 + i * 80}ms`,
                                        opacity: 0.9,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {/* Summary line */}
                        <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t border-border/40 dark:border-slate-700/45">
                          <span className="text-[10px] text-muted-foreground font-medium">Rasio Keseluruhan (Lead → Deal)</span>
                          <span className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">{funnel.deal_rate || 0}%</span>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Insights Card */}
              <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Saran & Insights Laporan</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Catatan performa dan anomali sistem secara otomatis
                    </CardDescription>
                  </div>
                  <Lightbulb className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)] animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.length > 0 ? (
                      insights.map((insight: any, index: number) => (
                        <div key={index} className="flex gap-3 bg-muted/30 border border-border/60 rounded-xl p-3 items-start hover:border-border transition-colors duration-200 dark:bg-zinc-950/30 dark:border-zinc-900 dark:hover:border-zinc-800/80">
                          <span className="h-6 w-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                          <div
                            className="text-xs text-foreground/80 leading-relaxed font-medium [&>mark]:bg-amber-500/15 [&>mark]:text-amber-600 dark:[&>mark]:text-amber-400 [&>mark]:px-1 [&>mark]:py-0.5 [&>mark]:rounded [&>mark]:font-semibold"
                            dangerouslySetInnerHTML={{ __html: insight.html }}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground/50 text-center py-10">Belum ada rekomendasi yang dihitung untuk periode ini</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Branch and Admin Rankings */}
            <div className="space-y-6">
              {/* Account Ranking (Super Admin Only) */}
              {isSuperAdmin && (
                <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-900/60 dark:bg-zinc-950">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Peringkat Akun Wilayah</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        Efektivitas closing deal dihitung dari kontribusi per akun
                      </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                      <Input
                        placeholder="Cari akun..."
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        className="pl-8 h-8 text-[11px] border-border bg-muted/40 placeholder:text-muted-foreground/40 focus-visible:ring-amber-500/50 rounded-xl dark:border-zinc-800 dark:bg-zinc-900/60"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 dark:border-zinc-900 dark:bg-zinc-950/20">
                            <th className="py-3 px-5">Akun</th>
                            <th className="py-3 px-2 text-center">Total Lead</th>
                            <th className="py-3 px-2 text-center">Closing Deal</th>
                            <th className="py-3 px-5 text-right">Skor Performa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-xs dark:divide-zinc-900/30">
                          {paginatedBranchRanking.map((ranking: any, index: number) => {
                            const originalIndex = accountRanking.findIndex((x: any) => x.name === ranking.name)
                            return (
                              <tr key={`${ranking.name}-${index}`} className="hover:bg-muted/30 transition-colors group dark:hover:bg-zinc-900/20">
                                <td className="py-3 px-5 font-bold text-foreground/80 group-hover:text-foreground flex items-center gap-2">
                                  <span className={cn(
                                    "h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 border",
                                    originalIndex === 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground border-border dark:bg-zinc-900 dark:border-zinc-800"
                                  )}>
                                    {originalIndex + 1}
                                  </span>
                                  {ranking.name}
                                </td>
                                <td className="py-3 px-2 text-center text-muted-foreground font-semibold">{ranking.total}</td>
                                <td className="py-3 px-2 text-center text-muted-foreground">{ranking.deals} <span className="text-[9px] text-muted-foreground/50">({ranking.deal_rate}%)</span></td>
                                <td className="py-3 px-5 text-right font-black text-amber-600 dark:text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                                  {ranking.score}
                                </td>
                              </tr>
                            )
                          })}
                          {filteredBranchRanking.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-muted-foreground/50">Belum ada peringkat data</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalBranchPages > 1 && (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-border/40 bg-muted/10 dark:border-zinc-900/30 dark:bg-zinc-950/10">
                        <span className="text-[10px] text-muted-foreground font-semibold text-center sm:text-left">
                          Menampilkan {Math.min(filteredBranchRanking.length, (branchPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredBranchRanking.length, branchPage * ITEMS_PER_PAGE)} dari {filteredBranchRanking.length} akun
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={branchPage === 1}
                            onClick={() => setBranchPage((p) => Math.max(1, p - 1))}
                            className="h-7 px-2.5 rounded-lg border-border text-[10px] font-bold"
                          >
                            Sebelumnya
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalBranchPages }, (_, i) => i + 1).map((p) => (
                              <Button
                                key={p}
                                variant={p === branchPage ? "default" : "outline"}
                                size="xs"
                                onClick={() => setBranchPage(p)}
                                className={cn(
                                  "h-7 w-7 rounded-lg text-[10px] font-bold p-0",
                                  p === branchPage ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 border-transparent" : "border-border"
                                )}
                              >
                                {p}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={branchPage === totalBranchPages}
                            onClick={() => setBranchPage((p) => Math.min(totalBranchPages, p + 1))}
                            className="h-7 px-2.5 rounded-lg border-border text-[10px] font-bold"
                          >
                            Selanjutnya
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Admin performance ranking */}
              {isSuperAdmin && (
                <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-900/60 dark:bg-zinc-950">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Kontribusi Admin Teraktif</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        Jumlah pendaftaran lead baru yang dilakukan oleh admin staff
                      </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                      <Input
                        placeholder="Cari admin..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="pl-8 h-8 text-[11px] border-border bg-muted/40 placeholder:text-muted-foreground/40 focus-visible:ring-amber-500/50 rounded-xl dark:border-zinc-800 dark:bg-zinc-900/60"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 dark:border-zinc-900 dark:bg-zinc-950/20">
                            <th className="py-3 px-5">Nama Admin</th>
                            <th className="py-3 px-2">Akun</th>
                            <th className="py-3 px-5 text-right">Lead Diinput</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 text-xs dark:divide-zinc-900/30">
                          {paginatedAdminRanking.map((ranking: any, index: number) => (
                            <tr key={`${ranking.name}-${index}`} className="hover:bg-muted/30 transition-colors group dark:hover:bg-zinc-900/20">
                              <td className="py-3 px-5 font-bold text-foreground/80 group-hover:text-foreground flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0 border border-border dark:bg-zinc-900 dark:border-zinc-800">
                                  {ranking.name.slice(0, 2).toUpperCase()}
                                </span>
                                {ranking.name}
                              </td>
                              <td className="py-3 px-2 text-muted-foreground/70">{ranking.account || '-'}</td>
                              <td className="py-3 px-5 text-right font-bold text-foreground/80">{ranking.total} lead</td>
                            </tr>
                          ))}
                          {filteredAdminRanking.length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-10 text-center text-muted-foreground/50">Belum ada peringkat data</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalAdminPages > 1 && (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-3 border-t border-border/40 bg-muted/10 dark:border-zinc-900/30 dark:bg-zinc-950/10">
                        <span className="text-[10px] text-muted-foreground font-semibold text-center sm:text-left">
                          Menampilkan {Math.min(filteredAdminRanking.length, (adminPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredAdminRanking.length, adminPage * ITEMS_PER_PAGE)} dari {filteredAdminRanking.length} admin
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={adminPage === 1}
                            onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                            className="h-7 px-2.5 rounded-lg border-border text-[10px] font-bold"
                          >
                            Sebelumnya
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map((p) => (
                              <Button
                                key={p}
                                variant={p === adminPage ? "default" : "outline"}
                                size="xs"
                                onClick={() => setAdminPage(p)}
                                className={cn(
                                  "h-7 w-7 rounded-lg text-[10px] font-bold p-0",
                                  p === adminPage ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 border-transparent" : "border-border"
                                )}
                              >
                                {p}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={adminPage === totalAdminPages}
                            onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
                            className="h-7 px-2.5 rounded-lg border-border text-[10px] font-bold"
                          >
                            Selanjutnya
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Analitik Tim Survey ─────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-6 w-1 rounded-full bg-amber-500" />
                <div>
                  <h2 className="text-base font-bold text-foreground">Analitik Tim Survey</h2>
                  <p className="text-[11px] text-muted-foreground">Kinerja surveyor, antrian, dan perubahan jadwal pada periode terpilih.</p>
                </div>
              </div>

              {/* Leaderboard Surveyor */}
              <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-900/60 dark:bg-zinc-950">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-500" /> Leaderboard Surveyor
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground">
                    Berdasarkan survey selesai pada periode ini
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 dark:border-zinc-900 dark:bg-zinc-950/20">
                          <th className="py-3 px-5">Surveyor</th>
                          <th className="py-3 px-2 text-right">Selesai</th>
                          <th className="py-3 px-2 text-right">Durasi Rata²</th>
                          <th className="py-3 px-2 text-right">Tepat Waktu</th>
                          <th className="py-3 px-5 text-right">Deal-rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 text-xs dark:divide-zinc-900/30">
                        {surveyorLeaderboard.map((r: any, index: number) => (
                          <tr key={r.surveyor_id} className="hover:bg-muted/30 transition-colors group dark:hover:bg-zinc-900/20">
                            <td className="py-3 px-5 font-bold text-foreground/80 group-hover:text-foreground">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
                                  index === 0 ? 'bg-amber-500 text-zinc-950' : 'bg-muted text-muted-foreground border border-border dark:bg-zinc-900 dark:border-zinc-800'
                                )}>
                                  {index + 1}
                                </span>
                                {r.name}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-foreground/80">{r.completed}</td>
                            <td className="py-3 px-2 text-right text-muted-foreground/80">
                              {r.avg_duration_min != null ? `${Math.floor(r.avg_duration_min / 60)}j ${r.avg_duration_min % 60}m` : '-'}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {r.on_time_rate != null ? (
                                <span className={cn('font-semibold', r.on_time_rate >= 80 ? 'text-emerald-500' : r.on_time_rate >= 50 ? 'text-amber-500' : 'text-rose-500')}>
                                  {r.on_time_rate}%
                                </span>
                              ) : <span className="text-muted-foreground/50">-</span>}
                            </td>
                            <td className="py-3 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-[10px] text-muted-foreground/70">{r.deals} deal</span>
                                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden dark:bg-zinc-800">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, r.deal_rate)}%` }} />
                                </div>
                                <span className="font-bold text-emerald-500 w-10 text-right">{r.deal_rate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {surveyorLeaderboard.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-muted-foreground/50">Belum ada survey selesai pada periode ini</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Antrian / Backlog */}
                <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" /> Antrian Survey
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Survey menunggu dijadwalkan (kondisi terkini)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-foreground leading-none">{backlog.total_pending}</span>
                      <span className="text-[11px] text-muted-foreground mb-0.5">menunggu</span>
                    </div>
                    <div className="space-y-1.5">
                      {backlog.buckets.map((b: any) => {
                        const max = Math.max(1, ...backlog.buckets.map((x: any) => x.count))
                        const color = b.label === '>3 hari' ? 'bg-rose-500' : b.label === '1-3 hari' ? 'bg-amber-500' : 'bg-blue-500'
                        return (
                          <div key={b.label} className="flex items-center gap-2">
                            <span className="w-16 text-[10px] font-semibold text-muted-foreground shrink-0">{b.label}</span>
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden dark:bg-zinc-800">
                              <div className={cn('h-full rounded-full', color)} style={{ width: `${(b.count / max) * 100}%` }} />
                            </div>
                            <span className="w-6 text-right text-[11px] font-bold text-foreground/80">{b.count}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground dark:border-zinc-900">
                      <span>Terlama: <b className={cn(backlog.oldest_days > 3 ? 'text-rose-500' : 'text-foreground/80')}>{backlog.oldest_days} hari</b></span>
                      <span>Rata-rata tunggu: <b className="text-foreground/80">{backlog.avg_wait_days} hari</b></span>
                    </div>
                  </CardContent>
                </Card>

                {/* Reschedule */}
                <Card className="min-w-0 border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-amber-500" /> Perubahan Jadwal
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Reschedule pada periode ini & dampaknya
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-foreground leading-none">{rescheduleStats.total}</span>
                      <span className="text-[11px] text-muted-foreground mb-0.5">kali reschedule</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 dark:border-zinc-900 dark:bg-zinc-950/30">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Oleh Admin</p>
                        <p className="text-lg font-bold text-cyan-500">{rescheduleStats.by_admin}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 dark:border-zinc-900 dark:bg-zinc-950/30">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Oleh Manager</p>
                        <p className="text-lg font-bold text-blue-500">{rescheduleStats.by_manager}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                      <span className="text-[11px] text-muted-foreground">Deal-rate setelah reschedule</span>
                      <span className="text-sm font-bold text-emerald-500">{rescheduleStats.rescheduled_deal_rate}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
