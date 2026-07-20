'use client'

import { useEffect, useState } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { CalendarDays, FileSpreadsheet, Loader2, RefreshCw, Users } from 'lucide-react'

import { buildExportUrl } from '@/lib/api/client'
import { useSurveyorScheduleRecap } from '@/lib/hooks/useSurveyorScheduleRecap'
import { useSurveyors } from '@/lib/hooks/useSurveys'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomSelect } from '@/components/ui/custom-select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ACCOUNT_GROUP_LABELS, type AccountGroup, type SurveyorRecapDay } from '@/types'

/** Tanggal disimpan sebagai yyyy-MM-dd; parse balik dengan jam tengah hari
 *  supaya pergeseran zona waktu tidak memindahkannya sehari. */
const toDate = (value: string) => parseISO(`${value}T12:00:00`)

export default function RekapJadwalSurveyorView() {
  const [weekDate, setWeekDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [accountGroup, setAccountGroup] = useState<AccountGroup | ''>('')
  const [surveyorId, setSurveyorId] = useState<string>('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // buildExportUrl membaca window + localStorage; tahan sampai mounted agar
  // markup server dan klien tidak berbeda.
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

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

  const exportHref = isMounted
    ? buildExportUrl('/api/v1/export/surveys/recap/excel', {
        week_date: weekDate,
        account_group: accountGroup || undefined,
        surveyor: surveyorId || undefined,
      })
    : '#'

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
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
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60 dark:border-white/10"
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            Muat ulang
          </button>
          <a
            href={exportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 text-xs font-semibold text-foreground/80 transition-colors hover:border-ring/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:border-white/10"
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </a>
        </div>
      </header>

      {/* Filter */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_16px_40px_-32px_rgba(0,0,0,0.8)] dark:border-white/[0.07] sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Minggu
            </Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger className="inline-flex h-10 w-full items-center justify-start gap-2 rounded-xl border border-border/70 bg-background/60 px-3.5 text-sm text-foreground/80 shadow-inner shadow-black/[0.03] transition-[border-color,background-color,box-shadow] duration-200 outline-none hover:border-border focus-visible:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/20 dark:border-white/10 dark:hover:border-white/20">
                <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
                {format(toDate(weekDate), 'd MMM yyyy')}
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
      </div>

      {isLoading && !report ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : !report ? (
        <EmptyState message="Data rekap belum bisa dimuat." />
      ) : (
        <>
          <p className="text-xs font-semibold text-muted-foreground">{report.subtitle}</p>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
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
    <Card className="relative overflow-hidden rounded-2xl border-border/70 bg-card shadow-[0_16px_40px_-32px_rgba(0,0,0,0.8)] dark:border-white/[0.07]">
      {isFetching && (
        <div className="absolute right-4 top-4 z-10">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        </div>
      )}
      <CardContent className="p-0">
        <div className="space-y-2 p-3 md:hidden">
          {days.map((day) => (
            <section key={day.date} className={cn('rounded-xl border border-border/70 p-3 dark:border-white/[0.07]', day.isFirstDay && 'bg-amber-500/[0.06]', day.isLastDay && 'bg-red-500/[0.05]')}>
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-foreground">{day.dayName}</p><p className="text-[10px] text-muted-foreground">{day.dateLabel}</p></div>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground dark:bg-zinc-800">{day.count} survey</span>
              </div>
              <div className="mt-2 space-y-1 border-t border-border/50 pt-2 dark:border-white/[0.06]">
                {day.surveyorNames.length > 0 ? day.surveyorNames.map((name, index) => <p key={`${day.date}-${index}`} className="text-xs font-semibold text-foreground/85">{index + 1}. {name}</p>) : <p className="text-xs text-muted-foreground/60">Belum ada survey.</p>}
              </div>
            </section>
          ))}
        </div>
        {/* Tabel asli, bukan div-grid: ini data tabular dan pembaca layar
            perlu hubungan kolom-hari â†” isinya. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">
              Jadwal surveyor per hari dalam satu minggu. Satu baris sel = satu survey.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-12 border-b border-r border-border/60 bg-muted/30 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.06]"
                >
                  No
                </th>
                {days.map((day) => (
                  <th
                    key={day.date}
                    scope="col"
                    aria-current={day.date === today ? 'date' : undefined}
                    className={cn(
                      'border-b border-r border-border/60 px-3 py-2 text-center last:border-r-0 dark:border-white/[0.06]',
                      day.isFirstDay && 'bg-[color-mix(in_srgb,var(--color-warning-500)_14%,transparent)]',
                      day.isLastDay && 'bg-[color-mix(in_srgb,var(--color-danger-text)_12%,transparent)]',
                      !day.isFirstDay && !day.isLastDay && 'bg-muted/30',
                      day.date === today && 'ring-1 ring-inset ring-ring/50'
                    )}
                  >
                    <span className="block text-xs font-bold text-foreground">{day.dayName}</span>
                    <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                      {day.dateLabel}
                    </span>
                    <span className="mt-1 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground dark:bg-zinc-800">
                      {day.count} survey
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowIndex) => (
                <tr key={rowIndex}>
                  <th
                    scope="row"
                    className="border-b border-r border-border/60 bg-muted/20 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground dark:border-white/[0.06]"
                  >
                    {rowIndex + 1}
                  </th>
                  {days.map((day) => {
                    const name = day.surveyorNames[rowIndex]
                    return (
                      <td
                        key={day.date}
                        className="border-b border-r border-border/60 px-3 py-1.5 text-xs last:border-r-0 dark:border-white/[0.06]"
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
      </CardContent>
    </Card>
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
    <Card className="h-fit overflow-hidden rounded-2xl border-border/70 bg-card shadow-[0_16px_40px_-32px_rgba(0,0,0,0.8)] dark:border-white/[0.07]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
          <Users className="size-3.5 text-amber-500" />
          Jumlah per Surveyor
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
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
                  className="border-y border-border/60 bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.06]"
                >
                  Surveyor
                </th>
                <th
                  scope="col"
                  className="w-14 border-y border-border/60 bg-muted/30 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:border-white/[0.06]"
                >
                  Jml
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item) => (
                <tr key={item.surveyorId}>
                  <td className="border-b border-border/60 px-4 py-2 dark:border-white/[0.06]">
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
                  <td className="border-b border-border/60 px-2 py-2 text-center text-xs font-bold text-foreground dark:border-white/[0.06]">
                    {item.count}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total
                </td>
                <td className="px-2 py-2.5 text-center text-sm font-black text-amber-500">{total}</td>
              </tr>
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card dark:border-white/[0.07]">
      <CardContent className="py-12 text-center text-xs text-muted-foreground">{message}</CardContent>
    </Card>
  )
}
