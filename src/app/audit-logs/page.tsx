'use client'

import { useState, useEffect } from 'react'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import { useUsersList } from '@/lib/hooks/useMasterData'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/stores/authStore'
import { useClearLogs } from '@/lib/hooks/useDebug'
import { toast } from 'sonner'

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [actionFilter, setActionFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  // Reset to first page when search filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, actionFilter, userIdFilter, startDate, endDate])

  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'
  const clearLogsMutation = useClearLogs()

  const handleClearLogs = () => {
    if (!confirm('Apakah Anda yakin ingin membersihkan seluruh log sistem (log file Laravel & audit log database)? Tindakan ini permanen.')) {
      return
    }

    toast.promise(
      new Promise((resolve, reject) => {
        clearLogsMutation.mutate(undefined, {
          onSuccess: (data) => {
            refetch()
            resolve(data)
          },
          onError: (err) => reject(err)
        })
      }),
      {
        loading: 'Membersihkan log sistem...',
        success: (data: any) => data.message || 'Log sistem berhasil dibersihkan!',
        error: (err: any) => err?.response?.data?.message || 'Gagal membersihkan log sistem.'
      }
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
      case 'created':
        return 'border-green-500/20 text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/20'
      case 'updated':
        return 'border-amber-500/20 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20'
      case 'deleted':
        return 'border-red-500/20 text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20'
      case 'retrieved':
      default:
        return 'border-blue-500/20 text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-amber-200 dark:via-amber-400 dark:to-amber-100 dark:bg-clip-text dark:text-transparent flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-amber-500 shrink-0" />
            Audit Log Aktivitas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pantau seluruh aktivitas transaksi, login, penambahan data, dan perubahan log keamanan sistem.
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearLogs}
            disabled={clearLogsMutation.isPending}
            className="font-bold rounded-xl h-9 shadow-sm border border-red-500/20 bg-red-500 hover:bg-red-650 transition-all duration-300 self-start sm:self-auto"
          >
            {clearLogsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Membersihkan...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Bersihkan Log Sistem
              </>
            )}
          </Button>
        )}
      </div>

      {/* Filters Card */}
      <div className="glass-panel p-5 border border-border/60 shadow-lg rounded-2xl dark:border-zinc-800/60 dark:shadow-black/25">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Cari deskripsi log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 border-border/80 bg-background/60 placeholder:text-muted-foreground/40 focus-visible:ring-amber-500/30 text-xs text-foreground rounded-lg dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-300 dark:placeholder:text-zinc-600"
            />
          </div>

          {/* Action Select */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full h-8 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-200"
            >
              <option value="">Semua Aksi</option>
              <option value="created">Created (Penambahan)</option>
              <option value="updated">Updated (Perubahan)</option>
              <option value="deleted">Deleted (Penghapusan)</option>
              <option value="retrieved">Retrieved (Pencarian)</option>
            </select>
          </div>

          {/* Operator/User select */}
          <div>
            <select
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="w-full h-8 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-200"
            >
              <option value="">Semua User</option>
              {usersList.map((usr) => (
                <option key={usr.id} value={usr.id}>
                  {usr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-9 h-8 border-border/80 bg-background/60 text-xs text-foreground focus-visible:ring-amber-500/30 rounded-lg dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-300"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pl-9 h-8 border-border/80 bg-background/60 text-xs text-foreground focus-visible:ring-amber-500/30 rounded-lg dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:text-zinc-300"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/60 dark:border-zinc-800/60">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setSearchTerm('')
              setActionFilter('')
              setUserIdFilter('')
              setStartDate('')
              setEndDate('')
              setPage(1)
            }}
            className="text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted/60 rounded-lg dark:border-zinc-800 dark:hover:bg-zinc-800/40"
          >
            Reset Filter
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => refetch()}
            className="border border-border hover:bg-muted/60 rounded-lg dark:border-zinc-800 dark:hover:bg-zinc-800/40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel border border-border/60 shadow-xl rounded-2xl overflow-hidden dark:border-zinc-800/60 dark:shadow-black/30">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border/60 dark:bg-zinc-950/40 dark:border-zinc-800/60">
              <TableRow className="border-border hover:bg-transparent dark:border-zinc-800">
                <TableHead className="w-[120px] text-muted-foreground text-xs font-bold py-3.5 pl-5">Aksi</TableHead>
                <TableHead className="w-[180px] text-muted-foreground text-xs font-bold py-3.5">Operator (User)</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold py-3.5">Keterangan Aktivitas</TableHead>
                <TableHead className="w-[180px] text-muted-foreground text-xs font-bold py-3.5 pr-5">Tanggal & Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-36 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                      <span className="text-xs font-semibold">Memuat log aktivitas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : auditLogs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-36 text-center text-muted-foreground text-xs font-semibold">
                    Tidak ditemukan audit log yang cocok dengan filter pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="border-border/50 hover:bg-muted/30 cursor-pointer transition-all duration-150 dark:border-zinc-800/50 dark:hover:bg-zinc-800/20">
                    <TableCell className="pl-5 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] rounded-lg font-bold uppercase tracking-wider px-2 py-0.5 border",
                          getActionBadgeColor(log.action)
                        )}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground/90">
                      {log.user_name || 'System Auto'}
                    </TableCell>
                    <TableCell className="text-xs text-foreground/70 leading-relaxed max-w-md pr-4 py-3">
                      {log.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground/70 pr-5 py-3">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination controls */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-muted-foreground/70">
            Menampilkan {auditLogs.length} dari {meta.total} baris log.
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Sebelumnya
            </Button>
            <span className="text-xs font-semibold text-muted-foreground px-2">
              Halaman {meta.current_page} dari {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="xs"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              className="border-border bg-card hover:bg-muted text-foreground/80 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400"
            >
              Selanjutnya
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="border-border bg-card text-foreground max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl dark:border-zinc-800/85 dark:bg-zinc-950/95 dark:backdrop-blur-xl">
          {selectedLog && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <span>Detail Audit Log</span>
                  <Badge variant="outline" className={cn("text-[10px] rounded-lg font-bold uppercase tracking-wider px-2 py-0.5", getActionBadgeColor(selectedLog.action))}>
                    {selectedLog.action}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Informasi rinci mengenai aktivitas yang dicatat oleh sistem.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="border border-border/60 bg-muted/20 p-3 rounded-xl dark:border-zinc-800/60 dark:bg-zinc-950/20">
                  <p className="font-semibold text-muted-foreground/70 uppercase text-[9px]">Operator (User)</p>
                  <p className="text-foreground/90 font-bold mt-1">{selectedLog.user_name || 'System Auto'}</p>
                </div>
                <div className="border border-border/60 bg-muted/20 p-3 rounded-xl dark:border-zinc-800/60 dark:bg-zinc-950/20">
                  <p className="font-semibold text-muted-foreground/70 uppercase text-[9px]">IP Address</p>
                  <p className="text-foreground/90 font-bold mt-1">{selectedLog.ip_address || '-'}</p>
                </div>
                <div className="border border-border/60 bg-muted/20 p-3 rounded-xl sm:col-span-2 dark:border-zinc-800/60 dark:bg-zinc-950/20">
                  <p className="font-semibold text-muted-foreground/70 uppercase text-[9px]">Tanggal & Waktu</p>
                  <p className="text-foreground/90 font-medium mt-1">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
                <div className="border border-border/60 bg-muted/20 p-3 rounded-xl sm:col-span-2 dark:border-zinc-800/60 dark:bg-zinc-950/20">
                  <p className="font-semibold text-muted-foreground/70 uppercase text-[9px]">Deskripsi Aktivitas</p>
                  <p className="text-foreground/80 font-medium mt-1 leading-relaxed">{selectedLog.description}</p>
                </div>
                {selectedLog.user_agent && (
                  <div className="border border-border/60 bg-muted/20 p-3 rounded-xl sm:col-span-2 dark:border-zinc-800/60 dark:bg-zinc-950/20">
                    <p className="font-semibold text-muted-foreground/70 uppercase text-[9px]">User Agent</p>
                    <p className="text-muted-foreground mt-1 break-all leading-relaxed">{selectedLog.user_agent}</p>
                  </div>
                )}
              </div>

              {selectedLog.action !== 'retrieved' && (
                <div className="space-y-3 pt-2 border-t border-border/60 dark:border-zinc-800/60">
                  <h4 className="text-xs font-bold text-muted-foreground">Rincian Perubahan Data</h4>

                  {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase">Data Lama</p>
                      <pre className="bg-muted/40 p-3 rounded-xl text-[10px] text-foreground/70 overflow-x-auto max-h-40 leading-relaxed font-mono dark:bg-zinc-950 dark:text-zinc-400">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase">Data Baru</p>
                      <pre className="bg-muted/40 p-3 rounded-xl text-[10px] text-foreground/80 overflow-x-auto max-h-40 leading-relaxed font-mono dark:bg-zinc-950 dark:text-zinc-300">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.action === 'updated' && selectedLog.old_values && selectedLog.new_values && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-muted-foreground/70 uppercase">Perbandingan Perubahan (Diff)</p>
                      <div className="bg-muted/40 p-3 rounded-xl text-[10px] text-foreground/80 overflow-x-auto max-h-40 font-mono space-y-1 border border-amber-500/10 dark:bg-zinc-950 dark:text-zinc-300">
                        {Object.entries(selectedLog.new_values).map(([key, newValue]) => {
                          const oldValue = selectedLog.old_values?.[key]
                          const hasChanged = oldValue !== newValue && JSON.stringify(oldValue) !== JSON.stringify(newValue)
                          if (!hasChanged) return null
                          return (
                            <div key={key} className="break-words py-0.5 border-b border-border/40 last:border-0 dark:border-zinc-900/60">
                              <span className="font-bold text-amber-600 dark:text-amber-500">{key}</span>:{" "}
                              <span className="text-red-500 dark:text-red-400 line-through">{oldValue === null ? 'null' : String(oldValue)}</span>
                              <span className="mx-1.5 text-muted-foreground">→</span>
                              <span className="text-green-600 dark:text-green-400 font-semibold">{newValue === null ? 'null' : String(newValue)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-border/60 dark:border-zinc-800/60">
                <Button variant="ghost" size="xs" onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800">
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
