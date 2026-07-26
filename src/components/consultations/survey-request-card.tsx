'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { CalendarClock, Calendar as CalendarIcon, ClipboardCheck, Loader2, MapPinned, Send, UserRoundCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimeSearchSelect } from '@/components/ui/time-search-select'
import { Textarea } from '@/components/ui/textarea'
import { useRequestSurvey } from '@/lib/hooks/useSurveys'
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

  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Buka otomatis hanya ketika induk memberi sinyal DAN lead memang belum
  // punya survey - supaya tidak mengganggu saat status diubah bolak-balik.
  useEffect(() => {
    if (autoOpenSignal > 0 && isAtSurveyStage && !survey) {
      setOpen(true)
    }
  }, [autoOpenSignal, isAtSurveyStage, survey])

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
              <p className={cn('text-sm font-semibold', STATE_LABEL[survey.state]?.className)}>
                {STATE_LABEL[survey.state]?.text ?? survey.state}
              </p>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <UserRoundCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Surveyor</p>
                    <p className="font-medium text-foreground/80">{survey.surveyor?.name ?? 'Belum ditentukan'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Jadwal</p>
                    <p className="font-medium text-foreground/80">{formatSchedule(survey.scheduled_at)}</p>
                  </div>
                </div>
              </div>
              {survey.google_maps_url && (
                <a
                  href={survey.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  <MapPinned className="h-3.5 w-3.5" />
                  Buka lokasi di Google Maps
                </a>
              )}
              {survey.result_status && (
                <div className="flex items-start gap-2 border-t border-border/50 pt-2 text-xs dark:border-zinc-800">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground/70">Hasil</p>
                    <p className="font-medium text-foreground/80">{survey.result_status.name}</p>
                  </div>
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
