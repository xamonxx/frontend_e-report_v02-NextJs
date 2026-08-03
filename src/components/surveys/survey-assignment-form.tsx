'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MapPinned,
  TrendingUp,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/errors'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CustomSelect } from '@/components/ui/custom-select'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { TimeSearchSelect } from '@/components/ui/time-search-select'
import {
  useAssignSurvey,
  useRescheduleAssignment,
  useSurveyorAssignmentSuggestions,
  useSurveyorAvailability,
  useSurveyors,
} from '@/lib/hooks/useSurveys'
import {
  combineLocalDateTime,
  formatDateLabel,
  requestedScheduleParts,
  scheduledTimeLabel,
  SURVEY_TIME_OPTIONS,
  toLocalInput,
} from '@/lib/survey-scheduling'
import { cn } from '@/lib/utils'
import type { Survey, SurveyorAssignmentSuggestion } from '@/types'

type AssignmentSurface = 'dialog' | 'page'

type SurveyAssignmentFormProps = {
  survey: Survey
  surface: AssignmentSurface
  onCancel: () => void
  onSaved: () => void
}

function candidateAreaLabel(survey: Survey, candidate: SurveyorAssignmentSuggestion): string {
  const city = survey.consultation?.city?.trim()
  const province = survey.consultation?.province?.trim()

  if (city && candidate.city_count > 0) {
    return `${city}, ${candidate.city_count} kunjungan`
  }
  if (province && candidate.province_count > 0) {
    return `${province}, ${candidate.province_count} kunjungan`
  }
  return 'Belum ada riwayat wilayah'
}

function CandidateButton({
  candidate,
  survey,
  selected,
  best,
  scheduledTime,
  onSelect,
}: {
  candidate: SurveyorAssignmentSuggestion
  survey: Survey
  selected: boolean
  best: boolean
  scheduledTime: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'relative flex min-h-32 flex-col rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30',
        selected
          ? 'border-cyan-500 bg-cyan-500/[0.06] shadow-sm'
          : 'border-border hover:border-cyan-500/45 hover:bg-muted/40 dark:border-white/10'
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0">
          {best && (
            <span className="mb-1 block text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              Pilihan terbaik
            </span>
          )}
          <span className="block truncate text-sm font-bold text-foreground">
            {candidate.surveyor_name}
          </span>
        </div>
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-full border',
            selected
              ? 'border-cyan-500 bg-cyan-500 text-slate-950'
              : 'border-border text-transparent dark:border-white/15'
          )}
        >
          <CheckCircle2 className="size-3.5" />
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-3.5 shrink-0" />
        Tersedia {scheduledTime || 'pada jam dipilih'}
      </p>
      <div className="mt-2 space-y-1 text-[13px] leading-5 text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" />
          {candidate.day_load === 0
            ? 'Belum ada jadwal hari ini'
            : `${candidate.day_load} jadwal hari ini`}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPinned className="size-3.5 shrink-0" />
          <span className="truncate">{candidateAreaLabel(survey, candidate)}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5 shrink-0" />
          {candidate.completed_count > 0
            ? `Deal rate ${candidate.deal_rate.toFixed(1)}%`
            : 'Belum ada data hasil'}
        </p>
      </div>
    </button>
  )
}

export function SurveyAssignmentForm({
  survey,
  surface,
  onCancel,
  onSaved,
}: SurveyAssignmentFormProps) {
  const { data: surveyorsResponse, isLoading: isSurveyorsLoading } = useSurveyors()
  const surveyors = surveyorsResponse?.data ?? []
  const assignMutation = useAssignSurvey(survey.id)
  const rescheduleMutation = useRescheduleAssignment(survey.id)
  const isReschedule = survey.state === 'scheduled'
  const requestedSchedule = requestedScheduleParts(survey)
  const initialSchedule = survey.scheduled_at
    ? toLocalInput(survey.scheduled_at)
    : requestedSchedule?.date
      ? combineLocalDateTime(requestedSchedule.date, requestedSchedule.time || '09:00')
      : ''

  const [surveyorId, setSurveyorId] = useState(
    survey.surveyor_id ? String(survey.surveyor_id) : ''
  )
  const [scheduledDate, setScheduledDate] = useState(initialSchedule.slice(0, 10))
  const [scheduledTime, setScheduledTime] = useState(initialSchedule.slice(11, 16))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [showAllSurveyors, setShowAllSurveyors] = useState(false)
  const [locationNotes, setLocationNotes] = useState(survey.location_notes ?? '')
  const [managerNotes, setManagerNotes] = useState('')

  const availabilityDate = scheduledDate || undefined
  const excludeSurveyId = isReschedule ? survey.id : undefined
  const {
    data: availabilityResponse,
    isError: isAvailabilityError,
  } = useSurveyorAvailability(availabilityDate, excludeSurveyId)
  const {
    data: suggestionsResponse,
    isFetching: isSuggestionsFetching,
    isError: isSuggestionsError,
  } = useSurveyorAssignmentSuggestions(
    survey.id,
    availabilityDate,
    scheduledTime || '09:00'
  )

  const availabilityItems = useMemo(
    () => availabilityResponse?.data ?? [],
    [availabilityResponse?.data]
  )
  const suggestions = useMemo(
    () => suggestionsResponse?.data ?? [],
    [suggestionsResponse?.data]
  )
  const availableSuggestions = suggestions.filter((candidate) => candidate.is_available).slice(0, 3)
  const suggestionMap = useMemo(
    () => new Map(suggestions.map((candidate) => [candidate.surveyor_id, candidate])),
    [suggestions]
  )
  const availabilityMap = useMemo(
    () => new Map(availabilityItems.map((item) => [item.id, item])),
    [availabilityItems]
  )
  const selectedAvailability = surveyorId
    ? availabilityMap.get(Number(surveyorId))
    : undefined
  const selectedBusyTimes = Array.from(new Set(
    (selectedAvailability?.schedules ?? [])
      .map((item) => scheduledTimeLabel(item))
      .filter(Boolean)
  )).sort()
  const hasTimeConflict = Boolean(scheduledTime && selectedBusyTimes.includes(scheduledTime))
  const selectedSurveyor = surveyors.find((surveyor) => String(surveyor.id) === surveyorId)
  const surveyorHasConflict = (id: number) => {
    const busyTimes = (availabilityMap.get(id)?.schedules ?? [])
      .map((schedule) => scheduledTimeLabel(schedule))
      .filter(Boolean)
    return Boolean(scheduledTime && busyTimes.includes(scheduledTime))
  }

  const sortedSurveyors = [...surveyors].sort((first, second) => {
    const firstSuggestion = suggestionMap.get(first.id)
    const secondSuggestion = suggestionMap.get(second.id)
    const firstConflict = firstSuggestion?.has_conflict
      ?? surveyorHasConflict(first.id)
    const secondConflict = secondSuggestion?.has_conflict
      ?? surveyorHasConflict(second.id)
    if (firstConflict !== secondConflict) return firstConflict ? 1 : -1

    const firstRank = firstSuggestion?.rank ?? 999
    const secondRank = secondSuggestion?.rank ?? 999
    if (firstRank !== secondRank) return firstRank - secondRank

    const firstLoad = availabilityMap.get(first.id)?.schedule_count ?? 0
    const secondLoad = availabilityMap.get(second.id)?.schedule_count ?? 0
    return firstLoad - secondLoad || first.name.localeCompare(second.name)
  })

  const surveyorOptions = sortedSurveyors.map((surveyor) => {
    const itemAvailability = availabilityMap.get(surveyor.id)
    const busyTimes = Array.from(new Set(
      (itemAvailability?.schedules ?? [])
        .map((schedule) => scheduledTimeLabel(schedule))
        .filter(Boolean)
    ))
    const conflict = Boolean(scheduledTime && busyTimes.includes(scheduledTime))
    const status = conflict
      ? `bentrok ${scheduledTime}`
      : `${itemAvailability?.schedule_count ?? 0} jadwal hari ini`

    return {
      value: String(surveyor.id),
      label: `${surveyor.name} - ${status}`,
    }
  })

  const setScheduleDate = (date: string) => {
    setScheduledDate(date)
    if (!scheduledTime) setScheduledTime('09:00')
  }

  const submit = () => {
    if (!surveyorId) {
      toast.error('Pilih surveyor terlebih dahulu.')
      return
    }

    const finalDate = scheduledDate || requestedSchedule?.date || ''
    const finalTime = scheduledTime || requestedSchedule?.time || '09:00'
    const scheduledAt = combineLocalDateTime(finalDate, finalTime)

    if (!scheduledAt) {
      toast.error('Tanggal survey belum dipilih.')
      return
    }
    if (hasTimeConflict) {
      toast.error('Surveyor sudah memiliki jadwal pada jam tersebut.')
      return
    }

    const mutation = isReschedule ? rescheduleMutation : assignMutation
    mutation.mutate(
      {
        surveyor_id: Number(surveyorId),
        scheduled_at: scheduledAt,
        location_notes: locationNotes || undefined,
        ...(isReschedule ? { manager_notes: managerNotes || undefined } : {}),
      },
      {
        onSuccess: () => {
          toast.success(isReschedule ? 'Jadwal survey berhasil diperbarui.' : 'Surveyor dan jadwal berhasil ditetapkan.')
          onSaved()
        },
        onError: (error: unknown) => {
          toast.error(getErrorMessage(error, 'Gagal menyimpan jadwal survey.'))
        },
      }
    )
  }

  const isPending = assignMutation.isPending || rescheduleMutation.isPending
  const recommendationUnavailable = isSuggestionsError || isAvailabilityError

  return (
    <div className={cn('flex min-h-0 flex-col', surface === 'page' && 'h-full')}>
      <header
        className={cn(
          'flex shrink-0 items-start justify-between gap-4 border-b border-border bg-card px-5 py-4 dark:border-white/10',
          surface === 'page' && 'bg-background px-4'
        )}
      >
        <div className="min-w-0">
          {surface === 'page' && (
            <button
              type="button"
              onClick={onCancel}
              className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
            >
              <ArrowLeft className="size-4" />
              Kembali
            </button>
          )}
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-500/20 dark:text-cyan-300">
              <UserCheck className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg font-bold leading-6 text-foreground">
                {isReschedule ? 'Ubah Jadwal Survey' : 'Jadwalkan Survey'}
              </h1>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {survey.consultation?.client_name || 'Konsumen'} · {survey.consultation?.consultation_id || `Survey #${survey.id}`}
              </p>
            </div>
          </div>
        </div>
        {surface === 'dialog' && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
          >
            <X className="size-4.5" />
          </button>
        )}
      </header>

      <div
        className={cn(
          'min-h-0 space-y-4 px-5 py-4',
          surface === 'page' && 'flex-1 overflow-y-auto overflow-x-hidden bg-background px-4 pb-8'
        )}
      >
        <section aria-labelledby="assignment-recommendation-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="assignment-recommendation-title" className="flex items-center gap-2 text-sm font-bold text-foreground">
                <UsersRound className="size-4 text-cyan-600 dark:text-cyan-400" />
                Rekomendasi surveyor
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                Berdasarkan jadwal, pengalaman wilayah, dan hasil survey.
              </p>
            </div>
            {isSuggestionsFetching && <Loader2 className="mt-0.5 size-4 animate-spin text-cyan-600" />}
          </div>

          {recommendationUnavailable ? (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-[13px] text-amber-800 dark:text-amber-200">
              Rekomendasi belum dapat dimuat. Gunakan daftar semua surveyor.
            </div>
          ) : availableSuggestions.length > 0 ? (
            <div className="mt-3 grid gap-2.5 md:grid-cols-3">
              {availableSuggestions.map((candidate, index) => (
                <CandidateButton
                  key={candidate.surveyor_id}
                  candidate={candidate}
                  survey={survey}
                  selected={surveyorId === String(candidate.surveyor_id)}
                  best={index === 0}
                  scheduledTime={scheduledTime}
                  onSelect={() => {
                    setSurveyorId(String(candidate.surveyor_id))
                    setCalendarOpen(false)
                  }}
                />
              ))}
            </div>
          ) : availabilityDate && !isSuggestionsFetching ? (
            <div className="mt-3 rounded-lg border border-border bg-muted/35 px-3 py-3 text-[13px] text-muted-foreground dark:border-white/10">
              Belum ada kandidat tersedia pada waktu ini. Pilih waktu lain atau lihat semua surveyor.
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-border bg-muted/35 px-3 py-3 text-[13px] text-muted-foreground dark:border-white/10">
              Pilih tanggal dan jam untuk melihat rekomendasi.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-muted-foreground">
              {selectedSurveyor
                ? <>Terpilih: <span className="font-semibold text-foreground">{selectedSurveyor.name}</span></>
                : 'Belum ada surveyor dipilih'}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowAllSurveyors((open) => !open)
                setCalendarOpen(false)
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:border-white/10"
            >
              Lihat semua surveyor
              <ChevronDown className={cn('size-4 transition-transform', showAllSurveyors && 'rotate-180')} />
            </button>
          </div>

          {(showAllSurveyors || recommendationUnavailable) && (
            <div className="mt-2" onPointerDown={() => setCalendarOpen(false)}>
              <Label className="sr-only">Semua surveyor</Label>
              <CustomSelect
                value={surveyorId}
                onChange={setSurveyorId}
                options={surveyorOptions}
                placeholder={isSurveyorsLoading ? 'Memuat surveyor...' : 'Pilih surveyor'}
                disabled={isSurveyorsLoading}
                className="h-11 rounded-lg border-border bg-background px-3 text-sm dark:border-white/10"
              />
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Tanggal survey</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                type="button"
                className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-left text-sm font-semibold text-foreground outline-none transition-colors hover:border-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500/25 dark:border-white/10"
              >
                {formatDateLabel(scheduledDate)}
                <CalendarIcon className="size-4 text-cyan-600 dark:text-cyan-400" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                  side="bottom"
                  sideOffset={8}
                  collisionAvoidance={{ side: 'flip', align: 'shift' }}
                  collisionPadding={
                    surface === 'page'
                      ? { top: 12, right: 12, bottom: 96, left: 12 }
                      : 12
                  }
                  className="z-[70] w-auto border border-border bg-popover p-0 shadow-xl dark:border-white/10"
                >
                <Calendar
                  mode="single"
                  selected={scheduledDate ? new Date(`${scheduledDate}T00:00:00`) : undefined}
                  disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                  onSelect={(picked) => {
                    if (!picked) return
                    const year = picked.getFullYear()
                    const month = String(picked.getMonth() + 1).padStart(2, '0')
                    const day = String(picked.getDate()).padStart(2, '0')
                    setScheduleDate(`${year}-${month}-${day}`)
                    setCalendarOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5" onPointerDown={() => setCalendarOpen(false)}>
            <Label className="text-xs font-semibold text-muted-foreground">Jam</Label>
            <TimeSearchSelect
              value={scheduledTime}
              onChange={setScheduledTime}
              options={SURVEY_TIME_OPTIONS}
              placeholder="09:00 WIB"
              className="h-11 rounded-lg text-sm"
            />
          </div>
        </section>

        {selectedAvailability && (
          <section
            className={cn(
              'rounded-lg border px-3 py-2.5',
              hasTimeConflict
                ? 'border-rose-500/30 bg-rose-500/[0.07]'
                : 'border-emerald-500/25 bg-emerald-500/[0.06]'
            )}
          >
            <p
              className={cn(
                'flex items-center gap-2 text-[13px] font-bold',
                hasTimeConflict
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              )}
            >
              {hasTimeConflict
                ? <AlertTriangle className="size-4" />
                : <CheckCircle2 className="size-4" />}
              {hasTimeConflict ? `Bentrok pada ${scheduledTime} WIB` : 'Jadwal tersedia'}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
              {selectedBusyTimes.length > 0
                ? `Jadwal lain hari ini: ${selectedBusyTimes.join(', ')} WIB.`
                : 'Surveyor belum memiliki jadwal lain pada tanggal ini.'}
            </p>
            {hasTimeConflict && (
              <p className="mt-1 text-[13px] font-semibold text-rose-700 dark:text-rose-300">
                Pilih jam lain atau gunakan salah satu rekomendasi yang tersedia.
              </p>
            )}
          </section>
        )}

        <section className={cn('grid gap-3', isReschedule && 'md:grid-cols-2')}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Catatan lokasi (opsional)</Label>
            <Textarea
              value={locationNotes}
              onChange={(event) => setLocationNotes(event.target.value)}
              placeholder="Patokan lokasi, akses, atau jam temu klien"
              className="min-h-20 rounded-lg border-border bg-background text-sm placeholder:text-muted-foreground/70 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20 dark:border-white/10"
            />
          </div>
          {isReschedule && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Alasan perubahan (opsional)</Label>
              <Textarea
                value={managerNotes}
                onChange={(event) => setManagerNotes(event.target.value)}
                placeholder="Alasan perubahan jadwal untuk surveyor"
                className="min-h-20 rounded-lg border-border bg-background text-sm placeholder:text-muted-foreground/70 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20 dark:border-white/10"
              />
            </div>
          )}
        </section>
      </div>

      <footer
        className={cn(
          'flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-5 py-3 dark:border-white/10',
          surface === 'page' && 'bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]'
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="h-10 rounded-lg px-4 text-sm font-semibold max-sm:hidden"
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={isPending || !surveyorId || hasTimeConflict}
          className="h-10 rounded-lg bg-cyan-500 px-5 text-sm font-bold text-slate-950 hover:bg-cyan-400 max-sm:w-full"
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isReschedule ? 'Simpan Perubahan' : 'Tetapkan Surveyor'}
        </Button>
      </footer>
    </div>
  )
}

export function SurveyAssignmentDialog({
  survey,
  onClose,
}: {
  survey: Survey
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(calc(100vw-2rem),880px)] !max-w-[880px] gap-0 overflow-visible border-border bg-card p-0 text-card-foreground shadow-2xl dark:border-white/10"
      >
        <SurveyAssignmentForm
          survey={survey}
          surface="dialog"
          onCancel={onClose}
          onSaved={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
