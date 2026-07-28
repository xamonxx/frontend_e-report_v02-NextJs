'use client'

import { useState } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Users,
} from 'lucide-react'

import { useFileDownload } from '@/lib/hooks/useFileDownload'
import { useSurveyorScheduleRecap } from '@/lib/hooks/useSurveyorScheduleRecap'
import { useSurveyors } from '@/lib/hooks/useSurveys'
import { Calendar } from '@/components/ui/calendar'
import { CustomSelect } from '@/components/ui/custom-select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ACCOUNT_GROUP_LABELS, type AccountGroup, type SurveyorRecapDay } from '@/types'

/** Tanggal disimpan sebagai yyyy-MM-dd; parse balik dengan jam tengah hari
 *  supaya pergeseran zona waktu tidak memindahkannya sehari. */
const toDate = (value: string) => parseISO(`${value}T12:00:00`)
const MONTH_CODES = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES']
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

const safeFilePart = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const dateRangeLabel = (start: Date, end: Date) => {
  const startYear = start.getFullYear() !== end.getFullYear() ? format(start, 'yyyy') : ''

  return `${format(start, 'dd')}${MONTH_CODES[start.getMonth()]}${startYear}-${format(end, 'dd')}${MONTH_CODES[end.getMonth()]}${format(end, 'yyyy')}`
}

const calendarWeekOfMonth = (date: Date) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const firstWeekStart = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1), { weekStartsOn: 1 })

  return Math.floor((weekStart.getTime() - firstWeekStart.getTime()) / MS_PER_WEEK) + 1
}

export default function RekapJadwalSurveyorView() {
  const [weekDate, setWeekDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [accountGroup, setAccountGroup] = useState<AccountGroup | ''>('')
  const [surveyorId, setSurveyorId] = useState<string>('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const { download, isDownloading } = useFileDownload()

  const { data: surveyorsResponse } = useSurveyors()
  const surveyors = surveyorsResponse?.data ?? []

  // Tanpa filter per-akun: API-nya menerima `account`, tapi daftar akunnya
  // hanya tersedia lewat /master-data/accounts yang ber-middleware role:admin
  // dan memfilter ke account_id user â€” sementara manager surveyor adalah tim
  // pusat tanpa account_id. Filter grup sudah menutup kebutuhan ini.
  const filters = {
    week_date: weekDate,
    account_group: accountGroup || undefined,
    surveyor: surveyorId ? Number(surveyorId) : undefined,
  }

  const { data: response, isLoading, isFetching, refetch } = useSurveyorScheduleRecap(filters)
  const report = response?.data
  const currentWeekDate = format(new Date(), 'yyyy-MM-dd')
  const activeFilterCount = Number(Boolean(accountGroup)) + Number(Boolean(surveyorId))
  const hasCustomFilters = activeFilterCount > 0 || weekDate !== currentWeekDate

  const shiftWeek = (days: number) => {
    setWeekDate(format(addDays(toDate(weekDate), days), 'yyyy-MM-dd'))
  }

  const resetFilters = () => {
    setWeekDate(currentWeekDate)
    setAccountGroup('')
    setSurveyorId('')
  }

  const exportPath = '/export/surveys/recap/excel'
  const exportParams = {
    week_date: weekDate,
    account_group: accountGroup || undefined,
    surveyor: surveyorId || undefined,
  }

  const buildExportFilename = () => {
    const start = startOfWeek(toDate(weekDate), { weekStartsOn: 1 })
    const end = addDays(start, 6)
    const groupLabel = accountGroup ? ACCOUNT_GROUP_LABELS[accountGroup] : ''
    const surveyorName = surveyorId ? surveyors.find((surveyor) => String(surveyor.id) === surveyorId)?.name : ''
    const filterSuffix = surveyorName || groupLabel ? `_${safeFilePart(surveyorName || groupLabel)}` : ''

    return `REKAP_JADWAL_${dateRangeLabel(start, end)}_M${calendarWeekOfMonth(start)}${filterSuffix}.xlsx`
  }

  return (
    <div className="min-w-0 space-y-5 pb-8 sm:space-y-6">
      <header className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">
            Survey - Rekap Mingguan
          </p>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Rekap Jadwal Surveyor</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Berapa kali tiap surveyor dijadwalkan turun dalam satu minggu.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-3 text-xs font-semibold text-foreground/80 transition-colors hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            Muat ulang
          </button>
          <button
            type="button"
            onClick={() => download(exportPath, exportParams, 'Rekap jadwal berhasil diunduh.', buildExportFilename())}
            disabled={isDownloading(exportPath)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--primary-theme)] px-3 text-xs font-bold text-[var(--primary-theme-foreground)] transition-[filter,transform] hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-wait disabled:opacity-60"
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </button>
        </div>
      </header>

      {/* Filter */}
      <section aria-label="Filter rekap jadwal" className="overflow-hidden rounded-xl bg-card/75 shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/55 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/45 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--primary-theme)_10%,var(--card))] text-[var(--primary-theme)]">
              <SlidersHorizontal className="size-3.5" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground/90">Filter jadwal</p>
              <p className="text-[10px] text-muted-foreground">
                {activeFilterCount > 0 ? `${activeFilterCount} filter aktif` : 'Semua grup dan surveyor'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasCustomFilters}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(300px,1.15fr)_minmax(210px,1fr)_minmax(210px,1fr)]">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Periode Minggu
            </Label>
            <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] gap-1.5">
              <button type="button" onClick={() => shiftWeek(-7)} className="grid h-10 place-items-center rounded-lg border border-border/55 bg-background/45 text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:text-foreground" title="Minggu sebelumnya" aria-label="Minggu sebelumnya">
                <ChevronLeft className="size-4" />
              </button>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-border/55 bg-background/45 px-3 text-sm font-semibold text-foreground/85 transition-colors outline-none hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] focus-visible:ring-2 focus-visible:ring-ring/30">
                  <CalendarDays className="size-3.5 shrink-0 text-[var(--primary-theme)]" />
                  <span className="truncate">{format(toDate(weekDate), 'd MMM yyyy')}</span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate(weekDate)}
                    onSelect={(date) => {
                      if (date) {
                        setWeekDate(format(date, 'yyyy-MM-dd'))
                        setDatePickerOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              <button type="button" onClick={() => shiftWeek(7)} className="grid h-10 place-items-center rounded-lg border border-border/55 bg-background/45 text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:text-foreground" title="Minggu berikutnya" aria-label="Minggu berikutnya">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {/* Tanggal apapun otomatis dijepret ke minggu Seninâ€“Minggu miliknya. */}
              Menampilkan minggu {format(startOfWeek(toDate(weekDate), { weekStartsOn: 1 }), 'd MMM')} -{' '}
              {format(addDays(startOfWeek(toDate(weekDate), { weekStartsOn: 1 }), 6), 'd MMM yyyy')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Grup Akun
            </Label>
            <CustomSelect
              value={accountGroup}
              onChange={(v) => setAccountGroup(v as AccountGroup | '')}
              placeholder="Semua grup"
              options={[
                { value: '', label: 'Semua grup' },
                ...Object.entries(ACCOUNT_GROUP_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Surveyor
            </Label>
            <CustomSelect
              value={surveyorId}
              onChange={setSurveyorId}
              placeholder="Semua surveyor"
              options={[
                { value: '', label: 'Semua surveyor' },
                ...surveyors.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {isLoading && !report ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : !report ? (
        <EmptyState message="Data rekap belum bisa dimuat." />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--primary-theme)]">Hasil rekap</p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{report.subtitle}</p>
            </div>
            <div className="flex items-baseline gap-1.5 text-muted-foreground">
              <span className="text-xl font-black tabular-nums text-foreground">{report.total}</span>
              <span className="text-[11px] font-medium">jadwal minggu ini</span>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <WeekGrid days={report.days} rowCount={report.rowCount} isFetching={isFetching} />
            <SummaryTable summary={report.summary} total={report.total} />
          </div>
        </>
      )}
    </div>
  )
}

function WeekGrid({
  days,
  rowCount,
  isFetching,
}: {
  days: SurveyorRecapDay[]
  rowCount: number
  isFetching: boolean
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const rows = Array.from({ length: rowCount }, (_, i) => i)

  return (
    <section className="relative min-w-0 overflow-hidden rounded-xl bg-card/75 shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/50 backdrop-blur-sm">
      {isFetching && (
        <div className="absolute right-4 top-4 z-10">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        </div>
      )}
      <div>
        <div className="space-y-2 p-3 md:hidden">
          {days.map((day) => (
            <section key={day.date} className={cn('rounded-lg bg-background/35 p-3 ring-1 ring-border/45', day.isFirstDay && 'bg-amber-500/[0.06]', day.isLastDay && 'bg-red-500/[0.05]')}>
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-foreground">{day.dayName}</p><p className="text-[10px] text-muted-foreground">{day.dateLabel}</p></div>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground dark:bg-zinc-800">{day.count} survey</span>
              </div>
              <div className="mt-2 space-y-1 pt-2 ring-1 ring-transparent before:block before:h-px before:bg-border/40">
                {day.surveyorNames.length > 0 ? day.surveyorNames.map((name, index) => <p key={`${day.date}-${index}`} className="text-xs font-semibold text-foreground/85">{index + 1}. {name}</p>) : <p className="text-xs text-muted-foreground/60">Belum ada survey.</p>}
              </div>
            </section>
          ))}
        </div>
        {/* Tabel asli, bukan div-grid: ini data tabular dan pembaca layar
            perlu hubungan kolom-hari â†” isinya. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">
              Jadwal surveyor per hari dalam satu minggu. Satu baris sel = satu survey.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-12 border-b border-border/45 bg-muted/20 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  No
                </th>
                {days.map((day) => (
                  <th
                    key={day.date}
                    scope="col"
                    aria-current={day.date === today ? 'date' : undefined}
                    className={cn(
                      'border-b border-border/45 px-3 py-3 text-center',
                      day.isFirstDay && 'bg-[color-mix(in_srgb,var(--color-warning-500)_14%,transparent)]',
                      day.isLastDay && 'bg-[color-mix(in_srgb,var(--color-danger-text)_12%,transparent)]',
                      !day.isFirstDay && !day.isLastDay && 'bg-muted/20',
                      day.date === today && 'bg-[color-mix(in_srgb,var(--primary-theme)_10%,var(--card))] shadow-[inset_0_-2px_0_var(--primary-theme)]'
                    )}
                  >
                    <span className="block text-xs font-bold text-foreground">{day.dayName}</span>
                    <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                      {day.dateLabel}
                    </span>
                    <span className="mt-1 inline-block rounded-md bg-background/55 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                      {day.count} survey
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowIndex) => (
                <tr key={rowIndex} className="border-b border-border/30 transition-colors last:border-b-0 odd:bg-background/[0.08] hover:bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--card))]">
                  <th
                    scope="row"
                    className="bg-muted/10 px-2 py-2 text-center text-[10px] font-semibold tabular-nums text-muted-foreground"
                  >
                    {rowIndex + 1}
                  </th>
                  {days.map((day) => {
                    const name = day.surveyorNames[rowIndex]
                    return (
                      <td
                        key={day.date}
                        className="px-3 py-2 text-xs"
                      >
                        {name ? (
                          <span className="font-semibold text-foreground/85">{name}</span>
                        ) : (
                          <span className="text-muted-foreground/40" aria-hidden="true">
                            -
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function SummaryTable({
  summary,
  total,
}: {
  summary: { surveyorId: number; surveyorName: string; count: number }[]
  total: number
}) {
  const busiest = summary[0]?.count ?? 0

  return (
    <aside className="h-fit overflow-hidden rounded-xl bg-card/75 shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/50 backdrop-blur-sm xl:sticky xl:top-4">
      <div className="px-4 pb-3 pt-4">
        <h2 className="flex items-center gap-2 text-xs font-bold text-foreground/85">
          <Users className="size-3.5 text-amber-500" />
          Jumlah per Surveyor
        </h2>
        <p className="mt-1 text-[10px] text-muted-foreground">Distribusi jadwal minggu terpilih</p>
      </div>
      <div>
        {summary.length === 0 ? (
          <p className="px-5 pb-5 text-xs text-muted-foreground">
            Belum ada survey terjadwal di minggu ini.
          </p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="border-b border-border/45 bg-muted/20 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Surveyor
                </th>
                <th
                  scope="col"
                  className="w-14 border-b border-border/45 bg-muted/20 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Jml
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item) => (
                <tr key={item.surveyorId} className="border-b border-border/30 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-foreground/85">{item.surveyorName}</span>
                    {/* Bar proporsional: beban relatif langsung terbaca tanpa
                        mengandalkan warna saja. */}
                    <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-muted dark:bg-zinc-800">
                      <span
                        className="block h-full rounded-full bg-amber-500/70"
                        style={{ width: `${busiest > 0 ? (item.count / busiest) * 100 : 0}%` }}
                      />
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center text-xs font-bold tabular-nums text-foreground">
                    {item.count}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border/50 bg-muted/15">
                <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total
                </td>
                <td className="px-2 py-2.5 text-center text-sm font-black text-amber-500">{total}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </aside>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-card/70 py-12 text-center text-xs text-muted-foreground ring-1 ring-border/50">
      {message}
    </div>
  )
}
