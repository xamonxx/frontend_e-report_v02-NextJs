'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { CalendarClock, Calendar as CalendarIcon, ClipboardCheck, Clock, Loader2, MapPinned, Pencil, Save, Send, X, UserRoundCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimeSearchSelect } from '@/components/ui/time-search-select'
import { Textarea } from '@/components/ui/textarea'
import { useRequestSurvey, useUpdateSurveyMaps } from '@/lib/hooks/useSurveys'
import { cn, formatApiError } from '@/lib/utils'
import type { Consultation, SurveyState } from '@/types'

const STATE_LABEL: Record<SurveyState, { text: string; className: string }> = {
  requested: { text: 'Menunggu penjadwalan', className: 'text-amber-600 dark:text-amber-400' },
  scheduled: { text: 'Sudah dijadwalkan', className: 'text-blue-600 dark:text-blue-400' },
  in_progress: { text: 'Sedang disurvei', className: 'text-violet-600 dark:text-violet-400' },
  completed: { text: 'Survey selesai', className: 'text-emerald-600 dark:text-emerald-400' },
  cancelled: { text: 'Dibatalkan', className: 'text-rose-600 dark:text-rose-400' },
}

function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function formatSchedule(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function SurveyFact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/35 p-3 dark:border-zinc-800/60 dark:bg-zinc-950/25">
      <span className="mt-0.5 shrink-0 text-muted-foreground/70">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">{label}</p>
        <div className="mt-0.5 break-words text-xs font-semibold text-foreground/85">{value}</div>
      </div>
    </div>
  )
}

/**
 * Pilihan jam tiap 30 menit dalam format 24 jam. Menggantikan
 * `<input type="time">` yang mengikuti locale browser - di mesin ber-locale
 * Inggris tampilannya jadi "05:09 PM", bukan kebiasaan Indonesia.
 */
const TIME_OPTIONS = [
  { value: '', label: 'Belum ditentukan' },
  ...Array.from({ length: 48 }, (_, index) => {
    const value = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`
    return { value, label: `${value} WIB` }
  }),
]

/**
 * Google Maps sering disalin tanpa skema ("maps.app.goo.gl/..."). Backend
 * memvalidasinya sebagai URL penuh, jadi skemanya dilengkapi di sini.
 */
function normalizeMapsUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

type Props = {
  consultation: Consultation
  /** True ketika status pipeline lead berada di tahap Request Survey. */
  isAtSurveyStage: boolean
  /** Dinaikkan halaman induk tiap status berubah ke Request Survey. */
  autoOpenSignal?: number
}

/**
 * Kartu status survey di halaman detail lead.
 *
 * Dua peran sekaligus:
 * 1. Menampilkan survey yang sedang berjalan bila ada.
 * 2. Bila lead sudah di tahap Request Survey tapi belum pernah diajukan,
 *    menawarkan form pengajuan ke manager surveyor.
 *
 * Modal terbuka sendiri saat status baru saja diubah ke Request Survey, dan
 * tombol pada kartu jadi jaring pengaman kalau modalnya ditutup.
 */
export default function SurveyRequestCard({ consultation, isAtSurveyStage, autoOpenSignal = 0 }: Props) {
  const survey = consultation.active_survey ?? null
  const [open, setOpen] = useState(false)
  const requestSurvey = useRequestSurvey(consultation.id)
  const updateSurveyMaps = useUpdateSurveyMaps(survey?.id ?? 0, consultation.id)

  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [mapsEditOpen, setMapsEditOpen] = useState(false)
  const [mapsEditUrl, setMapsEditUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Buka otomatis hanya ketika induk memberi sinyal DAN lead memang belum
  // punya survey - supaya tidak mengganggu saat status diubah bolak-balik.
  useEffect(() => {
    if (autoOpenSignal > 0 && isAtSurveyStage && !survey) {
      setOpen(true)
    }
  }, [autoOpenSignal, isAtSurveyStage, survey])

  useEffect(() => {
    setMapsEditUrl(survey?.google_maps_url ?? '')
  }, [survey?.google_maps_url])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!date) {
      toast.error('Tanggal survey wajib diisi')
      return
    }

    requestSurvey.mutate(
      {
        requested_date: date,
        requested_time: time || undefined,
        google_maps_url: normalizeMapsUrl(mapsUrl) || undefined,
        admin_notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Pengajuan survey terkirim ke Manager Surveyor')
          setOpen(false)
          setTime('')
          setMapsUrl('')
          setNotes('')
        },
        onError: (err) => toast.error(formatApiError(err, 'Gagal mengajukan survey')),
      },
    )
  }

  const openManually = () => setOpen(true)
  const openMapsEditor = () => {
    setMapsEditUrl(survey?.google_maps_url ?? '')
    setMapsEditOpen(true)
  }
  const cancelMapsEditor = () => {
    setMapsEditUrl(survey?.google_maps_url ?? '')
    setMapsEditOpen(false)
  }
  const submitMapsUpdate = () => {
    if (!survey) return
    updateSurveyMaps.mutate(
      { google_maps_url: normalizeMapsUrl(mapsEditUrl) || null },
      {
        onSuccess: () => {
          toast.success('Link Google Maps survey diperbarui')
          setMapsEditOpen(false)
        },
        onError: (err) => toast.error(formatApiError(err, 'Gagal memperbarui link Maps')),
      },
    )
  }
  const surveyStatusText = survey
    ? [
        STATE_LABEL[survey.state]?.text ?? survey.state,
        survey.surveyor?.name ? `(${survey.surveyor.name})` : null,
        survey.state === 'completed' && survey.result_status?.name ? survey.result_status.name : null,
      ].filter(Boolean).join(' - ')
    : ''

  return (
    <>
      <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground/90">
            <MapPinned className="h-4 w-4 text-amber-500" />
            Status Survey
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground">
            Survey lokasi oleh tim surveyor.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {survey ? (
            <>
              <div
                className={cn(
                  'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-bold',
                  STATE_LABEL[survey.state]?.className,
                )}
                style={{
                  borderColor: survey.result_status?.color ? `${survey.result_status.color}45` : undefined,
                  backgroundColor: survey.result_status?.color ? `${survey.result_status.color}12` : undefined,
                }}
              >
                <span className="truncate">{surveyStatusText}</span>
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <SurveyFact
                  icon={<UserRoundCheck className="h-4 w-4" />}
                  label="Surveyor"
                  value={survey.surveyor?.name ?? 'Belum ditentukan'}
                />
                <SurveyFact
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Jadwal"
                  value={formatSchedule(survey.scheduled_at)}
                />
                <SurveyFact
                  icon={<Clock className="h-4 w-4" />}
                  label="Mulai"
                  value={formatSchedule(survey.actual_start_at)}
                />
                <SurveyFact
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  label="Selesai"
                  value={formatSchedule(survey.actual_finish_at)}
                />
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3.5 text-xs dark:border-cyan-400/15 dark:bg-cyan-400/[0.055]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Link Google Maps</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {survey.google_maps_url
                        ? 'Lokasi siap dibuka oleh tim survey.'
                        : 'Tambahkan link Maps agar surveyor tidak salah alamat.'}
                    </p>
                  </div>
                  {!mapsEditOpen && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={openMapsEditor}
                      className="h-10 w-full shrink-0 justify-center rounded-xl bg-cyan-500 px-4 text-[12px] font-bold text-slate-950 shadow-[0_12px_28px_-18px_rgba(6,182,212,0.95)] hover:bg-cyan-400 sm:w-auto"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {survey.google_maps_url ? 'Ubah Link' : 'Isi Link Maps'}
                    </Button>
                  )}
                </div>

                {mapsEditOpen ? (
                  <div className="mt-3 space-y-2.5">
                    <Input
                      type="url"
                      inputMode="url"
                      value={mapsEditUrl}
                      onChange={(event) => setMapsEditUrl(event.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="h-11 rounded-xl border-cyan-500/25 bg-slate-950/55 text-xs focus-visible:ring-cyan-500/25"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelMapsEditor}
                        disabled={updateSurveyMaps.isPending}
                        className="h-9 rounded-xl border-slate-700/80 bg-slate-950/40 px-3 text-xs"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Batal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={submitMapsUpdate}
                        disabled={updateSurveyMaps.isPending}
                        className="h-9 rounded-xl bg-cyan-500 px-3 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                      >
                        {updateSurveyMaps.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Simpan
                      </Button>
                    </div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                      Boleh dikosongkan jika link Maps belum ada atau perlu dihapus dulu.
                    </p>
                  </div>
                ) : survey.google_maps_url ? (
                  <a
                    href={survey.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex max-w-full items-center gap-1.5 font-semibold text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
                  >
                    <MapPinned className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Buka lokasi di Google Maps</span>
                  </a>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-cyan-500/25 bg-slate-950/25 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                    Belum ada link Maps.
                  </p>
                )}
              </div>
              {survey.result_status && (
                <div className="rounded-xl border border-border/50 bg-muted/35 p-3 text-xs dark:border-zinc-800/60 dark:bg-zinc-950/25">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Hasil Survey</p>
                  <p className="mt-1 font-semibold text-foreground/85">{survey.result_status.name}</p>
                  {(survey.result_notes || survey.recommendations) && (
                    <div className="mt-2 space-y-2 border-t border-border/40 pt-2 dark:border-zinc-800/50">
                      {survey.result_notes && (
                        <p className="break-words leading-relaxed text-muted-foreground">
                          {survey.result_notes}
                        </p>
                      )}
                      {survey.recommendations && (
                        <p className="break-words leading-relaxed text-muted-foreground">
                          Rekomendasi: {survey.recommendations}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {survey.location_notes && (
                <div className="rounded-xl border border-border/50 bg-muted/35 p-3 text-xs dark:border-zinc-800/60 dark:bg-zinc-950/25">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Catatan Lokasi</p>
                  <p className="mt-1 break-words leading-relaxed text-foreground/80">
                    {survey.location_notes}
                  </p>
                </div>
              )}
              {survey.admin_notes && (
                <div className="rounded-xl border border-border/50 bg-muted/35 p-3 text-xs dark:border-zinc-800/60 dark:bg-zinc-950/25">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Catatan Admin</p>
                  <p className="mt-1 break-words leading-relaxed text-foreground/80">
                    {survey.admin_notes}
                  </p>
                  </div>
              )}
            </>
          ) : isAtSurveyStage ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-xs text-muted-foreground">
                Lead ini sudah masuk tahap survey tapi <b className="text-amber-600 dark:text-amber-400">belum diajukan</b> ke
                Manager Surveyor.
              </p>
              <Button size="sm" onClick={openManually} className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400">
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Ajukan Survey
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/70">
              Ubah tahap pipeline ke <b>Request Survey</b> untuk mengajukan survey lokasi.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-slate-700/70 bg-[#131b2e] text-foreground shadow-[0_24px_70px_-40px_rgba(0,188,212,0.5)]">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
                  <UserRoundCheck className="size-4" />
                </span>
                Ajukan Survey ke Manager Surveyor
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tentukan kapan konsumen bersedia disurvei. Manager Surveyor yang akan menetapkan surveyornya.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{consultation.client_name}</span>
              <br />
              {[consultation.district, consultation.city, consultation.province].filter(Boolean).join(', ') || 'Wilayah belum dikonfirmasi'}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="survey-date" className="text-xs font-semibold text-muted-foreground">
                  Tanggal Survey <span className="text-rose-500">*</span>
                </Label>
                {/* Popover + Calendar, bukan <input type="date">: kontrol
                    bawaan browser memakai locale sistem sehingga tanggalnya
                    tampil MM/DD/YYYY di mesin ber-locale Inggris. */}
                <Popover>
                  <PopoverTrigger
                    id="survey-date"
                    type="button"
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/65 px-3 text-left text-xs font-semibold text-foreground/90 outline-none transition-colors hover:border-cyan-500/35 hover:bg-slate-950/80 focus-visible:ring-2 focus-visible:ring-cyan-500/25"
                  >
                    {date ? format(parseISO(date), 'd MMMM yyyy', { locale: idLocale }) : 'Pilih tanggal'}
                    <CalendarIcon className="ml-auto h-4 w-4 text-cyan-400/80" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border border-slate-700/80 bg-slate-950 p-0 text-foreground shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={date ? parseISO(date) : undefined}
                      disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                      onSelect={(picked) => { if (picked) setDate(format(picked, 'yyyy-MM-dd')) }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="survey-time" className="text-xs font-semibold text-muted-foreground">
                  Jam <span className="text-muted-foreground/60">(opsional)</span>
                </Label>
                <TimeSearchSelect
                  value={time}
                  onChange={setTime}
                  options={TIME_OPTIONS}
                  placeholder="Belum ditentukan"
                  searchPlaceholder="Cari jam..."
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="survey-maps" className="text-xs font-semibold text-muted-foreground">
                Link Google Maps <span className="text-muted-foreground/60">(opsional)</span>
              </Label>
              <Input
                id="survey-maps"
                type="url"
                inputMode="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="h-11 rounded-xl border-slate-700/80 bg-slate-950/65 text-xs focus-visible:ring-cyan-500/25"
              />
              <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                Tempelkan tautan dari tombol Bagikan di aplikasi Maps supaya surveyor tidak salah alamat.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="survey-notes" className="text-xs font-semibold text-muted-foreground">
                Catatan untuk Manager <span className="text-muted-foreground/60">(opsional)</span>
              </Label>
              <Textarea
                id="survey-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: konsumen hanya bisa sore hari"
                className="min-h-[82px] rounded-xl border-slate-700/80 bg-slate-950/65 text-xs focus-visible:ring-cyan-500/25"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-700/80 bg-slate-950/40 hover:bg-slate-800/60">
                Nanti saja
              </Button>
              <Button
                type="submit"
                disabled={requestSurvey.isPending || !date}
                className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {requestSurvey.isPending ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Mengirim...</>
                ) : (
                  <><Send className="mr-1.5 h-3.5 w-3.5" />Kirim ke Manager Surveyor</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
