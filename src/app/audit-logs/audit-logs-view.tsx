'use client'

import { useState, useEffect } from 'react'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import { useUsersList } from '@/lib/hooks/useMasterData'
import { useOnlineUsers } from '@/lib/hooks/useOnlineUsers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  Activity, ArrowRightLeft, Cpu, FileText, User, SlidersHorizontal
} from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/authStore'
import { useClearLogs } from '@/lib/hooks/useDebug'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/errors'
import { useConfirm } from '@/components/ui/confirm-dialog'

export default function AuditLogsPage() {
  const confirm = useConfirm()
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
        {isSuperAdmin && (
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
