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
  Activity, ArrowRightLeft, Cpu, FileText, User, UserCheck
} from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/authStore'
import { useClearLogs } from '@/lib/hooks/useDebug'
import { toast } from 'sonner'
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
        error: (err: any) => err?.response?.data?.message || 'Gagal membersihkan log sistem.',
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

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created':   return 'border-emerald-500/20 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-950/20'
      case 'updated':   return 'border-amber-500/20 text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-950/20'
      case 'deleted':   return 'border-red-500/20 text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-950/20'
      case 'retrieved':
      default:          return 'border-blue-500/20 text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-950/20'
    }
  }

  return (
    <div className="space-y-6 py-4 sm:py-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-amber-500 shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
            Audit Log Aktivitas
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Pantau seluruh aktivitas transaksi, login, penambahan data, dan perubahan log keamanan sistem.
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearLogs}
            disabled={clearLogsMutation.isPending}
            className="font-bold rounded-xl h-9 px-4 border border-red-500/30 bg-red-500/90 text-white shadow-lg shadow-red-500/15 hover:bg-red-600 hover:shadow-red-600/20 transition-all duration-300 self-start sm:self-auto cursor-pointer"
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
      <div className="glass-panel border border-border/50 shadow-md rounded-2xl dark:border-zinc-900/60 dark:shadow-none overflow-hidden">
        {/* Header strip */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 dark:border-zinc-900/50 bg-muted/20 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            {/* Pulsing indicator */}
            <div className="relative flex items-center justify-center h-4 w-4 shrink-0">
              <span className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-60',
                onlineCount > 0 ? 'bg-emerald-500 animate-ping' : 'bg-zinc-500',
              )} />
              <span className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                onlineCount > 0 ? 'bg-emerald-500' : 'bg-zinc-500',
              )} />
            </div>
            <span className="text-xs font-bold text-foreground/80 tracking-tight">User Online Sekarang</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-black px-2.5 py-0 h-5 rounded-full border shadow-sm',
                onlineCount > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted border-border text-muted-foreground',
              )}
            >
              {onlineCount} online
            </Badge>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-semibold">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span>{lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="opacity-50">· auto 30s</span>
            </div>
          )}
        </div>

        {/* User cards */}
        <div className="px-5 py-4">
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
                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-border/80 bg-background/40 hover:border-amber-500/30 hover:bg-amber-500/5 hover:scale-[1.01] transition-all duration-300 dark:border-zinc-900/80 dark:bg-zinc-950/20"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black border shadow-sm',
                        isSA
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
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
                          isSA ? 'text-amber-600 dark:text-amber-500' : 'text-blue-600 dark:text-blue-400',
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
      </div>

      {/* ── Filters Card ────────────────────────────────────── */}
      <div className="bg-card p-5 border border-border shadow-md rounded-2xl dark:bg-zinc-900 dark:border-zinc-800/60">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-5">
          {/* Search */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pl-1">Cari Aktivitas</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input
                placeholder="Cari deskripsi log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-border bg-background/60 placeholder:text-muted-foreground/30 focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 text-xs text-foreground rounded-xl dark:border-zinc-900 dark:bg-zinc-950/60 dark:text-zinc-300"
              />
            </div>
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider pl-1">Jenis Aksi</Label>
            <Select value={actionFilter || 'all'} onValueChange={(v) => setActionFilter(v === 'all' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-xs text-foreground dark:border-zinc-900 dark:bg-zinc-950/60">
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
              <SelectTrigger className="h-10 rounded-xl border-border bg-background/60 text-xs text-foreground dark:border-zinc-900 dark:bg-zinc-950/60">
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
                  "w-full h-10 justify-between text-left font-normal border border-border bg-background/60 hover:bg-background/80 dark:border-zinc-900 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/60 text-foreground/80 rounded-xl px-3.5 text-xs focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden flex items-center",
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
                  "w-full h-10 justify-between text-left font-normal border border-border bg-background/60 hover:bg-background/80 dark:border-zinc-900 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/60 text-foreground/80 rounded-xl px-3.5 text-xs focus:ring-1 focus:ring-amber-500/50 focus:outline-hidden flex items-center",
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

        <div className="flex justify-end gap-2 mt-4 pt-3.5 border-t border-border/50 dark:border-zinc-900/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setActionFilter('')
              setUserIdFilter('')
              setStartDate('')
              setEndDate('')
              setPage(1)
            }}
            className="text-xs text-muted-foreground hover:text-foreground border border-border bg-background/40 hover:bg-muted/80 rounded-xl px-4 transition-all duration-300 h-9 cursor-pointer dark:border-zinc-900 dark:hover:bg-zinc-900/40"
          >
            Reset Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border border-border bg-background/40 hover:bg-muted/80 rounded-xl px-3 transition-all duration-300 h-9 cursor-pointer dark:border-zinc-900 dark:hover:bg-zinc-900/40"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', isRefetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ── Audit Log Table ─────────────────────────────────── */}
      <div className="glass-panel border border-border/50 shadow-md rounded-2xl overflow-hidden dark:border-zinc-900/60">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20 border-b border-border/50 dark:bg-zinc-950/40 dark:border-zinc-900/50">
              <TableRow className="border-border hover:bg-transparent dark:border-zinc-900">
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
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
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
                    className="border-border/40 hover:bg-muted/30 hover:shadow-[inset_3px_0_0_0_var(--primary-theme)] dark:hover:shadow-[inset_3px_0_0_0_var(--primary-theme)] cursor-pointer transition-all duration-200 dark:border-zinc-900/40 dark:hover:bg-zinc-800/10"
                  >
                    <TableCell className="pl-5 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] rounded-md font-extrabold uppercase tracking-wider px-2 py-0.5 border shadow-sm',
                          getActionBadgeColor(log.action),
                        )}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground/90 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-5.5 w-5.5 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-[9px] font-black border border-amber-500/25 shrink-0 dark:text-amber-500">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <span className="truncate max-w-[130px]" title={log.user_name || 'System Auto'}>
                          {log.user_name || 'System Auto'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/75 leading-relaxed max-w-md pr-4 py-3 font-medium">
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
      </div>

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
              className="border-border bg-background/50 hover:bg-muted text-foreground/80 rounded-xl px-3 transition-all duration-300 h-8 text-xs cursor-pointer dark:border-zinc-900 dark:bg-zinc-950 dark:hover:bg-zinc-900"
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
              className="border-border bg-background/50 hover:bg-muted text-foreground/80 rounded-xl px-3 transition-all duration-300 h-8 text-xs cursor-pointer dark:border-zinc-900 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Dialog ────────────────────────────────────── */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden dark:border-zinc-900 dark:bg-zinc-950/95 dark:backdrop-blur-xl">
          {selectedLog && (
            <div className="max-h-[85vh] overflow-y-auto p-5 space-y-5">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-foreground text-base font-black tracking-tight">
                    Detail Audit Log
                  </DialogTitle>
                  <Badge variant="outline" className={cn('text-[9px] rounded-md font-extrabold uppercase tracking-wider px-2 py-0.5 border shadow-sm', getActionBadgeColor(selectedLog.action))}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-1">
                  Informasi rinci mengenai aktivitas yang dicatat oleh sistem keamanan.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
                <div className="border border-border/50 bg-muted/10 p-3 rounded-xl dark:border-zinc-900 dark:bg-zinc-950/30">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <User className="h-3 w-3" />
                    <span>Operator (User)</span>
                  </div>
                  <p className="text-foreground/90 font-black mt-1.5">{selectedLog.user_name || 'System Auto'}</p>
                </div>
                <div className="border border-border/50 bg-muted/10 p-3 rounded-xl dark:border-zinc-900 dark:bg-zinc-950/30">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <Globe className="h-3 w-3" />
                    <span>IP Address</span>
                  </div>
                  <p className="text-foreground/90 font-black mt-1.5 font-mono">{selectedLog.ip_address || '—'}</p>
                </div>
                <div className="border border-border/50 bg-muted/10 p-3 rounded-xl sm:col-span-2 dark:border-zinc-900 dark:bg-zinc-950/30">
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
                <div className="border border-border/50 bg-muted/10 p-3 rounded-xl sm:col-span-2 dark:border-zinc-900 dark:bg-zinc-950/30">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                    <FileText className="h-3 w-3" />
                    <span>Deskripsi Aktivitas</span>
                  </div>
                  <p className="text-foreground/80 font-bold mt-1.5 leading-relaxed">{selectedLog.description}</p>
                </div>
                {selectedLog.user_agent && (
                  <div className="border border-border/50 bg-muted/10 p-3 rounded-xl sm:col-span-2 dark:border-zinc-900 dark:bg-zinc-950/30">
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
                    <Activity className="h-3.5 w-3.5 text-amber-500" />
                    Rincian Perubahan Data
                  </h4>

                  {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider pl-1">Data Sebelum Perubahan</p>
                      <pre className="bg-muted/30 p-4 rounded-xl text-[10px] text-foreground/70 overflow-x-auto max-h-48 leading-relaxed font-mono border border-border/40 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-900/60">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider pl-1">Data Sesudah Perubahan</p>
                      <pre className="bg-muted/30 p-4 rounded-xl text-[10px] text-foreground/80 overflow-x-auto max-h-48 leading-relaxed font-mono border border-border/40 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-900/60">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.action === 'updated' && selectedLog.old_values && selectedLog.new_values && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider pl-1">Perbandingan Perubahan (Diff)</p>
                      <div className="bg-muted/30 p-4 rounded-xl text-[10px] text-foreground/80 overflow-x-auto max-h-48 font-mono space-y-2 border border-border/40 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-900/60">
                        {Object.entries(selectedLog.new_values).map(([key, newValue]) => {
                          const oldValue = selectedLog.old_values?.[key]
                          if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return null
                          return (
                            <div key={key} className="break-words py-1.5 border-b border-border/30 last:border-0 dark:border-zinc-900/30 flex flex-wrap items-center gap-1.5 leading-relaxed">
                              <span className="font-bold text-amber-600 dark:text-amber-500 mr-1">{key}</span>:
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
                <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)} className="text-xs text-muted-foreground hover:bg-muted dark:hover:bg-zinc-900 rounded-xl cursor-pointer">
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
