'use client'

import { useState, useEffect } from 'react'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { useAccounts } from '@/lib/hooks/useMasterData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import {
  TrendingUp,
  BarChart3,
  Users,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Download,
  Sparkles,
  Lightbulb,
  ArrowRight,
  Target,
  Percent,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { buildExportUrl } from '@/lib/api/client'

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [weekDate, setWeekDate] = useState<string>(new Date().toISOString().split('T')[0])

  const { data: accounts } = useAccounts()

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

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

  const chartTooltipStyle = {
    backgroundColor: 'var(--popover)',
    borderColor: 'var(--border)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    fontSize: '11px',
    color: 'var(--foreground)',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-amber-200 dark:via-amber-400 dark:to-amber-100 dark:bg-clip-text dark:text-transparent">
            Analitik Laporan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Analisis performa leads, konversi penjualan, dan demografi wilayah penjualan interior.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={buildExportUrl('/api/v1/export/analytics/excel', {
              period_type: periodType,
              account: selectedAccount ? String(selectedAccount) : undefined,
              month: periodType === 'monthly' ? String(selectedMonth) : undefined,
              year: String(selectedYear),
              week_date: periodType === 'weekly' ? weekDate : undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-xs font-semibold transition-all duration-300 h-9 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </a>
          <a
            href={buildExportUrl('/api/v1/export/analytics/pdf', {
              period_type: periodType,
              account: selectedAccount ? String(selectedAccount) : undefined,
              month: periodType === 'monthly' ? String(selectedMonth) : undefined,
              year: String(selectedYear),
              week_date: periodType === 'weekly' ? weekDate : undefined,
            })}
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
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Period Type */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Rentang Periode</Label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
              className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 hover:bg-muted/50 transition-all duration-300 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
            >
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>

          {/* Account Selector (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Cabang</Label>
              <select
                value={selectedAccount || ''}
                onChange={(e) => setSelectedAccount(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 hover:bg-muted/50 transition-all duration-300 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
              >
                <option value="">Semua Cabang</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Month Select (if Monthly) */}
          {periodType === 'monthly' && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bulan</Label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full h-10 rounded-xl border border-border bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 hover:bg-muted/50 transition-all duration-300 cursor-pointer dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Week date select (if Weekly) */}
          {periodType === 'weekly' && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tanggal Acuan</Label>
              <Input
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className="h-10 border-border bg-background/60 text-xs text-foreground rounded-xl focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
              />
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
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Leads Card */}
            <Card className="border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Total Lead Terkumpul
                </CardTitle>
                <Users className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">{analytics?.totalLeads || 0}</div>
                <div className="flex items-center gap-1.5 mt-1">
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
            <Card className="border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Survey Terjadwal
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">{analytics?.totalSurveys || 0}</div>
                <div className="flex items-center justify-between mt-1 gap-1">
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500">{analytics?.requestSurveyRate || 0}%</span>
                  <span className="text-[9px] font-medium text-muted-foreground/70">Rasio survey dari total lead</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1.5 dark:bg-zinc-900">
                  <div className="bg-amber-500 h-full" style={{ width: `${analytics?.requestSurveyRate || 0}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Deal Card */}
            <Card className="border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Closing Deal
                </CardTitle>
                <Target className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">{analytics?.totalDeals || 0}</div>
                <div className="flex items-center justify-between mt-1 gap-1">
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{analytics?.dealRate || 0}%</span>
                  <span className="text-[9px] font-medium text-muted-foreground/70">Rasio closing dari total lead</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden mt-1.5 dark:bg-zinc-900">
                  <div className="bg-emerald-500 h-full" style={{ width: `${analytics?.dealRate || 0}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Quality/Active Days Card */}
            <Card className="border-border bg-card shadow-sm hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Aktivitas Pengisian
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">{dataQuality?.active_days || 0} <span className="text-xs text-muted-foreground/70">Hari</span></div>
                <p className="text-[9px] font-medium text-muted-foreground/70 mt-1">
                  Rata-rata: <span className="font-bold text-foreground/80">{summaryStats?.avg_per_active_day || 0} lead/hari</span> aktif.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Trend Chart */}
            <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Tren Pendaftaran & Konversi</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Perbandingan pendaftaran lead, request survey, dan deal dalam periode terpilih
                </CardDescription>
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
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                      <Area name="Total Leads" type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} fill="url(#totalG)" />
                      <Area name="Surveys" type="monotone" dataKey="surveys" stroke="#3b82f6" strokeWidth={1.5} fill="url(#surveysG)" />
                      <Area name="Deals" type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={1.5} fill="url(#dealsG)" />
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
                <CardTitle className="text-sm font-bold text-foreground">Kategori Kebutuhan</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Distribusi minat produk yang paling banyak diajukan klien
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72 flex items-center justify-center">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : needsData.length > 0 ? (
                  <div className="flex w-full h-full items-center justify-around">
                    <div className="w-[55%] h-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={needsData}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={3}
                          >
                            {needsData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(148,163,184,0.15)" strokeWidth={1} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ fontSize: '11px', color: 'var(--foreground)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[90%] overflow-y-auto pr-2 scrollbar-thin">
                      {needsData.slice(0, 6).map((item: any, idx: number) => (
                        <div key={`${item.name}-${idx}`} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[100px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 font-bold ml-auto">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50">Belum ada data kategori kebutuhan</p>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Distribusi Status Leads</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Status pipeline leads berjalan saat ini
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {!isMounted ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  </div>
                ) : statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" opacity={0.5} vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelStyle={{ color: 'var(--foreground)', fontSize: '11px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#f59e0b', fontSize: '11px' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statusData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground/50 text-center py-20">Belum ada data distribusi status</p>
                )}
              </CardContent>
            </Card>

            {/* Geographical Segments */}
            <Card className="border-border bg-card shadow-sm rounded-2xl dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-foreground">Segmentasi Geografis (Jawa Barat)</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">
                  Konsentrasi wilayah terdaftar untuk segmentasi pasar
                </CardDescription>
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
                          >
                            {westJavaSegmentData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="rgba(148,163,184,0.15)" strokeWidth={1} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ fontSize: '11px', color: 'var(--foreground)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[90%] overflow-y-auto pr-2 scrollbar-thin">
                      {westJavaSegmentData.map((item: any, idx: number) => (
                        <div key={`${item.name}-${idx}`} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }} />
                          <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[100px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 font-bold ml-auto">
                            {item.count}
                          </span>
                        </div>
                      ))}
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
                  <CardTitle className="text-sm font-bold text-foreground">Analisis Konversi Pipeline (Funnel)</CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground">
                    Konversi dari Leads Terdaftar → Penjadwalan Survey → Deal Closing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Step 1: Leads */}
                  <div className="relative">
                    <div className="bg-muted/40 border border-border/80 rounded-xl p-3 flex justify-between items-center relative z-10 dark:bg-zinc-950/60 dark:border-zinc-800/80">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wide">Tahap 1</span>
                        <h4 className="text-xs font-bold text-foreground/80">Leads Terdaftar</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-foreground">{funnel.leads}</span>
                        <span className="block text-[9px] font-semibold text-muted-foreground/70">Volume Awal</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow 1 */}
                  <div className="flex justify-center -my-2 relative z-0">
                    <div className="bg-muted border border-border rounded-full px-2 py-0.5 flex items-center gap-1 text-[9px] font-black text-amber-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-amber-500">
                      <Percent className="h-3 w-3" />
                      <span>{funnel.survey_rate}%</span>
                      <ArrowRight className="h-3 w-3 rotate-90" />
                    </div>
                  </div>

                  {/* Step 2: Surveys */}
                  <div className="relative">
                    <div className="bg-muted/40 border border-border/80 rounded-xl p-3 flex justify-between items-center relative z-10 dark:bg-zinc-950/60 dark:border-zinc-800/80">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wide">Tahap 2</span>
                        <h4 className="text-xs font-bold text-foreground/80">Request / Visit Survey</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-amber-600 dark:text-amber-400">{funnel.surveys}</span>
                        <span className="block text-[9px] font-semibold text-muted-foreground/70">Aktif Terjadwal</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow 2 */}
                  <div className="flex justify-center -my-2 relative z-0">
                    <div className="bg-muted border border-border rounded-full px-2 py-0.5 flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-emerald-400">
                      <Percent className="h-3 w-3" />
                      <span>{funnel.deal_from_survey_rate}%</span>
                      <ArrowRight className="h-3 w-3 rotate-90" />
                    </div>
                  </div>

                  {/* Step 3: Deals */}
                  <div className="relative">
                    <div className="bg-muted/40 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center relative z-10 glow-border-amber dark:bg-zinc-950/60">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wide">Tahap Akhir</span>
                        <h4 className="text-xs font-bold text-gradient-amber">Closing Deal Penjualan</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{funnel.deals}</span>
                        <span className="block text-[9px] font-semibold text-muted-foreground/70">Berhasil Dikonversi</span>
                      </div>
                    </div>
                  </div>
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
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-foreground">Peringkat Cabang Wilayah</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Efektivitas closing deal dihitung dari kontribusi per cabang
                    </CardDescription>
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
                          {accountRanking.map((ranking: any, index: number) => (
                            <tr key={`${ranking.name}-${index}`} className="hover:bg-muted/30 transition-colors group dark:hover:bg-zinc-900/20">
                              <td className="py-3 px-5 font-bold text-foreground/80 group-hover:text-foreground flex items-center gap-2">
                                <span className={cn(
                                  "h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 border",
                                  index === 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground border-border dark:bg-zinc-900 dark:border-zinc-800"
                                )}>
                                  {index + 1}
                                </span>
                                {ranking.name}
                              </td>
                              <td className="py-3 px-2 text-center text-muted-foreground font-semibold">{ranking.total}</td>
                              <td className="py-3 px-2 text-center text-muted-foreground">{ranking.deals} <span className="text-[9px] text-muted-foreground/50">({ranking.deal_rate}%)</span></td>
                              <td className="py-3 px-5 text-right font-black text-amber-600 dark:text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                                {ranking.score}
                              </td>
                            </tr>
                          ))}
                          {accountRanking.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-muted-foreground/50">Belum ada peringkat data</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Admin performance ranking */}
              {isSuperAdmin && (
                <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-900/60 dark:bg-zinc-950/40 dark:backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-foreground">Kontribusi Admin Teraktif</CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      Jumlah pendaftaran lead baru yang dilakukan oleh admin staff
                    </CardDescription>
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
                          {adminRanking.map((ranking: any, index: number) => (
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
                          {adminRanking.length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-10 text-center text-muted-foreground/50">Belum ada peringkat data</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
