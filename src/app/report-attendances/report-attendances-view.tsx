'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useReportAttendances,
  useSubmitAttendance,
  useUpsertAttendanceBySuperAdmin,
} from '@/lib/hooks/useReportAttendances'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format, parseISO } from 'date-fns'
import {
  Loader2,
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Clock,
  Coffee,
  Check,
  ClipboardX,
  Download,
  Filter,
  Users,
  PhoneOff
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildExportUrl } from '@/lib/api/client'

export default function ReportAttendancesPage() {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  )
  const [selectedStatus, setSelectedStatus] = useState('all')

  const { data: response, isLoading, isRefetching, refetch } = useReportAttendances({
    date: selectedDate,
    status: selectedStatus,
  })

  const submitPresenceMutation = useSubmitAttendance()
  const upsertPresenceMutation = useUpsertAttendanceBySuperAdmin()

  const [moderationOpen, setModerationOpen] = useState(false)
  const [modAdminId, setModAdminId] = useState<number | null>(null)
  const [modCategory, setModCategory] = useState<string>('')

  const statusCounts = response?.status_counts
  const records = response?.data || []

  const currentUserRecord = records.find((rec) => rec.admin_id === user?.id)

  const handleAdminSubmit = (category: 'ada_wa' | 'nol_wa' | 'libur_susulan') => {
    submitPresenceMutation.mutate(
      { report_category: category },
      {
        onSuccess: (res) => {
          toast.success(res.message || 'Laporan absensi berhasil terkirim!')
          refetch()
        },
        onError: (err: any) => {
          toast.error(err.message || 'Gagal mengirim laporan absensi.')
        },
      }
    )
  }

  const handleModerationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!modAdminId) return

    upsertPresenceMutation.mutate(
      {
        user_id: modAdminId,
        report_date: selectedDate,
        report_category: (modCategory === '' ? null : modCategory) as any,
      },
      {
        onSuccess: (res) => {
          toast.success(res.message || 'Absensi admin berhasil dimoderasi!')
          setModerationOpen(false)
          refetch()
        },
        onError: (err: any) => {
          toast.error(err.message || 'Gagal mengubah absensi admin.')
        },
      }
    )
  }

  const openModeration = (adminId: number, currentCat: string | null) => {
    setModAdminId(adminId)
    setModCategory(currentCat || '')
    setModerationOpen(true)
  }

  const getCategoryLabel = (cat: string | null) => {
    switch (cat) {
      case 'ada_wa':
        return 'Ada Chat WA'
      case 'nol_wa':
        return '0 Chat WA'
      case 'libur_susulan':
        return 'Libur / Susulan'
      default:
        return 'Belum Laporan'
    }
  }

  const getCategoryBadgeColor = (cat: string | null) => {
    switch (cat) {
      case 'ada_wa':
        return 'border-green-500/20 text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/20'
      case 'nol_wa':
        return 'border-amber-500/20 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20'
      case 'libur_susulan':
        return 'border-blue-500/20 text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20'
      default:
        return 'border-border text-muted-foreground/70 bg-muted/20 dark:border-zinc-800 dark:text-zinc-500 dark:bg-zinc-950/20'
    }
  }

  return (
    <div className="min-w-0 space-y-5 pb-8 sm:space-y-6">
      <header className="flex flex-col gap-4 pb-1 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--primary-theme)]">Operasional - laporan harian</p>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-foreground">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_10%,var(--card))] text-[var(--primary-theme)]">
              <Clock className="size-[18px]" />
            </span>
            Absensi Report Harian
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Setiap admin wajib melaporkan status chat WhatsApp masuk harian. Super admin memantau rekapan kehadiran.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Popover>
            <PopoverTrigger
              type="button"
              className={cn(
                "flex h-10 min-w-0 flex-1 items-center justify-between rounded-lg border border-border/55 bg-card/70 px-3 text-left text-xs font-semibold text-foreground/80 transition-colors hover:border-border hover:bg-muted/40 focus:outline-hidden focus:ring-2 focus:ring-ring/25 sm:w-40 sm:flex-none",
                !selectedDate && "text-muted-foreground/50"
              )}
            >
              {selectedDate ? (
                format(parseISO(selectedDate), 'dd/MM/yyyy')
              ) : (
                <span>Pilih Tanggal</span>
              )}
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate ? parseISO(selectedDate) : undefined}
                onSelect={(date) => {
                  if (date) {
                    const yyyy = date.getFullYear()
                    const mm = String(date.getMonth() + 1).padStart(2, '0')
                    const dd = String(date.getDate()).padStart(2, '0')
                    setSelectedDate(`${yyyy}-${mm}-${dd}`)
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="size-10 rounded-lg border-border/55 bg-card/70 hover:bg-muted/40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Admin Quick Report Action Area */}
      {!isSuperAdmin && (
        <Card className="gap-0 rounded-xl border-0 bg-card/75 py-0 shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/50">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/90">Kehadiran Laporan Hari Ini</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/70">
              Absen sebelum jam operasional berakhir demi integritas pencatatan leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {currentUserRecord?.has_reported ? (
              <div className="flex items-center gap-3 rounded-lg bg-green-500/[0.07] p-4 ring-1 ring-green-500/20">
                <CheckCircle className="h-8 w-8 text-green-600 shrink-0 dark:text-green-400" />
                <div>
                  <p className="text-xs font-semibold text-foreground/90">
                    Anda sudah melakukan absensi hari ini!
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Kategori Laporan: <span className="font-bold text-amber-500">{getCategoryLabel(currentUserRecord.report_category)}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/[0.07] p-3.5 ring-1 ring-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/70 leading-relaxed">
                    Anda belum mengirimkan laporan harian untuk tanggal{' '}
                    <span className="font-bold text-foreground">
                      {new Date(selectedDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    . Silakan pilih salah satu kategori di bawah:
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Button
                    onClick={() => handleAdminSubmit('ada_wa')}
                    disabled={submitPresenceMutation.isPending}
                    className="flex h-20 flex-col items-center justify-center rounded-lg border-0 bg-muted/45 text-foreground ring-1 ring-border/45 transition-colors hover:bg-green-500/[0.08] hover:ring-green-500/25 focus:ring-2 focus:ring-green-500/30"
                  >
                    <Check className="h-5 w-5 text-green-600 mb-1 dark:text-green-400" />
                    <span className="text-xs font-bold">Ada Chat WA Masuk</span>
                  </Button>
                  <Button
                    onClick={() => handleAdminSubmit('nol_wa')}
                    disabled={submitPresenceMutation.isPending}
                    className="flex h-20 flex-col items-center justify-center rounded-lg border-0 bg-muted/45 text-foreground ring-1 ring-border/45 transition-colors hover:bg-amber-500/[0.08] hover:ring-amber-500/25 focus:ring-2 focus:ring-amber-500/30"
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-500 mb-1 dark:text-amber-400" />
                    <span className="text-xs font-bold">0 Chat WA Masuk</span>
                  </Button>
                  <Button
                    onClick={() => handleAdminSubmit('libur_susulan')}
                    disabled={submitPresenceMutation.isPending}
                    className="flex h-20 flex-col items-center justify-center rounded-lg border-0 bg-muted/45 text-foreground ring-1 ring-border/45 transition-colors hover:bg-blue-500/[0.08] hover:ring-blue-500/25 focus:ring-2 focus:ring-blue-500/30"
                  >
                    <Coffee className="h-5 w-5 text-blue-600 mb-1 dark:text-blue-400" />
                    <span className="text-xs font-bold">Libur / Susulan</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Super Admin Monitoring Grid & Statistics */}
      {isSuperAdmin && (
        <>
          {/* Clickable KPI cards — these double as the category filter */}
          {statusCounts && (
            <section aria-label="Filter status absensi" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border/45 shadow-[0_16px_42px_-34px_rgba(2,8,23,0.72)] ring-1 ring-border/50 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { id: 'all', label: 'Total Admin', value: statusCounts.all, Icon: Users, chip: 'bg-amber-500/10', tint: 'text-amber-500', ring: 'border-amber-500/50 ring-amber-500/25', hover: 'hover:border-amber-500/40', bar: 'bg-amber-500', neutral: true },
                { id: 'ada_wa', label: 'Ada WA', value: statusCounts.ada_wa, Icon: CheckCircle, chip: 'bg-green-500/10', tint: 'text-green-500', ring: 'border-green-500/50 ring-green-500/25', hover: 'hover:border-green-500/40', bar: 'bg-green-500' },
                { id: 'nol_wa', label: '0 WA', value: statusCounts.nol_wa, Icon: PhoneOff, chip: 'bg-orange-500/10', tint: 'text-orange-500', ring: 'border-orange-500/50 ring-orange-500/25', hover: 'hover:border-orange-500/40', bar: 'bg-orange-500' },
                { id: 'libur_susulan', label: 'Libur', value: statusCounts.libur_susulan, Icon: Coffee, chip: 'bg-blue-500/10', tint: 'text-blue-500', ring: 'border-blue-500/50 ring-blue-500/25', hover: 'hover:border-blue-500/40', bar: 'bg-blue-500' },
                { id: 'belum_laporan', label: 'Belum Lapor', value: statusCounts.belum_laporan, Icon: Clock, chip: 'bg-red-500/10', tint: 'text-red-500', ring: 'border-red-500/50 ring-red-500/25', hover: 'hover:border-red-500/40', bar: 'bg-red-500' },
              ].map((s) => {
                const isActive = selectedStatus === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStatus(s.id)}
                    aria-pressed={isActive}
                    className={cn(
                       'group relative flex min-h-[78px] items-center gap-3 overflow-hidden bg-card/90 px-3.5 py-3 text-left outline-none transition-colors duration-200 hover:bg-muted/45 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40',
                       isActive && 'bg-[color-mix(in_srgb,var(--primary-theme)_7%,var(--card))]'
                    )}
                  >
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', s.chip)}>
                      <s.Icon className={cn('h-5 w-5', s.tint)} />
                    </span>
                    <span className="min-w-0">
                       <span className={cn('block text-xl font-black leading-none tabular-nums', s.neutral ? 'text-foreground' : s.tint)}>
                        {s.value}
                      </span>
                      <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </span>
                    </span>
                    {isActive && <span className={cn('absolute inset-x-3 bottom-0 h-0.5 rounded-t-full', s.bar)} />}
                  </button>
                )
              })}
            </section>
          )}

          {/* Toolbar: active filter hint + exports */}
          <div className="relative z-10 -mb-px flex flex-col gap-3 rounded-t-xl bg-card/75 px-3.5 py-3 ring-1 ring-border/50 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_9%,var(--card))] text-[var(--primary-theme)]">
                <Filter className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Data ditampilkan</p>
                <p className="truncate text-xs font-semibold text-foreground/90">
                  {selectedStatus === 'all' ? 'Semua admin' : getCategoryLabel(selectedStatus === 'belum_laporan' ? null : selectedStatus)}
                </p>
              </div>
              {selectedStatus !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className="rounded-md bg-muted/55 px-2 py-1 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(['PC', 'NPP'] as const).map((group) => (
                <a
                  key={group}
                  href={isMounted ? buildExportUrl('/api/v1/report-attendances/export', {
                    date: selectedDate,
                    account_group: group,
                  }) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/55 bg-background/45 px-2.5 text-[11px] font-semibold text-foreground/80 transition-colors hover:border-[color-mix(in_srgb,var(--primary-theme)_32%,var(--border))] hover:text-[var(--primary-theme)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export {group}
                </a>
              ))}
            </div>
          </div>

          {/* Presence monitor list */}
          <Card className="gap-0 overflow-hidden rounded-b-xl rounded-t-none border-0 bg-card/75 py-0 shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-border/45 bg-muted/20">
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Nama Admin</TableHead>
                      <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Akun</TableHead>
                      <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Status Absen</TableHead>
                      <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Jam Laporan</TableHead>
                      <TableHead className="h-11 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Moderasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-56 p-0 text-center">
                          <div className="flex flex-col items-center justify-center px-6 py-10">
                            <span className="grid size-11 place-items-center rounded-xl bg-muted/45 text-muted-foreground">
                              <ClipboardX className="size-5" />
                            </span>
                            <p className="mt-3 text-sm font-bold text-foreground/85">Data absensi tidak ditemukan</p>
                            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                              Tidak ada laporan untuk tanggal dan kategori yang sedang dipilih.
                            </p>
                            {selectedStatus !== 'all' && (
                              <button type="button" onClick={() => setSelectedStatus('all')} className="mt-3 rounded-lg bg-muted/55 px-3 py-1.5 text-[11px] font-semibold text-foreground/80 transition-colors hover:bg-muted">
                                Tampilkan semua admin
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((rec) => (
                        <TableRow key={rec.admin_id} className="border-border/30 transition-colors odd:bg-background/[0.08] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))]">
                          <TableCell className="text-xs font-semibold text-foreground/90">
                            {rec.admin_name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rec.account_name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] rounded-lg font-bold uppercase px-2 py-0.5 tracking-wide",
                                getCategoryBadgeColor(rec.report_category)
                              )}
                            >
                              {getCategoryLabel(rec.report_category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground/70">
                            {rec.reported_at
                              ? new Date(rec.reported_at).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => openModeration(rec.admin_id, rec.report_category)}
                              className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 w-7 rounded-lg dark:hover:bg-zinc-800"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Super Admin Moderation Dialog */}
          <Dialog open={moderationOpen} onOpenChange={setModerationOpen}>
            <DialogContent className="border-border bg-card text-foreground max-w-sm dark:border-zinc-800 dark:bg-zinc-900">
              <form onSubmit={handleModerationSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Ubah Absensi Admin</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs">
                    Override status absensi harian untuk admin terpilih pada tanggal terpilih.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mod-cat" className="text-xs font-semibold text-muted-foreground">Status Absensi</Label>
                    <select
                      id="mod-cat"
                      value={modCategory}
                      onChange={(e) => setModCategory(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    >
                      <option value="">Belum Laporan (Hapus Absen)</option>
                      <option value="ada_wa">Ada Chat WA Masuk</option>
                      <option value="nol_wa">0 Chat WA Masuk</option>
                      <option value="libur_susulan">Libur / Susulan</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border/80 pt-4 dark:border-zinc-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModerationOpen(false)}
                    className="text-muted-foreground hover:bg-muted text-xs dark:hover:bg-zinc-800"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={upsertPresenceMutation.isPending}
                    className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold text-xs"
                  >
                    {upsertPresenceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Simpan Perubahan'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
