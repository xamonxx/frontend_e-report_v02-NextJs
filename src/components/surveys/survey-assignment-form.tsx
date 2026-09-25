'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  Loader2,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/stores/authStore'

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
import type { Survey } from '@/types'

type AssignmentSurface = 'dialog' | 'page'

type SurveyAssignmentFormProps = {
  survey: Survey
  surface: AssignmentSurface
  onCancel: () => void
  onSaved: () => void
}

export function SurveyAssignmentForm({
  survey,
  surface,
  onCancel,
  onSaved,
}: SurveyAssignmentFormProps) {
  const { data: surveyorsResponse, isLoading: isSurveyorsLoading } = useSurveyors()
  const surveyors = surveyorsResponse?.data ?? []
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'
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
  const [locationNotes, setLocationNotes] = useState(survey.location_notes ?? '')
  const [managerNotes, setManagerNotes] = useState('')
  const [loanReason, setLoanReason] = useState('')

  const availabilityDate = scheduledDate || undefined
  const excludeSurveyId = isReschedule ? survey.id : undefined
  const { data: availabilityResponse } = useSurveyorAvailability(availabilityDate, excludeSurveyId)

  const availabilityItems = useMemo(
    () => availabilityResponse?.data ?? [],
    [availabilityResponse?.data]
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
  const surveyorHasConflict = (id: number) => {
    const busyTimes = (availabilityMap.get(id)?.schedules ?? [])
      .map((schedule) => scheduledTimeLabel(schedule))
      .filter(Boolean)
    return Boolean(scheduledTime && busyTimes.includes(scheduledTime))
  }

  const sortedSurveyors = [...surveyors].sort((first, second) => {
    const firstConflict = surveyorHasConflict(first.id)
    const secondConflict = surveyorHasConflict(second.id)
    if (firstConflict !== secondConflict) return firstConflict ? 1 : -1

    const firstLoad = availabilityMap.get(first.id)?.schedule_count ?? 0
    const secondLoad = availabilityMap.get(second.id)?.schedule_count ?? 0
    return firstLoad - secondLoad || first.name.localeCompare(second.name)
  })

  const surveyorOptions = sortedSurveyors.map((surveyor) => {
    // Tim kosong sengaja tidak menampilkan status jadwal - ini kondisi setup
    // yang belum lengkap (survey_team belum diatur di Kelola Master Data),
    // bukan sesuatu yang wajar ditutupi dengan angka jadwal seolah normal.
    if (!surveyor.survey_team) {
      return {
        value: String(surveyor.id),
        label: `${surveyor.name} — tim belum ditetapkan`,
      }
    }

    const itemAvailability = availabilityMap.get(surveyor.id)
    const busyTimes = Array.from(new Set(
      (itemAvailability?.schedules ?? [])
        .map((schedule) => scheduledTimeLabel(schedule))
        .filter(Boolean)
    ))
    const conflict = Boolean(scheduledTime && busyTimes.includes(scheduledTime))
    // "pada tanggal dipilih", bukan "hari ini" - availability selalu dihitung
    // dari scheduledDate yang sedang difilter, yang bisa saja bukan hari ini.
    const status = conflict
      ? `bentrok ${scheduledTime} WIB`
      : `${itemAvailability?.schedule_count ?? 0} jadwal pada tanggal dipilih`

    return {
      value: String(surveyor.id),
      label: `${surveyor.name} (${surveyor.survey_team}) — ${status}`,
    }
  })

  const setScheduleDate = (date: string) => {
    setScheduledDate(date)
    if (!scheduledTime) setScheduledTime('09:00')
  }

  // Team F sudah boleh pinjam surveyor tim mana pun tanpa syarat tambahan
  // (lihat SurveyController::BORROWABLE_TEAM) - alasan pinjaman cuma perlu
  // buat tim lain (A-E), dan cuma Super Admin yang bisa membuatnya (backend
  // menolak manager biasa). accountTeam pakai survey.account (account_group
  // SAAT INI) - sumber yang sama persis dipakai eligibility check backend,
  // BUKAN consultation.account_group yang cuma snapshot saat konsul dibuat.
  const selectedSurveyor = surveyorId
    ? surveyors.find((item) => String(item.id) === surveyorId)
    : undefined
  const accountTeam = survey.account?.account_group
  const needsLoanReason = Boolean(
    isSuperAdmin
    && selectedSurveyor?.survey_team
    && accountTeam
    && accountTeam !== 'F'
    && selectedSurveyor.survey_team !== accountTeam
  )

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
    if (needsLoanReason && !loanReason.trim()) {
      toast.error('Isi alasan pinjaman surveyor lintas tim (wajib untuk persetujuan).')
      return
    }

    const mutation = isReschedule ? rescheduleMutation : assignMutation
    mutation.mutate(
      {
        surveyor_id: Number(surveyorId),
        scheduled_at: scheduledAt,
        location_notes: locationNotes || undefined,
        ...(isReschedule ? { manager_notes: managerNotes || undefined } : {}),
        ...(needsLoanReason ? { loan_reason: loanReason.trim() } : {}),
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
        <section className="space-y-1.5" onPointerDown={() => setCalendarOpen(false)}>
          <Label className="text-xs font-semibold text-muted-foreground">Surveyor</Label>
          <CustomSelect
            value={surveyorId}
            onChange={setSurveyorId}
            options={surveyorOptions}
            placeholder={isSurveyorsLoading ? 'Memuat surveyor...' : 'Pilih surveyor'}
            disabled={isSurveyorsLoading}
            className="h-11 rounded-lg border-border bg-background px-3 text-sm dark:border-white/10"
          />
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
                Pilih jam lain atau surveyor lain yang tidak bentrok.
              </p>
            )}
          </section>
        )}

        {needsLoanReason && (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
            <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Alasan pinjaman surveyor lintas tim (wajib)
            </Label>
            <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
              {selectedSurveyor?.name} dari Team {selectedSurveyor?.survey_team} akan ditugaskan ke akun Team {accountTeam}. Ini tercatat sebagai persetujuan Super Admin dan tersimpan di riwayat survey.
            </p>
            <Textarea
              value={loanReason}
              onChange={(event) => setLoanReason(event.target.value)}
              placeholder="Mis. Team ini kekurangan surveyor minggu ini"
              className="mt-2 min-h-16 rounded-lg border-amber-500/30 bg-background text-sm placeholder:text-muted-foreground/70 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
            />
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
          disabled={isPending || !surveyorId || hasTimeConflict || (needsLoanReason && !loanReason.trim())}
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
