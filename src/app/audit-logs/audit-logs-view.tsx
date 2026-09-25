'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import {
  useCreateReminderCronJob,
  useDeleteReminderCronJob,
  usePreviewSurveyReminderSetting,
  useReminderCronJobsList,
  useSurveyReminderDeliveries,
  useSurveyReminderSetting,
  useToggleReminderCronJob,
  useUpdateReminderCronJob,
  useUpdateSurveyReminderSetting,
  useUsersList,
} from '@/lib/hooks/useMasterData'
import { useOnlineUsers } from '@/lib/hooks/useOnlineUsers'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { TimeSearchSelect } from '@/components/ui/time-search-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format, parseISO } from 'date-fns'
import {
  Search, Calendar, Loader2, ChevronLeft, ChevronRight,
  ShieldCheck, RefreshCw, Trash2, Clock, Users, Globe,
  Activity, ArrowRightLeft, BellRing, BellDot, Cpu, Edit2, Eye, FileText, Plus, User, SlidersHorizontal
} from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/authStore'
import { useClearLogs } from '@/lib/hooks/useDebug'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/errors'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { SURVEY_TIME_OPTIONS } from '@/lib/survey-scheduling'
import type { ReminderCronJob, SurveyReminderDeliveryItem } from '@/types'

export default function AuditLogsPage() {
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState<'logs' | 'reminder-jobs' | 'survey-reminders'>('logs')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [actionFilter, setActionFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const clearLogsMutation = useClearLogs()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, actionFilter, userIdFilter, startDate, endDate])

  const { data: onlineData, dataUpdatedAt } = useOnlineUsers()
  const onlineUsers = onlineData?.data ?? []
  const onlineCount = onlineData?.count ?? 0
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  const handleClearLogs = async () => {
    const isConfirmed = await confirm({
      title: 'Bersihkan Log Sistem?',
      description: 'Apakah Anda yakin ingin membersihkan seluruh log sistem (log file Laravel & audit log database)? Tindakan ini bersifat permanen.',
      actionLabel: 'Bersihkan',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })
    if (!isConfirmed) return
    toast.promise(
      new Promise((resolve, reject) => {
        clearLogsMutation.mutate(undefined, {
          onSuccess: (data) => { refetch(); resolve(data) },
          onError: (err) => reject(err),
        })
      }),
      {
        loading: 'Membersihkan log sistem...',
        success: (data: any) => data.message || 'Log sistem berhasil dibersihkan!',
        error: (err: unknown) => getErrorMessage(err, 'Gagal membersihkan log sistem.'),
      },
    )
  }

  const { data: response, isLoading, isRefetching, refetch } = useAuditLogs({
    search: debouncedSearch,
    action: actionFilter,
    user_id: userIdFilter,
    start_date: startDate,
    end_date: endDate,
    page,
  })

  const { data: usersResponse } = useUsersList({ page: 1 })
  const usersList = usersResponse?.data || []

  const auditLogs = response?.data || []
  const meta = response?.meta
  const activeFilterCount = [searchTerm, actionFilter, userIdFilter, startDate, endDate].filter(Boolean).length

  const resetFilters = () => {
    setSearchTerm('')
    setActionFilter('')
    setUserIdFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created':   return 'border-emerald-500/20 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-950/20'
      case 'updated':   return 'border-amber-500/20 text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-950/20'
      case 'deleted':   return 'border-red-500/20 text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-950/20'
      case 'retrieved':
      default:          return 'border-blue-500/20 text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-950/20'
    }
  }

  const getActionLabel = (action: string) => ({
    created: 'Ditambahkan',
    updated: 'Diubah',
    deleted: 'Dihapus',
    retrieved: 'Diakses',
  }[action] || action)

  return (
    <div className="min-w-0 space-y-5 pb-8 pt-3 sm:pt-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--primary-theme)]">
            <span className="h-1.5 w-1.5 bg-[var(--primary-theme)]" />
            Keamanan sistem - histori aktivitas
          </div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground sm:text-[28px]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_12%,transparent)] text-[var(--primary-theme)] ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_28%,transparent)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Audit Log Aktivitas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Pantau seluruh aktivitas transaksi, login, penambahan data, dan perubahan log keamanan sistem.
          </p>
        </div>
        {isSuperAdmin && activeTab === 'logs' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearLogs}
            disabled={clearLogsMutation.isPending}
            className="h-10 self-start rounded-lg border border-red-500/35 bg-red-500/10 px-4 font-semibold text-red-600 shadow-none hover:bg-red-500/15 dark:text-red-400 sm:self-auto"
          >
            {clearLogsMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Membersihkan...</>
            ) : (
              <><Trash2 className="h-4 w-4 mr-2" />Bersihkan Log Sistem</>
            )}
          </Button>
        )}
      </div>

      <div role="tablist" aria-label="Audit dan pengingat" className="grid w-full grid-cols-3 gap-1 rounded-xl border border-border/60 bg-card/45 p-1 shadow-sm lg:w-fit">
        {([
          { key: 'logs', label: 'Log Aktivitas', icon: FileText },
          { key: 'reminder-jobs', label: 'Pengingat Absensi', icon: BellRing },
          { key: 'survey-reminders', label: 'Pengingat Survey', icon: BellDot },
        ] as const).map((tab) => {
          const active = activeTab === tab.key
          const Icon = tab.icon

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative flex min-w-0 items-center justify-center rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-theme)] sm:px-4',
                active ? 'text-[var(--primary-theme)]' : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="audit-log-active-tab"
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.85 }}
                  className="pointer-events-none absolute inset-0 rounded-lg border border-white/15 bg-[color-mix(in_srgb,var(--primary-theme)_16%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_30%,transparent)]"
                />
              )}
              <span className="relative z-10 flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {activeTab === 'logs' && (
        <>

      {/* ── Online Users Panel ──────────────────────────────── */}
      <section className="overflow-hidden rounded-xl bg-card/75 ring-1 ring-border/60">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/45 bg-muted/20 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            {/* Pulsing indicator */}
            <div className="relative flex items-center justify-center h-4 w-4 shrink-0">
              <span className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-20',
                onlineCount > 0 ? 'bg-emerald-500' : 'bg-muted-foreground',
              )} />
              <span className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                onlineCount > 0 ? 'bg-emerald-500' : 'bg-zinc-500',
              )} />
            </div>
            <span className="text-sm font-semibold text-foreground">User Online Sekarang</span>
            <Badge
              variant="outline"
              className={cn(
                'h-5 rounded-md border px-2 text-[10px] font-bold shadow-none',
                onlineCount > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted border-border text-muted-foreground',
              )}
            >
              {onlineCount} online
            </Badge>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="opacity-50">· auto 30s</span>
            </div>
          )}
        </div>

        {/* User cards */}
        <div className="px-4 py-4 sm:px-5">
          {onlineUsers.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60 py-1 font-medium">
              <Users className="h-4 w-4 text-muted-foreground/40" />
              <span>Tidak ada user yang aktif dalam 5 menit terakhir.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {onlineUsers.map((u) => {
                const secondsAgo = Math.floor((Date.now() - new Date(u.last_seen_at).getTime()) / 1000)
                const timeLabel = secondsAgo < 60
                  ? `${secondsAgo}d lalu`
                  : `${Math.floor(secondsAgo / 60)}m lalu`
                const isSA = u.role === 'super_admin'

                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg bg-background/45 px-3 py-2 ring-1 ring-border/55 transition-colors hover:bg-muted/35"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary-theme)_12%,transparent)] text-[10px] font-bold text-[var(--primary-theme)] ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_25%,transparent)]',
                      )}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-background ring-1 ring-emerald-500/30" />
                    </div>
                    {/* Info */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground/90 truncate leading-none">{u.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn(
                          'text-[9px] font-extrabold uppercase tracking-wider',
                          isSA ? 'text-[var(--primary-theme)]' : 'text-muted-foreground',
                        )}>
                          {u.role_label}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 font-medium">· {timeLabel}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Filters Card ────────────────────────────────────── */}
      <section className="rounded-xl bg-card/75 p-4 ring-1 ring-border/60 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_10%,transparent)] text-[var(--primary-theme)]">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Filter Aktivitas</h2>
              <p className="text-[11px] text-muted-foreground">Persempit log berdasarkan aksi, operator, atau waktu.</p>
            </div>
            {activeFilterCount > 0 && (
              <Badge className="h-5 rounded-md bg-[var(--primary-theme)] px-2 text-[10px] text-white">
                {activeFilterCount} aktif
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0} className="h-8 rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
              Reset
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()} className="h-8 w-8 rounded-lg border-border/60 bg-background/35" title="Muat ulang data">
              <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', isRefetching && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {/* Search */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pl-1">Cari Aktivitas</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input
                placeholder="Cari deskripsi log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-lg border-border/60 bg-background/45 pl-9 text-xs text-foreground placeholder:text-muted-foreground/55 focus-visible:border-[var(--primary-theme)] focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_18%,transparent)]"
              />
            </div>
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pl-1">Jenis Aksi</Label>
            <Select value={actionFilter || 'all'} onValueChange={(v) => setActionFilter(v === 'all' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-10 rounded-lg border-border/60 bg-background/45 text-xs text-foreground">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                <SelectItem value="created">Created (Penambahan)</SelectItem>
                <SelectItem value="updated">Updated (Perubahan)</SelectItem>
                <SelectItem value="deleted">Deleted (Penghapusan)</SelectItem>
                <SelectItem value="retrieved">Retrieved (Pencarian)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pl-1">Operator (User)</Label>
            <Select value={userIdFilter || 'all'} onValueChange={(v) => setUserIdFilter(v === 'all' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-10 rounded-lg border-border/60 bg-background/45 text-xs text-foreground">
                <SelectValue placeholder="Semua User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua User</SelectItem>
                {usersList.map((usr: any) => (
                  <SelectItem key={usr.id} value={String(usr.id)}>{usr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pl-1">Tanggal Awal</Label>
            <Popover>
              <PopoverTrigger
                type="button"
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border border-border/60 bg-background/45 px-3.5 text-left text-xs font-normal text-foreground/80 hover:bg-muted/35 focus:outline-hidden focus:ring-1 focus:ring-[var(--primary-theme)]",
                  !startDate && "text-muted-foreground/50"
                )}
              >
                {startDate ? (
                  format(parseISO(startDate), 'dd/MM/yyyy')
                ) : (
                  <span>Pilih Tanggal Awal</span>
                )}
                <Calendar className="h-4 w-4 ml-auto text-muted-foreground/40" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate ? parseISO(startDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear()
                      const mm = String(date.getMonth() + 1).padStart(2, '0')
                      const dd = String(date.getDate()).padStart(2, '0')
                      setStartDate(`${yyyy}-${mm}-${dd}`)
                    } else {
                      setStartDate('')
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pl-1">Tanggal Akhir</Label>
            <Popover>
              <PopoverTrigger
                type="button"
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border border-border/60 bg-background/45 px-3.5 text-left text-xs font-normal text-foreground/80 hover:bg-muted/35 focus:outline-hidden focus:ring-1 focus:ring-[var(--primary-theme)]",
                  !endDate && "text-muted-foreground/50"
                )}
              >
                {endDate ? (
                  format(parseISO(endDate), 'dd/MM/yyyy')
                ) : (
                  <span>Pilih Tanggal Akhir</span>
                )}
                <Calendar className="h-4 w-4 ml-auto text-muted-foreground/40" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate ? parseISO(endDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear()
                      const mm = String(date.getMonth() + 1).padStart(2, '0')
                      const dd = String(date.getDate()).padStart(2, '0')
                      setEndDate(`${yyyy}-${mm}-${dd}`)
                    } else {
                      setEndDate('')
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

      </section>

      {/* ── Audit Log Table ─────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl bg-card/75 ring-1 ring-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/45 bg-muted/15 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Riwayat Aktivitas</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Klik baris untuk melihat rincian perubahan.</p>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            {meta?.total ?? auditLogs.length} catatan
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border/45 bg-muted/25">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="w-[110px] text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5 pl-5">Aksi</TableHead>
                <TableHead className="w-[180px] text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5">Operator (User)</TableHead>
                <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5">Keterangan Aktivitas</TableHead>
                <TableHead className="w-[130px] text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5">IP Address</TableHead>
                <TableHead className="w-[190px] text-muted-foreground text-[10px] font-bold uppercase tracking-wider py-3.5 pr-5">Tanggal &amp; Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-36 text-center">
                    <div className="flex items-center justify-center gap-2.5 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--primary-theme)]" />
                      <span className="text-xs font-bold">Memuat log aktivitas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : auditLogs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-36 text-center text-muted-foreground text-xs font-bold">
                    Tidak ditemukan audit log yang cocok dengan filter pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer border-border/35 odd:bg-background/10 transition-colors hover:bg-[color-mix(in_srgb,var(--primary-theme)_6%,transparent)] hover:shadow-[inset_2px_0_0_0_var(--primary-theme)]"
                  >
                    <TableCell className="pl-5 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase shadow-none',
                          getActionBadgeColor(log.action),
                        )}
                      >
                        {getActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground/90 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary-theme)_10%,transparent)] text-[9px] font-bold text-[var(--primary-theme)] ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_22%,transparent)]">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <span className="truncate max-w-[130px]" title={log.user_name || 'System Auto'}>
                          {log.user_name || 'System Auto'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md py-3 pr-4 text-xs font-medium leading-relaxed text-foreground/80">
                      {log.description}
                    </TableCell>
                    <TableCell className="py-3">
                      {log.ip_address ? (
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground/45 shrink-0" />
                          <span className="text-[11px] font-mono text-muted-foreground/80 tracking-tight">{log.ip_address}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/80 pr-5 py-3 font-semibold">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Pagination ──────────────────────────────────────── */}
      {meta && meta.last_page > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider pl-1">
            Menampilkan {auditLogs.length} dari {meta.total} baris log.
          </p>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 rounded-lg border-border/60 bg-card/60 px-3 text-xs text-foreground/80 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              Sebelumnya
            </Button>
            <span className="text-xs font-bold text-muted-foreground px-2">
              Halaman {meta.current_page} dari {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              className="h-8 rounded-lg border-border/60 bg-card/60 px-3 text-xs text-foreground/80 hover:bg-muted"
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'reminder-jobs' && <ReminderCronJobsPanel />}
      {activeTab === 'survey-reminders' && <SurveyReminderPanel />}

      {/* ── Detail Dialog ────────────────────────────────────── */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="overflow-hidden rounded-xl border-border/60 bg-card p-0 text-foreground shadow-2xl sm:max-w-2xl">
          {selectedLog && (
            <div className="max-h-[85vh] overflow-y-auto p-5 space-y-5">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                   <DialogTitle className="text-base font-bold text-foreground">
                    Detail Audit Log
                  </DialogTitle>
                  <Badge variant="outline" className={cn('text-[9px] rounded-md font-extrabold uppercase tracking-wider px-2 py-0.5 border shadow-sm', getActionBadgeColor(selectedLog.action))}>
                     {getActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-1">
                  Informasi rinci mengenai aktivitas yang dicatat oleh sistem keamanan.
                </DialogDescription>
              </DialogHeader>

              <div className="grid overflow-hidden rounded-lg bg-border/45 text-xs ring-1 ring-border/55 sm:grid-cols-2">
                <div className="bg-background/45 p-3.5 sm:border-r sm:border-border/45">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <User className="h-3 w-3" />
                    <span>Operator (User)</span>
                  </div>
                  <p className="text-foreground/90 font-black mt-1.5">{selectedLog.user_name || 'System Auto'}</p>
                </div>
                <div className="border-t border-border/45 bg-background/45 p-3.5 sm:border-t-0">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <Globe className="h-3 w-3" />
                    <span>IP Address</span>
                  </div>
                  <p className="text-foreground/90 font-black mt-1.5 font-mono">{selectedLog.ip_address || '—'}</p>
                </div>
                <div className="border-t border-border/45 bg-background/45 p-3.5 sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <Calendar className="h-3 w-3" />
                    <span>Tanggal &amp; Waktu</span>
                  </div>
                  <p className="text-foreground/90 font-bold mt-1.5">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </p>
                </div>
                <div className="border-t border-border/45 bg-background/45 p-3.5 sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <FileText className="h-3 w-3" />
                    <span>Deskripsi Aktivitas</span>
                  </div>
                  <p className="text-foreground/80 font-bold mt-1.5 leading-relaxed">{selectedLog.description}</p>
                </div>
                {selectedLog.user_agent && (
                  <div className="border-t border-border/45 bg-background/45 p-3.5 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                      <Cpu className="h-3 w-3" />
                      <span>User Agent (Browser &amp; OS)</span>
                    </div>
                    <p className="text-muted-foreground mt-1.5 break-all leading-relaxed font-mono text-[10px]">{selectedLog.user_agent}</p>
                  </div>
                )}
              </div>

              {selectedLog.action !== 'retrieved' && (
                <div className="space-y-4 pt-3.5 border-t border-border/50 dark:border-zinc-900/50">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-[var(--primary-theme)]" />
                    Rincian Perubahan Data
                  </h4>

                  {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider pl-1">Data Sebelum Perubahan</p>
                      <pre className="max-h-48 overflow-x-auto rounded-lg bg-background/55 p-4 font-mono text-[10px] leading-relaxed text-foreground/70 ring-1 ring-border/50">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider pl-1">Data Sesudah Perubahan</p>
                      <pre className="max-h-48 overflow-x-auto rounded-lg bg-background/55 p-4 font-mono text-[10px] leading-relaxed text-foreground/80 ring-1 ring-border/50">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.action === 'updated' && selectedLog.old_values && selectedLog.new_values && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider pl-1">Perbandingan Perubahan (Diff)</p>
                      <div className="max-h-48 space-y-2 overflow-x-auto rounded-lg bg-background/55 p-4 font-mono text-[10px] text-foreground/80 ring-1 ring-border/50">
                        {Object.entries(selectedLog.new_values).map(([key, newValue]) => {
                          const oldValue = selectedLog.old_values?.[key]
                          if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return null
                          return (
                            <div key={key} className="break-words py-1.5 border-b border-border/30 last:border-0 dark:border-zinc-900/30 flex flex-wrap items-center gap-1.5 leading-relaxed">
                              <span className="mr-1 font-bold text-[var(--primary-theme)]">{key}</span>:
                              <span className="text-red-500 dark:text-red-400 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10 line-through tracking-tight">{oldValue === null ? 'null' : String(oldValue)}</span>
                              <ArrowRightLeft className="h-3 w-3 text-muted-foreground/40 mx-1" />
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-bold tracking-tight">{newValue === null ? 'null' : String(newValue)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3.5 border-t border-border/50 dark:border-zinc-900/50">
                <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)} className="rounded-lg text-xs text-muted-foreground hover:bg-muted">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReminderCronJobsPanel() {
  const confirm = useConfirm()
  const { data: response, isLoading, isError, refetch } = useReminderCronJobsList()
  const jobs = response?.data ?? []
  const createJob = useCreateReminderCronJob()
  const toggleJob = useToggleReminderCronJob()
  const deleteJob = useDeleteReminderCronJob()

  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null)
  const [editingJob, setEditingJob] = useState<ReminderCronJob | null>(null)
  const [name, setName] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('13:00')
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(true)
  const updateJob = useUpdateReminderCronJob(editingJob?.id ?? 0)
  const isSaving = createJob.isPending || updateJob.isPending

  const openCreate = () => {
    setEditingJob(null)
    setName('Pengingat Absensi Admin')
    setTimeOfDay('13:00')
    setMessage('')
    setIsActive(true)
    setModalType('create')
  }

  const openEdit = (job: ReminderCronJob) => {
    setEditingJob(job)
    setName(job.name)
    setTimeOfDay(job.time_of_day.slice(0, 5))
    setMessage(job.message ?? '')
    setIsActive(job.is_active)
    setModalType('edit')
  }

  const closeModal = () => {
    if (isSaving) return
    setModalType(null)
    setEditingJob(null)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!name.trim() || !timeOfDay) {
      toast.error('Nama dan jam pengiriman wajib diisi.')
      return
    }

    const payload = {
      name: name.trim(),
      time_of_day: timeOfDay,
      message: message.trim() || null,
      is_active: isActive,
    }
    const mutation = modalType === 'edit' ? updateJob : createJob

    mutation.mutate(payload, {
      onSuccess: (result) => {
        toast.success(result.message)
        setModalType(null)
        setEditingJob(null)
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Cron job pengingat gagal disimpan.')),
    })
  }

  const handleToggle = (job: ReminderCronJob) => {
    toggleJob.mutate(job.id, {
      onSuccess: (result) => toast.success(result.message),
      onError: (error) => toast.error(getErrorMessage(error, 'Status cron job gagal diubah.')),
    })
  }

  const handleDelete = async (job: ReminderCronJob) => {
    const confirmed = await confirm({
      title: 'Hapus Cron Job?',
      description: `Cron job "${job.name}" akan dihapus permanen.`,
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })
    if (!confirmed) return

    deleteJob.mutate(job.id, {
      onSuccess: (result) => toast.success(result.message),
      onError: (error) => toast.error(getErrorMessage(error, 'Cron job pengingat gagal dihapus.')),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Cron Job Pengingat Absensi</h2>
          <p className="mt-1 text-xs text-muted-foreground">Atur waktu dan pesan pengingat harian untuk admin yang belum melakukan absensi.</p>
        </div>
        <Button onClick={openCreate} className="h-9 self-start bg-[var(--primary-theme)] px-3 text-white hover:brightness-110 sm:self-auto">
          <Plus className="size-4" />
          Cron Job Baru
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl bg-card/75 ring-1 ring-border/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border/45 bg-muted/25">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="min-w-[180px] py-3.5 pl-5 text-[10px] font-bold uppercase text-muted-foreground">Nama</TableHead>
                <TableHead className="w-[110px] py-3.5 text-[10px] font-bold uppercase text-muted-foreground">Jam (WIB)</TableHead>
                <TableHead className="min-w-[240px] py-3.5 text-[10px] font-bold uppercase text-muted-foreground">Pesan</TableHead>
                <TableHead className="w-[110px] py-3.5 text-[10px] font-bold uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="w-[160px] py-3.5 text-[10px] font-bold uppercase text-muted-foreground">Terakhir Terkirim</TableHead>
                <TableHead className="w-[110px] py-3.5 pr-5 text-right text-[10px] font-bold uppercase text-muted-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-[var(--primary-theme)]" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Data cron job gagal dimuat.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                      <RefreshCw className="size-3.5" /> Muat Ulang
                    </Button>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs font-medium text-muted-foreground">
                    Belum ada cron job pengingat.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => {
                  const isToggling = toggleJob.isPending && toggleJob.variables === job.id
                  const isDeleting = deleteJob.isPending && deleteJob.variables === job.id

                  return (
                    <TableRow key={job.id} className="border-border/35 odd:bg-background/10">
                      <TableCell className="py-3 pl-5 text-xs font-semibold text-foreground">{job.name}</TableCell>
                      <TableCell className="py-3 text-xs font-semibold tabular-nums text-foreground/80">{job.time_of_day.slice(0, 5)}</TableCell>
                      <TableCell className="max-w-sm py-3 text-xs text-muted-foreground">
                        <span className="line-clamp-2" title={job.message ?? 'Pesan default'}>
                          {job.message || '(pesan default)'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={job.is_active}
                            disabled={isToggling}
                            onCheckedChange={() => handleToggle(job)}
                            aria-label={`${job.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${job.name}`}
                          />
                          <span className="text-[11px] font-medium text-muted-foreground">{job.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {job.last_sent_date ? formatReminderSentDate(job.last_sent_date) : 'Belum pernah'}
                      </TableCell>
                      <TableCell className="py-3 pr-5">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(job)} title="Edit cron job">
                            <Edit2 className="size-3.5" />
                            <span className="sr-only">Edit {job.name}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={isDeleting}
                            onClick={() => handleDelete(job)}
                            title="Hapus cron job"
                            className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                          >
                            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                            <span className="sr-only">Hapus {job.name}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <p className="border-t border-border/45 px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
          Notifikasi hanya terkirim ke admin yang belum absen hari ini dan sudah mengaktifkan lonceng notifikasi.
        </p>
      </section>

      <Dialog open={modalType !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="w-[calc(100%-1rem)] rounded-xl border-border/60 bg-card text-foreground sm:max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{modalType === 'edit' ? 'Edit Cron Job Pengingat' : 'Cron Job Pengingat Baru'}</DialogTitle>
              <DialogDescription>Jadwal menggunakan zona waktu Asia/Jakarta (WIB).</DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="reminder-job-name" className="text-xs font-semibold text-muted-foreground">Nama</Label>
              <Input
                id="reminder-job-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                placeholder="Pengingat Absensi Admin"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Jam Pengiriman</Label>
              <TimeSearchSelect
                value={timeOfDay}
                onChange={setTimeOfDay}
                options={SURVEY_TIME_OPTIONS}
                placeholder="Pilih jam pengiriman"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reminder-job-message" className="text-xs font-semibold text-muted-foreground">Pesan</Label>
              <Textarea
                id="reminder-job-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={2000}
                placeholder="Jangan lupa lakukan absensi hari ini, {tanggal}."
                className="min-h-24 resize-y"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Gunakan <code className="rounded bg-muted px-1 py-0.5">{'{tanggal}'}</code> untuk menyisipkan tanggal hari ini otomatis. Kosongkan untuk pesan default.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <div>
                <Label htmlFor="reminder-job-active" className="text-xs font-semibold text-foreground">Aktifkan jadwal</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Job aktif diperiksa scheduler setiap menit.</p>
              </div>
              <Switch id="reminder-job-active" checked={isActive} onCheckedChange={setIsActive} aria-label="Aktifkan jadwal" />
            </div>

            <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
              <Button type="button" variant="ghost" onClick={closeModal} disabled={isSaving}>Batal</Button>
              <Button type="submit" disabled={isSaving || !name.trim() || !timeOfDay} className="bg-[var(--primary-theme)] text-white hover:brightness-110">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                {modalType === 'edit' ? 'Simpan Perubahan' : 'Buat Cron Job'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const LEAD_MINUTES_PRESETS = [
  { value: 60, label: '1 jam' },
  { value: 180, label: '3 jam' },
  { value: 300, label: '5 jam' },
  { value: 1440, label: '1 hari' },
  { value: 'custom', label: 'Kustom' },
] as const

const DELIVERY_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Menunggu', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
  processing: { label: 'Diproses', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  notified: { label: 'Terkirim', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  expired: { label: 'Kedaluwarsa', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  failed: { label: 'Gagal', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-300' },
}

function SurveyReminderPanel() {
  const { data: settingResponse, isLoading } = useSurveyReminderSetting()
  const setting = settingResponse?.data
  const updateSetting = useUpdateSurveyReminderSetting()
  const previewMutation = usePreviewSurveyReminderSetting()
  const { data: historyResponse, isLoading: isHistoryLoading } = useSurveyReminderDeliveries({ page: 1 })
  const deliveries = historyResponse?.data ?? []

  const [enabled, setEnabled] = useState(false)
  const [leadMinutes, setLeadMinutes] = useState(300)
  const [customMinutes, setCustomMinutes] = useState('300')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!setting || hydrated) return
    setEnabled(setting.enabled)
    setLeadMinutes(setting.lead_minutes)
    setCustomMinutes(String(setting.lead_minutes))
    setMessageTemplate(setting.message_template ?? '')
    setHydrated(true)
  }, [setting, hydrated])

  const isPreset = LEAD_MINUTES_PRESETS.some((p) => p.value === leadMinutes)
  const selectValue = isPreset ? String(leadMinutes) : 'custom'

  const handlePreview = () => {
    previewMutation.mutate({ enabled: true, lead_minutes: leadMinutes })
  }

  const handleSave = () => {
    if (leadMinutes < 1 || leadMinutes > 10080) {
      toast.error('Waktu pengingat harus antara 1 menit dan 7 hari (10080 menit).')
      return
    }
    updateSetting.mutate(
      { enabled, lead_minutes: leadMinutes, message_template: messageTemplate.trim() || null },
      {
        onSuccess: (result) => toast.success(result.message),
        onError: (error) => toast.error(getErrorMessage(error, 'Pengaturan pengingat survey gagal disimpan.')),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-card/75 p-5 ring-1 ring-border/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pengingat Survey Otomatis</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ingatkan surveyor lewat notifikasi aplikasi &amp; push sebelum jadwal survey final mereka.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor="survey-reminder-enabled" className="text-xs font-semibold text-muted-foreground">
              {enabled ? 'Aktif' : 'Nonaktif'}
            </Label>
            <Switch id="survey-reminder-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Ingatkan sebelum jadwal</Label>
            <Select
              value={selectValue}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setLeadMinutes(Number(customMinutes) || 1)
                } else {
                  setLeadMinutes(Number(value))
                }
              }}
            >
              <SelectTrigger className="h-10 rounded-lg text-sm">
                <SelectValue>{LEAD_MINUTES_PRESETS.find((p) => String(p.value) === selectValue)?.label ?? 'Kustom'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LEAD_MINUTES_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={String(preset.value)}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectValue === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={1}
                  max={10080}
                  value={customMinutes}
                  onChange={(event) => {
                    setCustomMinutes(event.target.value)
                    setLeadMinutes(Math.min(10080, Math.max(1, Number(event.target.value) || 1)))
                  }}
                  className="h-9 w-28 rounded-lg text-sm"
                />
                <span className="text-xs text-muted-foreground">menit sebelum jadwal</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Template pesan (opsional)</Label>
            <Textarea
              value={messageTemplate}
              onChange={(event) => setMessageTemplate(event.target.value)}
              placeholder="Survey konsumen {nama_konsumen} dijadwalkan {tanggal} pukul {jam}."
              className="min-h-[72px] rounded-lg text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Placeholder: {'{nama_konsumen}'}, {'{tanggal}'}, {'{jam}'}.</p>
          </div>
        </div>

        {previewMutation.data && (
          <div className="mt-4 rounded-lg border border-[var(--primary-theme)]/25 bg-[var(--primary-theme)]/5 p-3 text-xs">
            <p className="font-semibold text-foreground">
              {previewMutation.data.data.affected_count} survey terjadwal akan mendapat pengingat dengan pengaturan ini.
            </p>
            {previewMutation.data.data.sample.length > 0 && (
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {previewMutation.data.data.sample.slice(0, 5).map((item) => (
                  <li key={item.survey_id}>
                    {item.client_name} ({item.surveyor_name ?? 'belum ditugaskan'}) — pengingat {format(parseISO(item.due_at), 'd MMM HH:mm')} WIB
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={previewMutation.isPending}
            className="h-9 rounded-lg px-3 text-sm"
          >
            {previewMutation.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Eye className="mr-1.5 size-4" />}
            Preview dampak
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateSetting.isPending}
            className="h-9 rounded-lg bg-[var(--primary-theme)] px-4 text-sm text-white hover:brightness-110"
          >
            {updateSetting.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Simpan Pengaturan
          </Button>
          {setting?.updated_by && (
            <span className="text-[11px] text-muted-foreground">
              Terakhir diubah oleh {setting.updated_by}
              {setting.updated_at ? `, ${format(parseISO(setting.updated_at), 'd MMM yyyy HH:mm')}` : ''}
            </span>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-card/75 ring-1 ring-border/60">
        <div className="border-b border-border/45 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">Riwayat Pengingat</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border/45 bg-muted/25">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="py-3 pl-5 text-[10px] font-bold uppercase text-muted-foreground">Konsumen</TableHead>
                <TableHead className="py-3 text-[10px] font-bold uppercase text-muted-foreground">Surveyor</TableHead>
                <TableHead className="py-3 text-[10px] font-bold uppercase text-muted-foreground">Jatuh Tempo</TableHead>
                <TableHead className="py-3 text-[10px] font-bold uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="py-3 pr-5 text-[10px] font-bold uppercase text-muted-foreground">Push</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isHistoryLoading ? (
                <TableRow><TableCell colSpan={5} className="h-28 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : deliveries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">Belum ada riwayat pengingat.</TableCell></TableRow>
              ) : (
                deliveries.map((delivery: SurveyReminderDeliveryItem) => {
                  const statusMeta = DELIVERY_STATUS_LABELS[delivery.status] ?? { label: delivery.status, className: 'bg-muted text-muted-foreground' }
                  return (
                    <TableRow key={delivery.id} className="border-border/30">
                      <TableCell className="py-3 pl-5 text-sm text-foreground">{delivery.client_name}</TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">{delivery.recipient_name ?? '-'}</TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {delivery.due_at ? format(parseISO(delivery.due_at), 'd MMM HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={cn('rounded-md border-0 text-[11px] font-semibold', statusMeta.className)}>{statusMeta.label}</Badge>
                      </TableCell>
                      <TableCell className="py-3 pr-5 text-xs text-muted-foreground">{delivery.push_status}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function formatReminderSentDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
