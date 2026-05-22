'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  Layers,
  ArrowUpRight,
  Info,
  Activity,
  Award,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
        <p className="text-[11px] font-bold text-foreground">{label}</p>
        <p className="text-[11px] text-amber-500 mt-0.5 font-semibold">{payload[0].value} leads</p>
      </div>
    )
  }
  return null
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
        <p className="text-[11px] font-bold text-foreground">{payload[0].name}</p>
        <p className="text-[11px] mt-0.5 font-semibold" style={{ color: payload[0].payload.fill }}>
          {payload[0].value} leads
        </p>
      </div>
    )
  }
  return null
}

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  tooltip: string
  badge?: { label: string; positive?: boolean }
  accent?: boolean
}

function StatCard({ title, value, description, icon: Icon, tooltip, badge, accent }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm hover:border-amber-500/40 hover:scale-[1.02] hover:shadow-md transition-all duration-300 rounded-2xl group cursor-default dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-none dark:hover:shadow-amber-500/5">
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/90 via-amber-400/50 to-transparent" />
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            {title}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger className="cursor-help leading-none">
              <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-center text-[11px] leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/15 transition-colors">
          <Icon className="h-4 w-4 text-amber-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black text-foreground tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <p className="text-[10px] font-medium text-muted-foreground/80">{description}</p>
          {badge && (
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-md border',
                badge.positive === true
                  ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-400'
                  : badge.positive === false
                  ? 'text-rose-600 bg-rose-500/10 border-rose-500/25 dark:text-rose-400'
                  : 'text-muted-foreground bg-muted border-border'
              )}
            >
              {badge.label}
            </span>
          )}
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

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Activity className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">Gagal memuat dashboard. Silakan periksa koneksi Anda.</p>
      </div>
    )
  }

  const stats = dashboard?.stats
  const growthPercent = stats?.growth_percent || 0
  const growthPositive = growthPercent >= 0

  return (
    <TooltipProvider delay={400}>
      <div className="space-y-6">

        {/* Welcome Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-1">
              {today}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Selamat Datang,{' '}
              <span className="text-gradient-amber">{user?.name}</span>
            </h1>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              Ikhtisar performa leads dan konsultasi interior Anda hari ini.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-1.5 rounded-xl bg-muted/50 border border-border px-3 py-2 shrink-0 dark:bg-zinc-900/50 dark:border-zinc-800/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Leads"
            value={stats?.total_leads || 0}
            description="Seluruh waktu terdaftar"
            icon={Users}
            tooltip="Jumlah total leads konsultasi interior yang pernah terdaftar di sistem, termasuk semua status."
            accent
          />
          <StatCard
            title="Rata-rata Deal"
            value={`${stats?.avg_conversion !== undefined ? stats.avg_conversion : (stats?.conversion_rate || 0)}%`}
            description="Rasio konversi leads menjadi deal"
            icon={Target}
            tooltip="Persentase rata-rata leads yang berhasil dikonversi menjadi proyek interior aktif (deal)."
          />
          {isSuperAdmin ? (
            <StatCard
              title="Akun Aktif"
              value={stats?.active_accounts || 0}
              description={`Dari ${stats?.total_accounts || 0} akun terdaftar`}
              icon={Layers}
              tooltip="Jumlah cabang/akun yang aktif beroperasi dari total seluruh akun yang terdaftar di sistem."
            />
          ) : (
            <StatCard
              title="Menunggu Survey"
              value={stats?.pending_surveys || 0}
              description="Leads berstatus request survey"
              icon={Clock}
              tooltip="Jumlah leads yang sudah meminta jadwal survey lapangan namun belum dijadwalkan."
            />
          )}
          <StatCard
            title="Bulan Ini"
            value={stats?.completed_this_month || 0}
            description="Leads closing bulan ini"
            icon={TrendingUp}
            tooltip="Jumlah leads yang berhasil closing (deal) dalam bulan kalender saat ini."
            badge={{
              label: `${growthPositive ? '+' : ''}${growthPercent}% vs bln lalu`,
              positive: growthPositive,
            }}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Status Distribution Bar Chart */}
          <Card className="border-border/60 bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                Distribusi Status Leads
                <Tooltip>
                  <TooltipTrigger className="cursor-help leading-none">
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-[11px]">
                    Komposisi semua leads berdasarkan tahap pipeline — dari prospek awal hingga deal closing.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Pipeline konsultasi berdasarkan status
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56">
              {!isMounted ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              ) : dashboard?.status_distribution && dashboard.status_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart
                    data={dashboard.status_distribution}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: 'rgba(245,158,11,0.06)' }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-muted-foreground/50">Belum ada data status</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Needs Category Pie Chart */}
          <Card className="border-border/60 bg-card shadow-sm rounded-2xl overflow-hidden dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                Kategori Kebutuhan
                <Tooltip>
                  <TooltipTrigger className="cursor-help leading-none">
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-[11px]">
                    Distribusi kategori kebutuhan interior — menunjukkan minat produk terbanyak dari calon klien.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Minat produk interior terbanyak
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56">
              {!isMounted ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
              ) : dashboard?.needs_distribution && dashboard.needs_distribution.length > 0 ? (
                <div className="flex items-center justify-around h-full gap-3">
                  <div className="flex-1 h-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={dashboard.needs_distribution}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={74}
                          paddingAngle={3}
                        >
                          {dashboard.needs_distribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 w-[104px]">
                    {dashboard.needs_distribution.slice(0, 6).map((item, idx) => {
                      const total = dashboard.needs_distribution.reduce((s, i) => s + i.count, 0)
                      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger className="flex w-full items-center gap-1.5 cursor-default text-left">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-[10px] text-muted-foreground font-medium truncate flex-1">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 font-bold">{pct}%</span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-[11px]">
                            {item.name}: {item.count} leads ({pct}%)
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-muted-foreground/50">Belum ada data kategori</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Performance Table — Super Admin only */}
        {isSuperAdmin && dashboard?.accounts && dashboard.accounts.length > 0 && (
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
                        Peringkat performa setiap cabang berdasarkan jumlah leads, total deal, dan rasio konversi.
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground">
                    Peringkat closing deal per cabang
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-amber-600 text-[10px] dark:text-amber-400">
                  {dashboard.accounts.length} Cabang
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
                          <TooltipContent className="text-[11px]">Nama cabang atau akun wilayah</TooltipContent>
                        </Tooltip>
                      </th>
                      <th className="pb-3 px-1">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">Admin</TooltipTrigger>
                          <TooltipContent className="text-[11px]">Admin yang mengelola cabang ini</TooltipContent>
                        </Tooltip>
                      </th>
                      <th className="pb-3 px-1 text-center">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">Leads</TooltipTrigger>
                          <TooltipContent className="text-[11px]">Total leads yang terdaftar di cabang ini</TooltipContent>
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
                          <TooltipContent className="text-[11px]">Persentase konversi leads → deal</TooltipContent>
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {dashboard.accounts.map((acct, idx) => (
                      <tr key={acct.id} className="hover:bg-muted/40 transition-colors group dark:hover:bg-zinc-800/20">
                        <td className="py-3.5 px-1">
                          <span
                            className={cn(
                              'inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black',
                              idx === 0
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : idx === 1
                                ? 'bg-muted text-muted-foreground'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-600 dark:bg-orange-800/20 dark:text-orange-400'
                                : 'text-muted-foreground/60'
                            )}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-1 font-bold text-foreground/80 group-hover:text-foreground transition-colors">
                          {acct.name}
                        </td>
                        <td className="py-3.5 px-1 text-muted-foreground text-[11px]">
                          {acct.admins.map((a) => a.name).join(', ') || '-'}
                        </td>
                        <td className="py-3.5 px-1 text-center text-muted-foreground">{acct.total_leads}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance & Recent Consultations */}
        <div className="grid gap-6 md:grid-cols-2">
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
                                ✓ Reported
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
                <div className="space-y-2">
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
                              {lead.city || 'Luar Kota'} · {lead.needs_category?.name || 'Kebutuhan Umum'}
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
                          {lead.status_category && ` — ${lead.status_category.name}`}
                          {lead.needs_category && ` — ${lead.needs_category.name}`}
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
      </div>
    </TooltipProvider>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/60 bg-card rounded-2xl overflow-hidden">
            <div className="h-[2px] bg-muted w-full" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border-border/60 bg-card rounded-2xl">
            <CardHeader className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
