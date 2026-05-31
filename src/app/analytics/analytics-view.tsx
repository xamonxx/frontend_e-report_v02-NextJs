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
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts'
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
    setIsMounted(true)
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
    const opts: AutocompleteOption[] = [{ label: 'Semua Cabang', value: 'all' }]
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
    <div className="space-y-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground dark:text-gradient-amber">
            Analitik Laporan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Analisis performa leads, konversi penjualan, dan demografi wilayah penjualan interior.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-xs font-semibold transition-all duration-300 h-9 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-xs font-semibold transition-all duration-300 h-9 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 transition-all duration-300 rounded-xl h-9 cursor-pointer dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRefetching && "animate-spin")} />
            Perbarui Data
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-5 border border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60 dark:shadow-black/25">
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
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Cabang</Label>
              <Autocomplete
                value={selectedAccount ? String(selectedAccount) : 'all'}
                onChange={(v) => setSelectedAccount(v && v !== 'all' ? parseInt(v, 10) : undefined)}
                options={accountOptions}
                placeholder="Cari Cabang..."
                onlyChangeOnSelect={true}
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
            <Card className="h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
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
            <Card className="h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
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
                    <div className="bg-amber-500 h-full" style={{ width: `${analytics?.requestSurveyRate || 0}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deal Card */}
            <Card className="h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
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
                    <div className="bg-emerald-500 h-full" style={{ width: `${analytics?.dealRate || 0}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality/Active Days Card */}
            <Card className="h-full flex flex-col border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
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
            <Card ref={trendCardRef} className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
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
              <CardContent className="h-72">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                      <Area name="Total Lead" type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} fill="url(#totalG)" />
                      <Area name="Survey" type="monotone" dataKey="surveys" stroke="#3b82f6" strokeWidth={1.5} fill="url(#surveysG)" />
                      <Area name="Deal" type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={1.5} fill="url(#dealsG)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/50 text-xs">Belum ada data tren periode ini</div>
                )}
              </CardContent>
            </Card>

            {/* Needs Distribution */}
            <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
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
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                          <Bar dataKey="count" name="Jumlah" radius={[0, 4, 4, 0]} maxBarSize={16}>
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
                      </ResponsiveContainer>
                    )
                  })()
                ) : (
                  <p className="text-xs text-muted-foreground/50 flex h-full items-center justify-center">Belum ada data kategori kebutuhan</p>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
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
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={statusData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" opacity={0.5} vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <Tooltip content={renderBarTooltip} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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
                      </ResponsiveContainer>
                    )
                  })()
                ) : (
                  <p className="text-xs text-muted-foreground/50 text-center py-20">Belum ada data distribusi status</p>
                )}
              </CardContent>
            </Card>

            {/* Geographical Segments */}
            <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
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
                  <div className="flex w-full h-full items-center justify-around">
                    <div className="w-[55%] h-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={westJavaSegmentData}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={3}
                            activeShape={renderActiveShape}
                          >
                            {westJavaSegmentData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="transparent" strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip content={renderPieTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[90%] overflow-y-auto pr-2 scrollbar-thin">
                      {(() => {
                        const totalSegments = westJavaSegmentData.reduce((acc: number, curr: any) => acc + curr.count, 0)
                        return westJavaSegmentData.map((item: any, idx: number) => {
                          const pct = totalSegments > 0 ? ((item.count / totalSegments) * 100).toFixed(1) : '0.0'
                          return (
                            <div key={`${item.name}-${idx}`} className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }} />
                              <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[100px]" title={item.name}>
                                {item.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70 font-bold ml-auto">
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
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${city.percentage}%` }} />
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
              {/* Funnel Analysis */}
              <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Analisis Konversi Pipeline (Funnel)</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        Konversi dari Leads Terdaftar → Penjadwalan Survey → Deal Closing
                      </CardDescription>
                    </div>
                    <CardExportButtons filename="Analisis Konversi Pipeline" compact />
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const stages = [
                      { key: 'leads', tahap: 'Tahap 1', name: 'Leads Terdaftar', value: funnel.leads, sub: 'Volume Awal', conv: null as number | null, from: '#f59e0b', to: '#f97316' },
                      { key: 'surveys', tahap: 'Tahap 2', name: 'Request / Visit Survey', value: funnel.surveys, sub: 'Aktif Terjadwal', conv: funnel.survey_rate, from: '#3b82f6', to: '#2563eb' },
                      { key: 'deals', tahap: 'Tahap Akhir', name: 'Closing Deal Penjualan', value: funnel.deals, sub: 'Berhasil Dikonversi', conv: funnel.deal_from_survey_rate, from: '#10b981', to: '#059669' },
                    ]
                    const maxVal = Math.max(...stages.map((s) => s.value), 1)
                    return (
                      <div className="relative">
                        {/* Centerline guide */}
                        <div className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border to-transparent dark:via-zinc-800" />
                        {stages.map((s, i) => {
                          // Width scales with volume but keeps a readable floor so labels fit.
                          const widthPct = 52 + (s.value / maxVal) * 48
                          return (
                            <div key={s.key}>
                              {i > 0 && (
                                <div className="relative z-10 flex justify-center py-2">
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold tabular-nums backdrop-blur-sm"
                                    style={{ color: s.from, borderColor: `${s.from}55`, backgroundColor: `${s.from}1f` }}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                    {s.conv}%
                                  </span>
                                </div>
                              )}
                              <div
                                className="relative mx-auto flex items-center justify-between gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-white transition-[width,opacity,transform] duration-700 ease-out will-change-transform"
                                style={{
                                  width: isMounted ? `${widthPct}%` : '24%',
                                  opacity: isMounted ? 1 : 0,
                                  transitionDelay: `${i * 130}ms`,
                                  background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                                  boxShadow: `0 12px 30px -12px ${s.from}cc`,
                                }}
                              >
                                {/* top sheen for depth */}
                                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                                <div className="relative min-w-0">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-white/75">{s.tahap}</span>
                                  <h4 className="truncate text-xs font-bold text-white">{s.name}</h4>
                                </div>
                                <div className="relative shrink-0 text-right">
                                  <span className="block text-2xl font-black leading-none tabular-nums text-white drop-shadow-sm">{s.value}</span>
                                  <span className="mt-0.5 block text-[9px] font-semibold text-white/75">{s.sub}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Insights Card */}
              <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
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
                <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Peringkat Cabang Wilayah</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        Efektivitas closing deal dihitung dari kontribusi per cabang
                      </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                      <Input
                        placeholder="Cari cabang..."
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
                            <th className="py-3 px-5">Cabang</th>
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
                      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/10 dark:border-zinc-900/30 dark:bg-zinc-950/10">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Menampilkan {Math.min(filteredBranchRanking.length, (branchPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredBranchRanking.length, branchPage * ITEMS_PER_PAGE)} dari {filteredBranchRanking.length} cabang
                        </span>
                        <div className="flex items-center gap-1.5">
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
                <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
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
                            <th className="py-3 px-2">Cabang</th>
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
                      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/10 dark:border-zinc-900/30 dark:bg-zinc-950/10">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Menampilkan {Math.min(filteredAdminRanking.length, (adminPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredAdminRanking.length, adminPage * ITEMS_PER_PAGE)} dari {filteredAdminRanking.length} admin
                        </span>
                        <div className="flex items-center gap-1.5">
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
          </div>
        </div>
      )}
    </div>
  )
}
