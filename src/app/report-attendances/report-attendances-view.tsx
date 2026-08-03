'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  useReportAttendances,
  useSubmitAttendance,
  useUpsertAttendanceBySuperAdmin,
  useAccountGroups,
  type AttendanceItem,
  type AttendanceRecapItem,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  PhoneOff,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFileDownload } from '@/lib/hooks/useFileDownload'

type AttendanceStatusFilter = 'all' | 'ada_wa' | 'nol_wa' | 'libur_susulan' | 'belum_laporan'

const statusOptions: Array<{
  id: AttendanceStatusFilter
  label: string
  shortLabel: string
  helper: string
  Icon: typeof Users
  chip: string
  tint: string
  badge: string
  bar: string
}> = [
  {
    id: 'all',
    label: 'Semua admin',
    shortLabel: 'Total Admin',
    helper: 'Seluruh data',
    Icon: Users,
    chip: 'bg-cyan-500/10',
    tint: 'text-cyan-400',
    badge: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    bar: 'bg-cyan-400',
  },
  {
    id: 'ada_wa',
    label: 'Ada Chat WA',
    shortLabel: 'Ada WA',
    helper: 'Laporan masuk',
    Icon: CheckCircle,
    chip: 'bg-emerald-500/10',
    tint: 'text-emerald-400',
    badge: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    bar: 'bg-emerald-400',
  },
  {
    id: 'nol_wa',
    label: '0 Chat WA',
    shortLabel: '0 WA',
    helper: 'Tidak ada chat',
    Icon: PhoneOff,
    chip: 'bg-orange-500/10',
    tint: 'text-orange-400',
    badge: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
    bar: 'bg-orange-400',
  },
  {
    id: 'libur_susulan',
    label: 'Libur / Susulan',
    shortLabel: 'Libur',
    helper: 'Admin off',
    Icon: Coffee,
    chip: 'bg-blue-500/10',
    tint: 'text-blue-400',
    badge: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
    bar: 'bg-blue-400',
  },
  {
    id: 'belum_laporan',
    label: 'Belum Lapor',
    shortLabel: 'Belum Lapor',
    helper: 'Perlu follow-up',
    Icon: Clock,
    chip: 'bg-red-500/10',
    tint: 'text-red-400',
    badge: 'border-red-500/25 bg-red-500/10 text-red-300',
    bar: 'bg-red-400',
  },
]

const getStatusOption = (status: string | null) => {
  if (!status) return statusOptions.find((item) => item.id === 'belum_laporan')!
  return statusOptions.find((item) => item.id === status) ?? statusOptions[0]
}

const statusSelectItems = statusOptions.map((option) => ({
  value: option.id,
  label: option.label,
}))

export default function ReportAttendancesPage() {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'


  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatusFilter>('all')
  const [viewMode, setViewMode] = useState<'daily' | 'recap'>('daily')
  const [rangeStart, setRangeStart] = useState(today)
  const [rangeEnd, setRangeEnd] = useState(today)
  const [rangeStartOpen, setRangeStartOpen] = useState(false)
  const [rangeEndOpen, setRangeEndOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const { download, isDownloading } = useFileDownload()

  const isRecap = viewMode === 'recap'

  const { data: response, isLoading, isRefetching, refetch } = useReportAttendances(
    isRecap
      ? { start_date: rangeStart, end_date: rangeEnd, status: selectedStatus }
      : { date: selectedDate, status: selectedStatus }
  )

  const { data: accountGroupsResponse } = useAccountGroups()
  const accountGroups = accountGroupsResponse?.data ?? []

  // Filter tanggal yang sedang aktif — dipakai bersama oleh tabel dan export
  // supaya file yang diunduh selalu mengikuti apa yang terlihat di layar.
  const exportDateParams = isRecap
    ? { start_date: rangeStart, end_date: rangeEnd }
    : { date: selectedDate }

  const submitPresenceMutation = useSubmitAttendance()
  const upsertPresenceMutation = useUpsertAttendanceBySuperAdmin()

  const [moderationOpen, setModerationOpen] = useState(false)
  const [modAdminId, setModAdminId] = useState<number | null>(null)
  const [modCategory, setModCategory] = useState<string>('')

  const statusCounts = response?.status_counts ?? {
    all: 0,
    ada_wa: 0,
    nol_wa: 0,
    libur_susulan: 0,
    belum_laporan: 0,
  }
  // Bentuk baris berbeda antar mode, jadi dipisah supaya tidak ada akses
  // properti yang tidak ada di salah satu mode.
  const dailyRecords: AttendanceItem[] =
    response?.mode === 'recap' ? [] : ((response?.data as AttendanceItem[]) ?? [])
  const recapRecords: AttendanceRecapItem[] =
    response?.mode === 'recap' ? (response.data as AttendanceRecapItem[]) : []
  const rowCount = isRecap ? recapRecords.length : dailyRecords.length

  const selectedStatusMeta = getStatusOption(selectedStatus)
  const toLabel = (value: string) => (value ? format(parseISO(value), 'dd/MM/yyyy') : '-')
  const toLongLabel = (value: string) =>
    value
      ? parseISO(value).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '-'

  const selectedDateLabel = toLabel(selectedDate)
  const selectedDateLong = toLongLabel(selectedDate)
  const activeRangeLabel = isRecap
    ? `${toLongLabel(rangeStart)} - ${toLongLabel(rangeEnd)}`
    : selectedDateLong

  const rangeTruncated = response?.mode === 'recap' && response.range_truncated
  const maxRangeDays = response?.mode === 'recap' ? response.max_range_days : 0

  const currentUserRecord = dailyRecords.find((rec) => rec.admin_id === user?.id)
  const selectedModerationRecord = dailyRecords.find((rec) => rec.admin_id === modAdminId)

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
    return getStatusOption(cat).badge
  }

  return (
    <div className="min-w-0 space-y-5 pb-8 sm:space-y-6">
      <header className="space-y-4 pb-1">
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

        {/* Baris sendiri, selalu di bawah judul — dulu ini berbagi baris
            dengan judul lewat lg:flex-row, jadi lebar panel kontrol (4 field
            di mode Harian vs 5 di mode Rekap karena tanggal Dari+Sampai)
            menekan lebar paragraf deskripsi, bikin ia wrap beda jumlah baris,
            dan seluruh konten di bawahnya (termasuk kartu KPI) ikut naik-turun
            setiap ganti mode. Baris terpisah = lebar judul tidak lagi
            tergantung berapa banyak kontrol yang sedang tampil. */}
        {/* Menyaring per tanggal, status, dan mode adalah kontrol pemantauan:
            admin hanya melaporkan absensinya sendiri untuk hari ini, jadi panel
            ini khusus super admin. State yang dikendalikannya tetap di nilai
            bawaan (hari ini, semua status) — persis yang dibutuhkan kartu
            laporan admin di bawah. */}
        {isSuperAdmin && (
        <div className="flex flex-wrap items-stretch gap-2 rounded-xl border border-border/80 bg-card p-2 shadow-sm ring-1 ring-border/40 sm:ml-auto sm:w-fit dark:border-zinc-700/80">
          <Select
            value={viewMode}
            onValueChange={(value) => setViewMode((value as 'daily' | 'recap') ?? 'daily')}
            items={[
              { value: 'daily', label: 'Harian' },
              { value: 'recap', label: 'Rekap Periode' },
            ]}
          >
            <SelectTrigger className="h-10 w-full shrink-0 rounded-xl border-border/55 bg-card text-xs font-semibold shadow-sm transition-shadow hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))] hover:shadow-md sm:w-[136px]">
              <SelectValue placeholder="Mode">
                {isRecap ? 'Rekap Periode' : 'Harian'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-60 border-border/70 bg-card p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              {[
                { value: 'daily', label: 'Harian', helper: 'Status satu tanggal' },
                { value: 'recap', label: 'Rekap Periode', helper: 'Hitungan hari sepanjang rentang' },
              ].map((option) => (
                <SelectItem key={option.value} value={option.value} className="rounded-lg px-2.5 py-2 text-xs">
                  {/* Anak SelectItem ditata sebagai flex, jadi label dan
                      helper harus dibungkus satu wrapper agar bertumpuk. */}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{option.label}</span>
                    {/* Helper dibiarkan membungkus: lebar popup mengikuti
                        trigger, memaksanya satu baris bikin teks terpotong. */}
                    <span className="mt-0.5 block whitespace-normal text-[10px] leading-snug text-muted-foreground">
                      {option.helper}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isRecap ? (
            <>
              {([
                { label: 'Dari', value: rangeStart, set: setRangeStart, open: rangeStartOpen, setOpen: setRangeStartOpen },
                { label: 'Sampai', value: rangeEnd, set: setRangeEnd, open: rangeEndOpen, setOpen: setRangeEndOpen },
              ] as const).map((field) => (
                <Popover key={field.label} open={field.open} onOpenChange={field.setOpen}>
                  <PopoverTrigger
                    type="button"
                    className="flex h-10 w-full shrink-0 items-center justify-between gap-1.5 rounded-xl border border-border/55 bg-card px-3 text-left text-xs font-semibold text-foreground/80 shadow-sm transition-[border-color,background-color,box-shadow] hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))] hover:shadow-md focus:outline-hidden focus:ring-2 focus:ring-ring/25 sm:w-[172px]"
                  >
                    <span className="whitespace-nowrap">
                      <span className="text-muted-foreground/70">{field.label} </span>
                      {toLabel(field.value)}
                    </span>
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border border-border bg-popover dark:border-zinc-800" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          field.set(format(date, 'yyyy-MM-dd'))
                          field.setOpen(false)
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ))}
            </>
          ) : (
          <Popover>
            <PopoverTrigger
              type="button"
              className={cn(
                "flex h-10 w-full shrink-0 items-center justify-between gap-1.5 rounded-xl border border-border/55 bg-card px-3 text-left text-xs font-semibold text-foreground/80 shadow-sm transition-[border-color,background-color,box-shadow] hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))] hover:shadow-md focus:outline-hidden focus:ring-2 focus:ring-ring/25 sm:w-[172px]",
                !selectedDate && "text-muted-foreground/50"
              )}
            >
              <span className="whitespace-nowrap">
                {selectedDate ? selectedDateLabel : 'Pilih Tanggal'}
              </span>
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
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
          )}

          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as AttendanceStatusFilter)}
            items={statusSelectItems}
          >
            <SelectTrigger className="h-10 w-full shrink-0 rounded-xl border-border/55 bg-card text-xs font-semibold shadow-sm transition-shadow hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))] hover:shadow-md sm:w-[190px]">
              <SelectValue placeholder="Filter status">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className={cn('size-2 rounded-full shrink-0', selectedStatusMeta.bar)} />
                  <span className="truncate">{selectedStatusMeta.label}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-56 border-border/70 bg-card p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              {statusOptions.map((option) => (
                <SelectItem key={option.id} value={option.id} className="rounded-lg px-2.5 py-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('size-2 rounded-full', option.bar)} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{option.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{option.helper}</span>
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="size-10 shrink-0 rounded-xl border-border/55 bg-card shadow-sm transition-[transform,box-shadow,border-color,background-color] hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))] hover:shadow-md active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isRefetching && "animate-spin")} />
          </Button>
        </div>
        )}
      </header>

      {/* Admin Quick Report Action Area */}
      {!isSuperAdmin && (
        <Card className="relative gap-0 overflow-hidden rounded-2xl border-0 bg-card py-0 shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/50">
          {/* Aksen gradien tipis di header — pakai warna theme, tetap redup di
              light maupun dark supaya tidak mengganggu keterbacaan teks. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[color-mix(in_srgb,var(--primary-theme)_10%,transparent)] to-transparent"
          />
          <CardHeader className="relative p-4 pb-3 sm:p-5 sm:pb-3.5">
            <CardTitle className="text-sm font-bold text-foreground sm:text-base">Kehadiran Laporan Hari Ini</CardTitle>
            <CardDescription className="mt-0.5 text-xs text-muted-foreground/80">
              Absen sebelum jam operasional berakhir demi integritas pencatatan leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative px-4 pb-4 sm:px-5 sm:pb-5">
            {currentUserRecord?.has_reported ? (
              (() => {
                const meta = getStatusOption(currentUserRecord.report_category)
                return (
                  <div className="flex items-center gap-3.5 rounded-xl bg-emerald-500/[0.08] p-4 ring-1 ring-emerald-500/25">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400">
                      <CheckCircle className="size-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        Absensi hari ini sudah terkirim
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        Kategori laporan:
                        <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bold', meta.badge)}>
                          <span className={cn('size-1.5 rounded-full', meta.bar)} />
                          {getCategoryLabel(currentUserRecord.report_category)}
                        </span>
                      </p>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/[0.08] p-3.5 ring-1 ring-amber-500/25">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs leading-relaxed text-foreground/75">
                    Anda belum mengirimkan laporan harian untuk tanggal{' '}
                    <span className="font-bold text-foreground">{selectedDateLong}</span>
                    . Pilih salah satu kategori di bawah:
                  </p>
                </div>

                {/* Panduan di atas tombol — kategori sering tertukar, jadi
                    aturan dibaca dulu sebelum memilih. Panel ini sengaja pakai
                    surface --background (lebih dalam dari --card induk) supaya
                    kontras berlapis: kartu induk, panel panduan lebih gelap,
                    tombol lebih terang. */}
                <div className="rounded-xl border border-border/60 bg-background/70 p-3.5 dark:bg-background/40">
                  <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    <Info className="size-3.5" />
                    Panduan Pengisian
                  </p>
                  <ul className="space-y-2.5">
                    {[
                      {
                        dot: 'bg-emerald-400',
                        label: 'Ada Chat WA Masuk',
                        text: 'Ada leads/chat konsumen masuk hari ini — termasuk input susulan leads dari hari kemarin.',
                      },
                      {
                        dot: 'bg-amber-400',
                        label: '0 Chat WA Masuk',
                        text: 'Tidak ada leads masuk sama sekali. Klik untuk memberi laporan kehadiran saja.',
                      },
                      {
                        dot: 'bg-blue-400',
                        label: 'Libur / Susulan',
                        text: 'Hanya saat menginput data konsumen dengan tanggal konsultasi hari kemarin atau tanggal tertentu.',
                      },
                    ].map((row) => (
                      <li key={row.label} className="flex gap-2.5">
                        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', row.dot)} />
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          <span className="font-bold text-foreground/90">{row.label}:</span> {row.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-3">
                  {([
                    {
                      category: 'ada_wa',
                      Icon: Check,
                      label: 'Ada Chat WA Masuk',
                      helper: 'Ada leads masuk / susulan kemarin',
                      accent: 'text-emerald-600 dark:text-emerald-400',
                      chip: 'bg-emerald-500/12 ring-emerald-500/25',
                      hover: 'hover:border-emerald-500/45 hover:bg-emerald-500/[0.08] focus-visible:ring-emerald-500/35',
                    },
                    {
                      category: 'nol_wa',
                      Icon: AlertTriangle,
                      label: '0 Chat WA Masuk',
                      helper: 'Tidak ada leads, absensi saja',
                      accent: 'text-amber-600 dark:text-amber-400',
                      chip: 'bg-amber-500/12 ring-amber-500/25',
                      hover: 'hover:border-amber-500/45 hover:bg-amber-500/[0.08] focus-visible:ring-amber-500/35',
                    },
                    {
                      category: 'libur_susulan',
                      Icon: Coffee,
                      label: 'Libur / Susulan',
                      helper: 'Input konsumen tanggal lampau',
                      accent: 'text-blue-600 dark:text-blue-400',
                      chip: 'bg-blue-500/12 ring-blue-500/25',
                      hover: 'hover:border-blue-500/45 hover:bg-blue-500/[0.08] focus-visible:ring-blue-500/35',
                    },
                  ] as const).map((opt) => {
                    // mutation.variables menyimpan payload terakhir, jadi tombol
                    // yang sedang diproses bisa menampilkan spinner sendiri tanpa
                    // perlu state tambahan.
                    const isThisPending =
                      submitPresenceMutation.isPending &&
                      submitPresenceMutation.variables?.report_category === opt.category
                    return (
                      <button
                        key={opt.category}
                        type="button"
                        onClick={() => handleAdminSubmit(opt.category)}
                        disabled={submitPresenceMutation.isPending}
                        className={cn(
                          // Tombol pakai --muted solid + shadow: lebih terang
                          // dari kartu induk, jadi terbaca sebagai tile terangkat
                          // yang jelas beda dari panel panduan yang lebih gelap.
                          'group flex flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-muted px-3 py-4 text-center shadow-sm outline-none transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-55',
                          opt.hover
                        )}
                      >
                        <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl ring-1 transition-transform duration-200 group-hover:scale-105', opt.chip)}>
                          {isThisPending ? (
                            <Loader2 className={cn('size-5 animate-spin', opt.accent)} />
                          ) : (
                            <opt.Icon className={cn('size-5', opt.accent)} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-foreground">{opt.label}</span>
                          <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{opt.helper}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Super Admin Monitoring Grid & Statistics */}
      {isSuperAdmin && (
        <>
          {/* Clickable KPI cards — these double as the category filter. */}
          <section aria-label="Filter status absensi" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {statusOptions.map((s) => {
              const isActive = selectedStatus === s.id
              const value = statusCounts[s.id]
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'group relative flex min-h-[78px] items-center gap-3 overflow-hidden rounded-2xl border bg-card px-3.5 py-3 text-left outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/35',
                    isActive
                      ? 'border-[color-mix(in_srgb,var(--primary-theme)_38%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_9%,var(--card))] shadow-[0_10px_28px_-16px_var(--primary-theme)]'
                      : 'border-border/45 hover:border-[color-mix(in_srgb,var(--primary-theme)_24%,var(--border))]'
                  )}
                >
                  {/* Aksen kiri, bukan garis bawah — tidak ambil ruang layout
                      (absolute) jadi tak pernah menggeser konten di sebelahnya. */}
                  <span
                    className={cn(
                      'absolute inset-y-2.5 left-0 w-1 rounded-r-full transition-opacity duration-200',
                      s.bar,
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                    )}
                  />
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105', s.chip)}>
                    <s.Icon className={cn('h-5 w-5', s.tint)} />
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-xl font-black leading-none tabular-nums', s.tint)}>
                      {value}
                    </span>
                    <span className="mt-1.5 block truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {s.shortLabel}
                    </span>
                    <span className="mt-0.5 hidden truncate text-[10px] text-muted-foreground/70 xl:block">
                      {/* Di mode rekap semua angka bersatuan hari-admin, jadi
                          helper harian diganti supaya tidak salah dibaca. */}
                      {isRecap ? (s.id === 'all' ? 'Total hari-admin' : 'Jumlah hari') : s.helper}
                    </span>
                  </span>
                </button>
              )
            })}
          </section>

          {/* Toolbar: active filter hint + exports */}
          <div className="relative z-10 -mb-px flex flex-col gap-3 rounded-t-xl bg-card px-3.5 py-3 ring-1 ring-border/50 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_9%,var(--card))] text-[var(--primary-theme)]">
                <Filter className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Data absensi</p>
                <p className="truncate text-xs font-semibold text-foreground/90">
                  {selectedStatusMeta.label} - {activeRangeLabel}
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
              {/* Satu tombol export; grup dipilih di dalam. Daftar grup datang
                  dari server, jadi grup baru muncul sendiri tanpa ubah kode. */}
              <Popover open={exportOpen} onOpenChange={setExportOpen}>
                <PopoverTrigger
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--primary-theme)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_9%,var(--card))] px-3 text-[11px] font-bold text-[var(--primary-theme)] shadow-sm transition-[transform,box-shadow,background-color] hover:bg-[color-mix(in_srgb,var(--primary-theme)_16%,var(--card))] hover:shadow-md active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Excel
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60 border-border/70 bg-card p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                  <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Pilih grup akun
                  </p>
                  {[
                    ...accountGroups.map((group) => ({
                      key: group.value,
                      label: group.label,
                      helper: group.subtitle,
                      params: { account_group: group.value },
                    })),
                    {
                      key: '__all__',
                      label: 'Semua Grup',
                      helper: 'Seluruh akun dalam satu lembar',
                      params: {},
                    },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setExportOpen(false)
                        download(
                          '/report-attendances/export',
                          { ...exportDateParams, ...option.params },
                          'Rekap absensi berhasil diunduh.'
                        )
                      }}
                      disabled={isDownloading('/report-attendances/export')}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--primary-theme)_8%,var(--card))] disabled:cursor-wait disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground/90">{option.label}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{option.helper}</span>
                      </span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {rangeTruncated && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/[0.07] px-3.5 py-2.5 ring-1 ring-amber-500/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-[11px] leading-relaxed text-foreground/75">
                Rentang dipotong ke <span className="font-bold text-foreground">{maxRangeDays} hari</span> pertama.
                Persempit rentang bila ingin rekap yang lebih panjang dipecah per periode.
              </p>
            </div>
          )}

          {/* Presence monitor list */}
          <Card className="gap-0 overflow-hidden rounded-b-xl rounded-t-none border-0 bg-card py-0 shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-border/45 bg-muted/20">
                    <TableRow className="border-0 hover:bg-muted/15">
                      <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Nama Admin</TableHead>
                      <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Akun</TableHead>
                      {isRecap ? (
                        <>
                          <TableHead className="h-11 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Ada WA</TableHead>
                          <TableHead className="h-11 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">0 WA</TableHead>
                          <TableHead className="h-11 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Libur</TableHead>
                          <TableHead className="h-11 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Belum Lapor</TableHead>
                          <TableHead className="h-11 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Kepatuhan</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Tanggal Absen</TableHead>
                          <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Status Absen</TableHead>
                          <TableHead className="h-11 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Jam Laporan</TableHead>
                          <TableHead className="h-11 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Moderasi</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : rowCount === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-56 p-0 text-center">
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
                    ) : isRecap ? (
                      recapRecords.map((rec) => (
                        <TableRow key={rec.admin_id} className="border-border/30 transition-colors odd:bg-background/[0.08] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))]">
                          <TableCell className="text-xs font-semibold text-foreground/90">{rec.admin_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{rec.account_name}</TableCell>
                          <TableCell className="text-center text-xs font-semibold text-emerald-500">{rec.ada_wa}</TableCell>
                          <TableCell className="text-center text-xs font-semibold text-orange-500">{rec.nol_wa}</TableCell>
                          <TableCell className="text-center text-xs font-semibold text-blue-500">{rec.libur_susulan}</TableCell>
                          <TableCell className="text-center text-xs font-semibold text-red-500">{rec.missing_days}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs font-black tabular-nums text-foreground/90">{rec.compliance_rate}%</span>
                            <span className="ml-1 text-[10px] text-muted-foreground/70">
                              {rec.reported_days}/{rec.total_days} hari
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      dailyRecords.map((rec) => (
                        <TableRow key={rec.admin_id} className="border-border/30 transition-colors odd:bg-background/[0.08] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))]">
                          <TableCell className="text-xs font-semibold text-foreground/90">
                            {rec.admin_name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rec.account_name}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground/80">
                            {selectedDateLabel}
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
                    Koreksi status harian tanpa mengubah data admin lainnya.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/55 bg-background/45 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/45">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Tanggal absen</p>
                      <p className="mt-1 font-semibold text-foreground">{selectedDateLabel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Jam laporan</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {selectedModerationRecord?.reported_at
                          ? new Date(selectedModerationRecord.reported_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mod-cat" className="text-xs font-semibold text-muted-foreground">Status Absensi</Label>
                    <Select
                      value={modCategory}
                      onValueChange={(value) => setModCategory(value ?? '')}
                      items={[
                        { value: '', label: 'Belum Laporan (Hapus Absen)' },
                        { value: 'ada_wa', label: 'Ada Chat WA Masuk' },
                        { value: 'nol_wa', label: '0 Chat WA Masuk' },
                        { value: 'libur_susulan', label: 'Libur / Susulan' },
                      ]}
                    >
                      <SelectTrigger id="mod-cat" className="h-10 rounded-lg border-border/70 bg-background/70 text-xs font-semibold hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--background))] dark:border-slate-800 dark:bg-slate-950/80">
                        <SelectValue placeholder="Pilih status">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <span className={cn('size-2 rounded-full', getStatusOption(modCategory || null).bar)} />
                            <span className="truncate">{getCategoryLabel(modCategory || null)}</span>
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" className="min-w-72 border-border/70 bg-card p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                        {[
                          { value: '', label: 'Belum Laporan', helper: 'Hapus status absensi' },
                          { value: 'ada_wa', label: 'Ada Chat WA Masuk', helper: 'Admin menerima chat' },
                          { value: 'nol_wa', label: '0 Chat WA Masuk', helper: 'Tidak ada chat masuk' },
                          { value: 'libur_susulan', label: 'Libur / Susulan', helper: 'Admin off atau susulan' },
                        ].map((option) => (
                          <SelectItem key={option.value || 'empty'} value={option.value} className="rounded-lg px-2.5 py-2 text-xs">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className={cn('size-2 rounded-full', getStatusOption(option.value || null).bar)} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{option.label}</span>
                                <span className="block text-[10px] text-muted-foreground">{option.helper}</span>
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
