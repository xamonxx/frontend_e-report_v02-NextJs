'use client'

import { useState } from 'react'
import type { ElementType } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import {
  CalendarDays,
  CalendarCheck,
  CalendarClock,
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
import { ACCOUNT_GROUP_LABELS, type AccountGroup, type SurveyorItem, type SurveyorRecapDay, type SurveyorRecapScheduleItem, type SurveyorRecapSummary } from '@/types'

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
  const weeklyLoads = report ? buildWeeklyLoads(surveyors, report.summary) : []

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
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 text-xs font-semibold text-foreground/80 transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
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
      <section aria-label="Filter rekap jadwal" className="overflow-hidden rounded-xl bg-card shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/55">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/45 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-muted text-[var(--primary-theme)]">
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
              <button type="button" onClick={() => shiftWeek(-7)} className="grid h-10 place-items-center rounded-lg border border-border/55 bg-background text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:text-foreground" title="Minggu sebelumnya" aria-label="Minggu sebelumnya">
                <ChevronLeft className="size-4" />
              </button>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-border/55 bg-background px-3 text-sm font-semibold text-foreground/85 transition-colors outline-none hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] focus-visible:ring-2 focus-visible:ring-ring/30">
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
              <button type="button" onClick={() => shiftWeek(7)} className="grid h-10 place-items-center rounded-lg border border-border/55 bg-background text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--primary-theme)_28%,var(--border))] hover:text-foreground" title="Minggu berikutnya" aria-label="Minggu berikutnya">
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
          </div>

          <SummaryCards total={report.total} weeklyLoads={weeklyLoads} />

          <RecommendationPanel weeklyLoads={weeklyLoads} days={report.days} />

          <WeekGrid days={report.days} isFetching={isFetching} />
          <SummaryTable summary={report.summary} total={report.total} />
        </>
      )}
    </div>
  )
}

type WeeklyLoad = {
  surveyorId: number
  surveyorName: string
  count: number
}

function buildWeeklyLoads(
  surveyors: SurveyorItem[],
  summary: SurveyorRecapSummary[]
): WeeklyLoad[] {
  const counts = new Map(summary.map((item) => [item.surveyorId, item]))
  const fromSurveyors = surveyors.map((surveyor) => ({
    surveyorId: surveyor.id,
    surveyorName: surveyor.name,
    count: counts.get(surveyor.id)?.count ?? 0,
  }))

  const missingFromSurveyors = summary
    .filter((item) => !fromSurveyors.some((load) => load.surveyorId === item.surveyorId))
    .map((item) => ({
      surveyorId: item.surveyorId,
      surveyorName: item.surveyorName,
      count: item.count,
    }))

  return [...fromSurveyors, ...missingFromSurveyors].sort((a, b) => a.count - b.count || a.surveyorName.localeCompare(b.surveyorName))
}

function SummaryCards({ total, weeklyLoads }: { total: number; weeklyLoads: WeeklyLoad[] }) {
  const active = weeklyLoads.filter((item) => item.count > 0)
  const busiest = [...weeklyLoads].sort((a, b) => b.count - a.count || a.surveyorName.localeCompare(b.surveyorName))[0]
  const quietest = weeklyLoads[0]

  return (
    <section aria-label="Ringkasan rekap jadwal" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={CalendarCheck} label="Total jadwal" value={total} hint="Minggu terpilih" />
      <MetricCard icon={Users} label="Surveyor aktif" value={active.length} hint={`${weeklyLoads.length} surveyor terdaftar`} />
      <MetricCard
        icon={CalendarClock}
        label="Paling kosong"
        value={quietest?.surveyorName ?? '-'}
        hint={quietest ? `${quietest.count} jadwal minggu ini` : 'Belum ada data'}
      />
      <MetricCard
        icon={Users}
        label="Tersibuk"
        value={busiest?.surveyorName ?? '-'}
        hint={busiest ? `${busiest.count} jadwal minggu ini` : 'Belum ada data'}
      />
    </section>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ElementType
  label: string
  value: string | number
  hint: string
}) {
  return (
    <article className="min-w-0 rounded-xl bg-card p-4 ring-1 ring-border/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-black text-foreground">{value}</p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">{hint}</p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-[var(--primary-theme)]">
          <Icon className="size-4" />
        </span>
      </div>
    </article>
  )
}

function RecommendationPanel({
  weeklyLoads,
  days,
}: {
  weeklyLoads: WeeklyLoad[]
  days: SurveyorRecapDay[]
}) {
  const recommended = weeklyLoads.slice(0, 3)
  const busiest = [...weeklyLoads].sort((a, b) => b.count - a.count || a.surveyorName.localeCompare(b.surveyorName)).slice(0, 3)
  const quietDays = [...days].sort((a, b) => a.count - b.count || a.date.localeCompare(b.date)).slice(0, 2)

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-border/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
            <CalendarClock className="size-4 text-[var(--primary-theme)]" />
            Rekomendasi penjadwalan
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Prioritaskan surveyor dengan beban paling ringan, lalu cek jam kosong saat menentukan tanggal.
          </p>
        </div>
        {quietDays.length > 0 && (
          <div className="rounded-lg bg-muted px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hari paling ringan</p>
            <p className="text-xs font-bold text-foreground">
              {quietDays.map((day) => `${day.dayName} (${day.count})`).join(', ')}
            </p>
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-lg bg-background p-3 ring-1 ring-border/35">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kandidat paling aman</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommended.map((item) => (
              <span key={item.surveyorId} className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground ring-1 ring-[color-mix(in_srgb,var(--primary-theme)_24%,var(--border))]">
                {item.surveyorName} <span className="text-muted-foreground">({item.count})</span>
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-background p-3 ring-1 ring-border/35">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Perlu dihindari kalau bukan prioritas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {busiest.map((item) => (
              <span key={item.surveyorId} className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground/85">
                {item.surveyorName} <span className="text-muted-foreground">({item.count})</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WeekGrid({
  days,
  isFetching,
}: {
  days: SurveyorRecapDay[]
  isFetching: boolean
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultMobileDay = days.find((day) => day.date === today) ?? days[0]
  const [selectedMobileDate, setSelectedMobileDate] = useState(defaultMobileDay?.date ?? '')
  const selectedMobileDay = days.find((day) => day.date === selectedMobileDate) ?? defaultMobileDay

  return (
    <section className="relative min-w-0 overflow-hidden rounded-xl bg-card shadow-[0_18px_48px_-38px_rgba(2,8,23,0.72)] ring-1 ring-border/50">
      {isFetching && (
        <div className="absolute right-4 top-4 z-10">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        </div>
      )}
      <div>
        <div className="lg:hidden">
          <nav aria-label="Pilih hari jadwal" className="border-b border-border/45">
            <div className="grid w-full grid-cols-7">
              {days.map((day) => {
                const isSelected = day.date === selectedMobileDay?.date

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedMobileDate(day.date)}
                    aria-pressed={isSelected}
                    className={cn(
                      'min-w-0 border-b-2 border-r border-r-border/25 px-0.5 py-2.5 text-center transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40',
                      isSelected
                        ? 'border-b-[var(--primary-theme)] bg-muted/70 text-foreground'
                        : 'border-b-transparent text-muted-foreground hover:bg-muted/35 hover:text-foreground'
                    )}
                  >
                    <span className="block truncate text-[10px] font-extrabold sm:text-[11px]">{day.dayName.slice(0, 3)}</span>
                    <span className="mt-0.5 block text-[8px] font-semibold tabular-nums sm:text-[9px]">{day.dateLabel.slice(0, 5)}</span>
                    <span className={cn('mt-1 block text-[10px] font-black tabular-nums', isSelected && 'text-[var(--primary-theme)]')}>
                      {day.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>

          {selectedMobileDay && (
            <section aria-labelledby={`mobile-day-${selectedMobileDay.date}`}>
              <header className="flex items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
                <div>
                  <h2 id={`mobile-day-${selectedMobileDay.date}`} className="text-sm font-black text-foreground">
                    {selectedMobileDay.dayName}
                  </h2>
                  <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{selectedMobileDay.dateLabel}</p>
                </div>
                <p className="text-[11px] font-bold tabular-nums text-muted-foreground">
                  {selectedMobileDay.count} jadwal
                </p>
              </header>
              <div className="divide-y divide-border/35">
                {selectedMobileDay.count > 0 ? Array.from({ length: selectedMobileDay.count }, (_, index) => (
                  <ScheduleItemCard
                    key={`${selectedMobileDay.date}-${index}`}
                    index={index}
                    item={selectedMobileDay.scheduleItems?.[index]}
                    fallbackLabel={selectedMobileDay.surveyorNames[index]}
                    compact
                  />
                )) : (
                  <p className="px-4 py-10 text-center text-xs font-semibold text-muted-foreground/65">
                    Belum ada survey pada hari ini.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
        <div className="hidden overflow-x-auto p-3 lg:block">
          <div className="grid min-w-[1260px] grid-cols-7 gap-2">
            {days.map((day) => (
              <section
                key={day.date}
                aria-current={day.date === today ? 'date' : undefined}
                className={cn(
                  'min-w-0 overflow-hidden rounded-md bg-background/40',
                  day.date === today
                    ? 'bg-[color-mix(in_srgb,var(--primary-theme)_5%,var(--background))]'
                    : day.isFirstDay
                      ? 'bg-[color-mix(in_srgb,var(--color-warning-500)_5%,var(--background))]'
                      : day.isLastDay
                        ? 'bg-[color-mix(in_srgb,var(--color-danger-text)_4%,var(--background))]'
                        : ''
                )}
              >
                <div
                  className={cn(
                    'sticky top-0 z-[1] border-b border-t-2 border-border/45 bg-card/95 px-3 py-3',
                    day.date === today
                      ? 'border-t-[var(--primary-theme)]'
                      : day.isFirstDay
                        ? 'border-t-amber-500/65'
                        : day.isLastDay
                          ? 'border-t-red-500/55'
                          : 'border-t-border/70'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight text-foreground">{day.dayName}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{day.dateLabel}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-black tabular-nums text-muted-foreground">
                      {day.count}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-border/45 [&>article:nth-child(even)]:bg-muted/[0.12]">
                  {day.count > 0 ? Array.from({ length: day.count }, (_, index) => (
                    <ScheduleItemCard
                      key={`${day.date}-${index}`}
                      index={index}
                      item={day.scheduleItems?.[index]}
                      fallbackLabel={day.surveyorNames[index]}
                    />
                  )) : (
                    <p className="px-3 py-8 text-center text-xs font-semibold text-muted-foreground/65">
                      Belum ada survey.
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ScheduleItemCard({
  index,
  item,
  fallbackLabel,
  compact = false,
}: {
  index: number
  item?: SurveyorRecapScheduleItem
  fallbackLabel?: string
  compact?: boolean
}) {
  if (!item) {
    return (
      <p className="break-words text-xs font-semibold leading-snug text-foreground/85">
        {index + 1}. {fallbackLabel}
      </p>
    )
  }

  return (
    <article className={cn('group min-w-0 px-3 py-3 transition-colors hover:bg-muted/30', compact && 'px-4 py-3.5')}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="grid size-5 shrink-0 place-items-center rounded bg-muted text-[9px] font-black tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="break-words text-xs font-black leading-tight text-foreground">{item.surveyorName}</p>
            <p className="mt-1 break-words text-[11px] font-semibold leading-snug text-foreground/85">{item.clientName}</p>
            <p className="mt-0.5 font-mono text-[9px] font-semibold leading-tight text-muted-foreground">
              ID {item.consumerId}
            </p>
          </div>
        </div>
        <span className="shrink-0 font-mono text-[11px] font-black tabular-nums text-[var(--primary-theme)]">
          {item.timeLabel}
        </span>
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-1.5 pl-7 text-[10px] font-semibold leading-snug text-muted-foreground">
        <span className="shrink-0 text-foreground/75">{item.groupLabel}</span>
        <span aria-hidden="true" className="text-border">/</span>
        <span className="min-w-0 break-words">{item.city}</span>
      </div>
    </article>
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
    <section className="overflow-hidden rounded-xl bg-card shadow-[0_16px_42px_-38px_rgba(2,8,23,0.65)] ring-1 ring-border/35 dark:bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground/90">
            <Users className="size-4 text-[var(--primary-theme)]/80" />
            Jumlah per Surveyor
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Distribusi jadwal minggu terpilih</p>
        </div>
        <div className="flex items-baseline gap-2 rounded-md bg-muted px-3 py-1.5 dark:bg-[#0b1220]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-base font-black tabular-nums text-[var(--primary-theme)]">{total}</p>
        </div>
      </div>
      <div className="px-4 py-2">
        {summary.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">
            Belum ada survey terjadwal di minggu ini.
          </p>
        ) : (
          <div className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => (
              <div
                key={item.surveyorId}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-border/25 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:[&:nth-last-child(-n+4)]:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      item.count === busiest ? 'bg-[var(--primary-theme)]' : 'bg-muted-foreground/35'
                    )}
                    aria-hidden="true"
                  />
                  <p className="min-w-0 truncate text-xs font-semibold text-foreground/85" title={item.surveyorName}>
                    {item.surveyorName}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-bold tabular-nums text-foreground/90 dark:bg-[#0b1220]">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-card py-12 text-center text-xs text-muted-foreground ring-1 ring-border/50">
      {message}
    </div>
  )
}
