'use client'

import { useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  MapPin,
  Phone,
  Clock,
  CalendarClock,
  UserCheck,
  ClipboardCheck,
  Loader2,
  Inbox,
  Home,
  Package,
  RotateCcw,
  History,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { isAdmin, isManagerSurveyor, isSurveyor as isSurveyorRole } from '@/lib/auth/roles'
import {
  useSurveys,
  useSurveyors,
  useSurveyStatuses,
  useAssignSurvey,
  useRescheduleAssignment,
  useRescheduleSurvey,
  useStartSurvey,
  useSubmitSurveyResult,
  useSurveyHistory,
  useSurveyorAvailability,
} from '@/lib/hooks/useSurveys'
import type { Survey, SurveyActivity, SurveyState } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CustomSelect } from '@/components/ui/custom-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn, rawPhoneDigits } from '@/lib/utils'

// â”€â”€ State metadata (istilah user: Request Survey / Masuk Survey) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATE_META: Record<SurveyState, { label: string; color: string }> = {
  requested: { label: 'Request Survey', color: '#f59e0b' },
  scheduled: { label: 'Masuk Survey', color: '#3b82f6' },
  in_progress: { label: 'Sedang Survey', color: '#8b5cf6' },
  completed: { label: 'Selesai', color: '#10b981' },
  cancelled: { label: 'Dibatalkan', color: '#71717a' },
}

function StateChip({ state }: { state: SurveyState }) {
  const meta = STATE_META[state]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  )
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function locationLine(s: Survey): string {
  const c = s.consultation
  if (!c) return '-'
  return [c.district, c.city, c.province].filter(Boolean).join(', ') || c.address || '-'
}

export default function SurveysView() {
  const user = useAuthStore((s) => s.user)
  const surveyorMode = isSurveyorRole(user)
  const adminMode = isAdmin(user)
  const managerMode = isManagerSurveyor(user) || user?.role === 'super_admin'

  // Tabs: surveyor hanya scheduled/completed; manager & super lihat semua.
  const tabs: { key: SurveyState; label: string; mobileLabel: string }[] = surveyorMode
    ? [
        { key: 'scheduled', label: 'Terjadwal', mobileLabel: 'Terjadwal' },
        { key: 'in_progress', label: 'Sedang Survey', mobileLabel: 'Berlangsung' },
        { key: 'completed', label: 'Selesai', mobileLabel: 'Selesai' },
      ]
      : adminMode
      ? [
          { key: 'requested', label: 'Pengajuan Saya', mobileLabel: 'Request' },
          { key: 'scheduled', label: 'Menunggu Survey', mobileLabel: 'Terjadwal' },
          { key: 'in_progress', label: 'Sedang Survey', mobileLabel: 'Berlangsung' },
          { key: 'completed', label: 'Selesai', mobileLabel: 'Selesai' },
        ]
      : [
        { key: 'requested', label: 'Request Survey', mobileLabel: 'Request' },
        { key: 'scheduled', label: 'Terjadwal', mobileLabel: 'Terjadwal' },
        { key: 'in_progress', label: 'Sedang Survey', mobileLabel: 'Berlangsung' },
        { key: 'completed', label: 'Selesai', mobileLabel: 'Selesai' },
      ]

  const [activeTab, setActiveTab] = useState<SurveyState>(tabs[0].key)

  const { data, isLoading, isFetching } = useSurveys({ state: activeTab, per_page: 50 })
  const surveys = data?.data ?? []

  // Dialog state
  const [assignTarget, setAssignTarget] = useState<Survey | null>(null)
  const [adminRescheduleTarget, setAdminRescheduleTarget] = useState<Survey | null>(null)
  const [resultTarget, setResultTarget] = useState<Survey | null>(null)
  const [historyTarget, setHistoryTarget] = useState<Survey | null>(null)

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 sm:h-9 sm:w-9 sm:rounded-xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-foreground sm:text-xl">Survey Lokasi</h1>
            <p className="text-[11px] leading-relaxed text-muted-foreground/70 sm:text-xs">
              {surveyorMode
                ? 'Jadwal survey yang ditugaskan kepada Anda & pengisian hasil.'
                : 'Antrian pengajuan survey, penjadwalan surveyor, dan hasil survey.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid w-full grid-cols-[repeat(var(--tab-count),minmax(0,1fr))] rounded-xl border border-border bg-card p-1 dark:border-zinc-800 dark:bg-zinc-900/40" style={{ '--tab-count': tabs.length } as CSSProperties}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative min-w-0 rounded-lg px-1 py-2 text-[10px] font-semibold transition-colors sm:px-3.5 sm:py-1.5 sm:text-xs',
                active ? 'text-zinc-950' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="survey-tab-pill"
                  className="absolute inset-0 rounded-lg bg-amber-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 truncate sm:hidden">{tab.mobileLabel}</span>
              <span className="relative z-10 hidden truncate sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl bg-muted" />
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <EmptyState state={activeTab} surveyorMode={surveyorMode} />
      ) : (
        <div className={cn('grid gap-3 transition-opacity', isFetching && 'opacity-60')}>
          {surveys.map((survey, idx) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              index={idx}
              surveyorMode={surveyorMode}
              managerMode={managerMode}
              adminMode={adminMode}
              onAssign={() => setAssignTarget(survey)}
              onAdminReschedule={() => setAdminRescheduleTarget(survey)}
              onResult={() => setResultTarget(survey)}
              onHistory={() => setHistoryTarget(survey)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {assignTarget && (
        <AssignDialog survey={assignTarget} onClose={() => setAssignTarget(null)} />
      )}
      {adminRescheduleTarget && (
        <AdminRescheduleDialog survey={adminRescheduleTarget} onClose={() => setAdminRescheduleTarget(null)} />
      )}
      {resultTarget && (
        <ResultDialog survey={resultTarget} onClose={() => setResultTarget(null)} />
      )}
      {historyTarget && (
        <SurveyHistoryDialog survey={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
    </div>
  )
}

// â”€â”€ Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SurveyCard({
  survey,
  index,
  surveyorMode,
  managerMode,
  adminMode,
  onAssign,
  onAdminReschedule,
  onResult,
  onHistory,
}: {
  survey: Survey
  index: number
  surveyorMode: boolean
  managerMode: boolean
  adminMode: boolean
  onAssign: () => void
  onAdminReschedule: () => void
  onResult: () => void
  onHistory: () => void
}) {
  const c = survey.consultation
  const phone = c?.phone ? rawPhoneDigits(c.phone) : ''
  const startMutation = useStartSurvey(survey.id)

  const startSurvey = () => {
    startMutation.mutate(undefined, {
      onSuccess: () => toast.success('Survey dimulai. Waktu aktual sudah dicatat.'),
      onError: (err: any) => toast.error(err.message || 'Gagal memulai survey'),
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
    >
      <Card className="border-border bg-card shadow-sm transition-colors hover:border-amber-500/30 dark:border-zinc-800 dark:bg-zinc-900/40">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-bold text-foreground">
                  {c?.client_name ?? 'Lead'}
                </h3>
                <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground dark:border-zinc-800">
                  {c?.consultation_id}
                </span>
                <StateChip state={survey.state} />
              </div>

              <div className="grid gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{locationLine(survey)}</span>
                </span>
                {c?.address && (
                  <span className="inline-flex items-start gap-1.5 sm:col-span-2">
                    <Home className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <span>{c.address}</span>
                  </span>
                )}
                {c?.product_details && (
                  <span className="inline-flex items-start gap-1.5 sm:col-span-2">
                    <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <span>{c.product_details}</span>
                  </span>
                )}
                {c?.phone && (
                  <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {c.phone}
                  </a>
                )}
                {survey.state === 'requested' && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    Diajukan {formatDateTime(survey.requested_at)}
                    {survey.requester?.name ? ` - ${survey.requester.name}` : ''}
                  </span>
                )}
                {(survey.state === 'scheduled' || survey.state === 'completed') && (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                      Jadwal {formatDateTime(survey.scheduled_at)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                      {survey.surveyor?.name ?? 'Belum ditentukan'}
                    </span>
                  </>
                )}
                {survey.state === 'completed' && survey.result_status && (
                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 shrink-0" style={{ color: survey.result_status.color }} />
                    Hasil:{' '}
                    <span
                      className="rounded px-1.5 py-0.5 font-semibold"
                      style={{ backgroundColor: `${survey.result_status.color}1f`, color: survey.result_status.color }}
                    >
                      {survey.result_status.name}
                    </span>
                  </span>
                )}
              </div>

              {survey.location_notes && (
                <p className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px] italic text-muted-foreground dark:bg-zinc-950/40">
                  &quot;{survey.location_notes}&quot;
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
              {managerMode && survey.state === 'requested' && (
                <Button
                  size="xs"
                  onClick={onAssign}
                  className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  Jadwalkan
                </Button>
              )}
              {managerMode && survey.state === 'scheduled' && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={onAssign}
                  className="border-border font-semibold dark:border-zinc-700"
                >
                  Ubah Jadwal
                </Button>
              )}
              {adminMode && (survey.state === 'requested' || survey.state === 'scheduled') && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={onAdminReschedule}
                  className="border-amber-500/40 font-semibold text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reschedule
                </Button>
              )}
              {surveyorMode && survey.state === 'scheduled' && (
                <Button
                  size="xs"
                  onClick={startSurvey}
                  disabled={startMutation.isPending}
                  className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
                >
                  {startMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Clock className="mr-1.5 h-3.5 w-3.5" />}
                  Mulai Survey
                </Button>
              )}
              {surveyorMode && survey.state === 'in_progress' && (
                <Button
                  size="xs"
                  onClick={onResult}
                  className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
                >
                  <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                  Isi Hasil
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={onHistory}
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                <History className="mr-1.5 h-3.5 w-3.5" />
                Riwayat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function EmptyState({ state, surveyorMode }: { state: SurveyState; surveyorMode: boolean }) {
  const messages: Record<SurveyState, string> = {
    requested: 'Belum ada pengajuan survey yang menunggu penjadwalan.',
    scheduled: surveyorMode
      ? 'Belum ada survey terjadwal untuk Anda.'
      : 'Belum ada survey terjadwal.',
    in_progress: 'Belum ada survey yang sedang berlangsung.',
    completed: 'Belum ada survey yang selesai.',
    cancelled: 'Tidak ada survey dibatalkan.',
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center dark:border-zinc-800">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="max-w-xs text-sm text-muted-foreground/70">{messages[state]}</p>
    </div>
  )
}

// â”€â”€ Assign dialog (manager) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SurveyHistoryDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const { data, isLoading } = useSurveyHistory(survey.id)
  const activities = data?.data ?? []

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Riwayat Survey</DialogTitle>
          <DialogDescription>
            {survey.consultation?.client_name} - {survey.consultation?.consultation_id}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 rounded-xl" />)}
          </div>
        ) : activities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground dark:border-zinc-800">
            Belum ada aktivitas yang tercatat.
          </p>
        ) : (
          <ol className="space-y-0 py-1">
            {activities.map((activity, index) => (
              <SurveyActivityRow
                key={activity.id}
                activity={activity}
                isLast={index === activities.length - 1}
              />
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SurveyActivityRow({ activity, isLast }: { activity: SurveyActivity; isLast: boolean }) {
  const actionLabel: Record<string, string> = {
    status_changed: 'Status diperbarui',
    rescheduled_by_admin: 'Reschedule oleh Admin',
    rescheduled_by_manager: 'Reschedule oleh Manager Surveyor',
  }

  return (
    <li className="relative flex gap-3 pb-4">
      {!isLast && <span className="absolute left-[7px] top-4 h-full w-px bg-border dark:bg-zinc-800" />}
      <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-background bg-amber-500 ring-1 ring-amber-500/40" />
      <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">
            {actionLabel[activity.action] ?? activity.action.replaceAll('_', ' ')}
          </p>
          <time className="text-[10px] text-muted-foreground">{formatDateTime(activity.created_at)}</time>
        </div>
        {(activity.old_status || activity.new_status) && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {activity.old_status ? STATE_META[activity.old_status]?.label ?? activity.old_status : 'Awal'}
            {' -> '}
            {activity.new_status ? STATE_META[activity.new_status]?.label ?? activity.new_status : '-'}
          </p>
        )}
        {activity.notes && <p className="mt-1 text-[11px] text-foreground/75">{activity.notes}</p>}
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          {activity.user?.name ?? 'Sistem'}
        </p>
      </div>
    </li>
  )
}

function AssignDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const { data: surveyorsResp, isLoading } = useSurveyors()
  const surveyors = surveyorsResp?.data ?? []
  const assignMutation = useAssignSurvey(survey.id)
  const rescheduleMutation = useRescheduleAssignment(survey.id)
  const isReschedule = survey.state === 'scheduled'

  const [surveyorId, setSurveyorId] = useState<string>(
    survey.surveyor_id ? String(survey.surveyor_id) : ''
  )
  const [scheduledAt, setScheduledAt] = useState<string>(
    survey.scheduled_at ? toLocalInput(survey.scheduled_at) : ''
  )
  const [locationNotes, setLocationNotes] = useState<string>(survey.location_notes ?? '')
  const [managerNotes, setManagerNotes] = useState<string>('')
  const availabilityDate = scheduledAt ? scheduledAt.slice(0, 10) : undefined
  const { data: availabilityResponse } = useSurveyorAvailability(availabilityDate)
  const availability = new Map(
    (availabilityResponse?.data ?? []).map((item) => [item.id, item])
  )

  const submit = () => {
    if (!surveyorId) return toast.error('Pilih surveyor terlebih dahulu.')
    if (!scheduledAt) return toast.error('Tentukan tanggal & jam survey.')
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
          toast.success('Surveyor & jadwal ditetapkan - status jadi Masuk Survey')
          onClose()
        },
        onError: (err: any) => toast.error(err.message || 'Gagal menjadwalkan survey'),
      }
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isReschedule ? 'Reschedule Survey' : 'Jadwalkan Survey'}</DialogTitle>
          <DialogDescription>
            {survey.consultation?.client_name} - {survey.consultation?.consultation_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Surveyor</Label>
            <CustomSelect
              value={surveyorId}
              onChange={setSurveyorId}
              placeholder={isLoading ? 'Memuat surveyor...' : 'Pilih surveyor'}
              options={surveyors.map((s) => {
                const scheduleCount = availability.get(s.id)?.schedule_count ?? 0
                return {
                  value: String(s.id),
                  label: scheduleCount > 0 ? `${s.name} (${scheduleCount} jadwal)` : s.name,
                }
              })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Tanggal & Jam Survey</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-9 border-border bg-background text-xs focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Catatan Lokasi (opsional)</Label>
            <Textarea
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="Patokan lokasi, akses, jam temu klien..."
              className="min-h-[72px] border-border bg-background text-xs focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          {isReschedule && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Catatan Reschedule (opsional)</Label>
              <Textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Alasan perubahan jadwal untuk surveyor..."
                className="min-h-[72px] border-border bg-background text-xs focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="dark:border-zinc-700">
            Batal
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={assignMutation.isPending || rescheduleMutation.isPending}
            className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
          >
            {assignMutation.isPending || rescheduleMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {isReschedule ? 'Simpan Reschedule' : 'Tetapkan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€ Result dialog (surveyor) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminRescheduleDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const rescheduleMutation = useRescheduleSurvey(survey.id)
  const suggested = survey.requested_date
    ? `${survey.requested_date}T${(survey.requested_time || '09:00').slice(0, 5)}`
    : survey.scheduled_at ? toLocalInput(survey.scheduled_at) : ''
  const [requestedAt, setRequestedAt] = useState(suggested)
  const [notes, setNotes] = useState(survey.admin_notes ?? '')

  const submit = () => {
    if (!requestedAt) return toast.error('Tentukan usulan tanggal dan jam survey.')
    const [requestedDate, requestedTime] = requestedAt.split('T')
    rescheduleMutation.mutate(
      { requested_date: requestedDate, requested_time: requestedTime, admin_notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success('Usulan jadwal dikirim ulang ke Manager Surveyor')
          onClose()
        },
        onError: (err: any) => toast.error(err.message || 'Gagal mengubah usulan jadwal'),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Survey</DialogTitle>
          <DialogDescription>Usulan jadwal baru akan dikirim ke Manager Surveyor untuk divalidasi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Usulan Tanggal & Jam</Label>
            <Input type="datetime-local" value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} className="h-9 border-border bg-background text-xs focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Catatan untuk Manager (opsional)</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alasan perubahan jadwal atau informasi dari klien..." className="min-h-[88px] border-border bg-background text-xs focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="dark:border-zinc-700">Batal</Button>
          <Button size="sm" onClick={submit} disabled={rescheduleMutation.isPending} className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400">
            {rescheduleMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
            Kirim Reschedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResultDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const { data: statusesResp, isLoading } = useSurveyStatuses()
  const statuses = statusesResp?.data ?? []
  const resultMutation = useSubmitSurveyResult(survey.id)

  const [statusId, setStatusId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const submit = () => {
    if (!statusId) return toast.error('Pilih status hasil survey.')
    resultMutation.mutate(
      { result_status_id: Number(statusId), result_notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success('Hasil survey tersimpan')
          onClose()
        },
        onError: (err: any) => toast.error(err.message || 'Gagal menyimpan hasil'),
      }
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Isi Hasil Survey</DialogTitle>
          <DialogDescription>
            {survey.consultation?.client_name} - {survey.consultation?.consultation_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Status Hasil</Label>
            <CustomSelect
              value={statusId}
              onChange={setStatusId}
              placeholder={isLoading ? 'Memuat status...' : 'Pilih status (mis. Hold Up Desain)'}
              options={statuses.map((s) => ({ value: String(s.id), label: s.name }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground/70">Catatan Hasil</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ukuran, kondisi lokasi, kebutuhan revisi desain, kesepakatan dengan klien..."
              className="min-h-[110px] border-border bg-background text-xs focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="dark:border-zinc-700">
            Batal
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={resultMutation.isPending}
            className="bg-amber-500 font-semibold text-zinc-950 hover:bg-amber-400"
          >
            {resultMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Simpan Hasil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// datetime string â†’ value for <input type="datetime-local">
function toLocalInput(value: string): string {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
