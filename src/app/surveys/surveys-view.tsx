'use client'

import { useState, useMemo } from 'react'
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
  Home,
  Package,
  RotateCcw,
  History,
  XCircle,
  FileText,
  Calendar as CalendarIcon,
  ChevronRight,
  CheckCircle2,
  Timer,
  BarChart3,
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimeSearchSelect } from '@/components/ui/time-search-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn, rawPhoneDigits } from '@/lib/utils'

// ── State metadata ─────────────────────────────────────────────
const STATE_META: Record<SurveyState, { label: string; color: string; icon: typeof Clock }> = {
  requested:   { label: 'Request Survey',   color: '#f59e0b', icon: FileText },
  scheduled:   { label: 'Terjadwal',        color: '#3b82f6', icon: CalendarIcon },
  in_progress: { label: 'Sedang Survey',    color: '#8b5cf6', icon: Timer },
  completed:   { label: 'Selesai',          color: '#10b981', icon: CheckCircle2 },
  cancelled:   { label: 'Dibatalkan',        color: '#71717a', icon: XCircle },
}

const SURVEY_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`
  return { value, label: `${value} WIB` }
})

function combineLocalDateTime(date: string, time: string): string {
  return date && time ? `${date}T${time}` : ''
}

function formatDateLabel(value: string): string {
  if (!value) return 'Pilih tanggal'
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function StateChip({ state, size = 'sm' }: { state: SurveyState; size?: 'sm' | 'md' }) {
  const meta = STATE_META[state]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide',
        size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'
      )}
      style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
    >
      <Icon className={size === 'md' ? 'size-3.5' : 'size-3'} />
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

function formatDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function locationLine(s: Survey): string {
  const c = s.consultation
  if (!c) return '-'
  return [c.district, c.city, c.province].filter(Boolean).join(', ') || c.address || '-'
}

function InfoRow({ icon, label, value }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  const Icon = icon
  return (
    <span className="flex w-full min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
      {label ? <span className="text-muted-foreground/60 shrink-0">{label}</span> : null}
      <span className="block min-w-0 flex-1 truncate text-foreground/80">{value}</span>
    </span>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────
export default function SurveysView() {
  const user = useAuthStore((s) => s.user)
  const surveyorMode = isSurveyorRole(user)
  const adminMode = isAdmin(user)
  const managerMode = isManagerSurveyor(user) || user?.role === 'super_admin'

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

  const [assignTarget, setAssignTarget] = useState<Survey | null>(null)
  const [adminRescheduleTarget, setAdminRescheduleTarget] = useState<Survey | null>(null)
  const [resultTarget, setResultTarget] = useState<Survey | null>(null)
  const [historyTarget, setHistoryTarget] = useState<Survey | null>(null)
  const tabMeta = useMemo(() => STATE_META[activeTab], [activeTab])

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-card to-amber-500/5 px-4 py-4 shadow-sm sm:px-6 sm:py-5 dark:from-zinc-950 dark:via-zinc-900 dark:to-amber-950/10">
        <div className="absolute -right-12 -top-12 size-40 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Survey Lokasi
              </h1>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/70">
                {surveyorMode
                  ? 'Jadwal survey yang ditugaskan & pengisian hasil.'
                  : 'Antrian pengajuan, penjadwalan surveyor, dan hasil survey.'}
              </p>
            </div>
          </div>

          {!isLoading && surveys.length > 0 && (
            <div className="flex w-fit shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2.5 dark:bg-zinc-950/50">
              <BarChart3 className="size-3.5 shrink-0 text-muted-foreground/60 sm:size-4" />
              <span className="text-xs font-bold text-foreground sm:text-sm">{surveys.length}</span>
              <span className="hidden text-xs text-muted-foreground/60 xs:inline sm:inline">survey</span>
              <span className="mx-1 h-4 w-px bg-border sm:mx-1.5" />
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold sm:gap-1.5 sm:text-xs"
                style={{ color: tabMeta.color }}
              >
                <tabMeta.icon className="size-3 sm:size-3.5" />
                <span className="hidden xs:inline">{tabMeta.label}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────── */}
      <nav
        aria-label="Status survey"
        className="mx-auto grid w-full max-w-4xl min-w-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--primary-theme)_22%,var(--border))] bg-[color-mix(in_srgb,var(--card)_94%,var(--primary-theme)_6%)] p-1.5 shadow-[0_12px_32px_-24px_rgba(2,8,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = tab.key === activeTab
          const meta = STATE_META[tab.key]
          const Icon = meta.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={active}
              className={cn(
                'relative flex min-w-0 items-center justify-center rounded-lg px-1.5 py-2.5 text-[10px] font-semibold outline-none transition-[background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--primary-theme)] focus-visible:ring-offset-1 focus-visible:ring-offset-card sm:px-3 sm:text-xs',
                active
                  ? 'text-[var(--primary-theme-foreground)]'
                  : 'text-muted-foreground hover:bg-background/45 hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="survey-tab-pill"
                  className="absolute inset-0 rounded-lg bg-[var(--primary-theme)] shadow-[0_8px_20px_-12px_var(--primary-theme)]"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
              <span className="relative z-10 flex min-w-0 items-center justify-center gap-1 sm:gap-1.5">
                <Icon className={cn('size-3 shrink-0 sm:size-3.5', active ? 'text-[var(--primary-theme-foreground)]' : 'text-muted-foreground/60')} />
                <span className="min-w-0 truncate sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden min-w-0 truncate sm:inline">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── LIST ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <EmptyState state={activeTab} surveyorMode={surveyorMode} />
      ) : (
        <div
          className={cn(
            'grid min-w-0 grid-cols-1 gap-3 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4',
            isFetching && 'pointer-events-none opacity-60'
          )}
        >
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
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

      {/* ── DIALOGS ──────────────────────────────────────────── */}
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

// ── SURVEY CARD ────────────────────────────────────────────────
function SurveyCard({
  survey,
  surveyorMode,
  managerMode,
  adminMode,
  onAssign,
  onAdminReschedule,
  onResult,
  onHistory,
}: {
  survey: Survey
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
    <div className="min-w-0">
      <Card className="group relative h-full min-w-0 overflow-hidden border-border/70 bg-card shadow-xs transition-[border-color,background-color] duration-200 hover:border-amber-500/25 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-amber-500/20">
        {/* Top accent bar */}
        <div
          className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-70 transition-opacity group-hover:opacity-100 sm:h-1"
          style={{ backgroundColor: STATE_META[survey.state].color }}
        />

        <CardContent className="flex h-full flex-col gap-2 p-3 pt-4 sm:p-4 sm:pt-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="truncate text-sm font-bold text-foreground">
                  {c?.client_name ?? 'Lead'}
                </h3>
                <span className="shrink-0 rounded border border-border/60 px-1 py-0.5 font-mono text-[10px] text-muted-foreground dark:border-zinc-700">
                  {c?.consultation_id}
                </span>
              </div>
            </div>
            <StateChip state={survey.state} />
          </div>

          {/* Detail rows */}
          <div className="min-w-0 flex-1 space-y-1">
            <InfoRow icon={MapPin} label="" value={locationLine(survey)} />
            {c?.address && <InfoRow icon={Home} label="" value={c.address} />}
            {c?.product_details && <InfoRow icon={Package} label="" value={c.product_details} />}

            {c?.phone && (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-xs text-emerald-600 hover:underline dark:text-emerald-400"
              >
                <Phone className="size-3.5 shrink-0 text-emerald-500/60" />
                <span className="truncate">{c.phone}</span>
              </a>
            )}

            {/* Status-specific meta */}
            {survey.state === 'requested' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground/50" />
                  {formatDateTime(survey.requested_at)}
                </span>
                {survey.requester?.name && (
                  <span>oleh {survey.requester.name}</span>
                )}
              </div>
            )}

            {(survey.state === 'scheduled' || survey.state === 'in_progress') && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-blue-500">
                  <CalendarClock className="size-3" />
                  {formatDateTime(survey.scheduled_at)}
                </span>
                {survey.surveyor?.name && (
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="size-3 text-muted-foreground/50" />
                    {survey.surveyor.name}
                  </span>
                )}
              </div>
            )}

            {survey.state === 'completed' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {survey.scheduled_at && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3 text-blue-500/60" />
                    {formatDate(survey.scheduled_at)}
                  </span>
                )}
                {survey.surveyor?.name && (
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="size-3 text-muted-foreground/50" />
                    {survey.surveyor.name}
                  </span>
                )}
                {survey.result_status && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${survey.result_status.color}18`, color: survey.result_status.color }}
                  >
                    {survey.result_status.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Location notes */}
          {survey.location_notes && (
            <p className="mt-2 truncate rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] italic text-muted-foreground dark:bg-zinc-950/40">
              &ldquo;{survey.location_notes}&rdquo;
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3 dark:border-zinc-800/40">
            {managerMode && survey.state === 'requested' && (
              <ActionButton icon={UserCheck} label="Jadwalkan" onClick={onAssign} primary />
            )}
            {managerMode && survey.state === 'scheduled' && (
              <ActionButton icon={CalendarIcon} label="Ubah Jadwal" onClick={onAssign} />
            )}
            {adminMode && (survey.state === 'requested' || survey.state === 'scheduled') && (
              <ActionButton icon={RotateCcw} label="Reschedule" onClick={onAdminReschedule} warning />
            )}
            {surveyorMode && survey.state === 'scheduled' && (
              <ActionButton
                icon={Timer}
                label={startMutation.isPending ? 'Memulai...' : 'Mulai Survey'}
                onClick={startSurvey}
                disabled={startMutation.isPending}
                primary
              />
            )}
            {surveyorMode && survey.state === 'in_progress' && (
              <ActionButton icon={ClipboardCheck} label="Isi Hasil" onClick={onResult} primary />
            )}
            <ActionButton icon={History} label="Riwayat" onClick={onHistory} subtle />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary,
  warning,
  subtle,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  warning?: boolean
  subtle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 active:translate-y-px',
        primary &&
          'bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50',
        warning &&
          'border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400',
        subtle &&
          'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        !primary && !warning && !subtle &&
          'border border-border/70 text-foreground/80 hover:bg-muted/60 dark:border-zinc-700'
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

// ── EMPTY STATE ────────────────────────────────────────────────
function EmptyState({ state, surveyorMode }: { state: SurveyState; surveyorMode: boolean }) {
  const meta = STATE_META[state]
  const Icon = meta.icon
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 py-20 text-center dark:border-zinc-800"
    >
      <span
        className="flex size-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
      >
        <Icon className="size-7" />
      </span>
      <p className="max-w-xs text-sm font-medium text-muted-foreground/70">
        {messages[state]}
      </p>
    </motion.div>
  )
}

// ── SURVEY HISTORY DIALOG ──────────────────────────────────────
function SurveyHistoryDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const { data, isLoading } = useSurveyHistory(survey.id)
  const activities = data?.data ?? []

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4 text-amber-500" />
            Riwayat Survey
          </DialogTitle>
          <DialogDescription>
            {survey.consultation?.client_name} &middot; {survey.consultation?.consultation_id}
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
            <ChevronRight className="mx-1 inline size-3 align-middle text-muted-foreground/40" />
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

// ── ASSIGN DIALOG ──────────────────────────────────────────────
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
  const [scheduledDate, setScheduledDate] = useState<string>(() => scheduledAt.slice(0, 10))
  const [scheduledTime, setScheduledTime] = useState<string>(() => scheduledAt.slice(11, 16))
  const [locationNotes, setLocationNotes] = useState<string>(survey.location_notes ?? '')
  const [managerNotes, setManagerNotes] = useState<string>('')
  const availabilityDate = scheduledDate || undefined
  const { data: availabilityResponse } = useSurveyorAvailability(availabilityDate)
  const availability = new Map(
    (availabilityResponse?.data ?? []).map((item) => [item.id, item])
  )
  const setScheduleDatePart = (date: string) => {
    const nextTime = scheduledTime || '09:00'
    setScheduledDate(date)
    setScheduledTime(nextTime)
    setScheduledAt(combineLocalDateTime(date, nextTime))
  }
  const setScheduleTimePart = (time: string) => {
    setScheduledTime(time)
    setScheduledAt(combineLocalDateTime(scheduledDate, time))
  }

  const submit = () => {
    if (!surveyorId) return toast.error('Pilih surveyor terlebih dahulu.')
    if (!scheduledDate || !scheduledTime) return toast.error('Tentukan tanggal & jam survey.')
    const finalScheduledAt = combineLocalDateTime(scheduledDate, scheduledTime)
    const mutation = isReschedule ? rescheduleMutation : assignMutation
    mutation.mutate(
      {
        surveyor_id: Number(surveyorId),
        scheduled_at: finalScheduledAt,
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
      <DialogContent className="border-slate-700/70 bg-[#131b2e] text-foreground shadow-[0_24px_70px_-40px_rgba(0,188,212,0.5)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <UserCheck className="size-4" />
            </span>
            {isReschedule ? 'Reschedule Survey' : 'Jadwalkan Survey'}
          </DialogTitle>
          <DialogDescription>
            {survey.consultation?.client_name} &middot; {survey.consultation?.consultation_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/80">Surveyor</Label>
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
              className="h-11 w-full rounded-xl border-slate-700/80 bg-slate-950/65 px-3 text-xs font-semibold text-foreground hover:border-cyan-500/35 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_128px]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/80">Tanggal Survey</Label>
              <Popover>
                <PopoverTrigger
                  type="button"
                  className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/65 px-3 text-left text-xs font-semibold text-foreground/90 outline-none transition-colors hover:border-cyan-500/35 hover:bg-slate-950/80 focus-visible:ring-2 focus-visible:ring-cyan-500/25"
                >
                  {formatDateLabel(scheduledDate)}
                  <CalendarIcon className="size-4 text-cyan-400/80" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto border-slate-700/80 bg-slate-950 p-0 text-foreground shadow-2xl">
                  <CalendarComponent
                    mode="single"
                    selected={scheduledDate ? new Date(`${scheduledDate}T00:00:00`) : undefined}
                    disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                    onSelect={(picked) => {
                      if (!picked) return
                      const yyyy = picked.getFullYear()
                      const mm = String(picked.getMonth() + 1).padStart(2, '0')
                      const dd = String(picked.getDate()).padStart(2, '0')
                      setScheduleDatePart(`${yyyy}-${mm}-${dd}`)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/80">Jam</Label>
              <TimeSearchSelect
                value={scheduledTime}
                onChange={setScheduleTimePart}
                options={SURVEY_TIME_OPTIONS}
                placeholder="09:00 WIB"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/80">Catatan Lokasi (opsional)</Label>
            <Textarea
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="Patokan lokasi, akses, jam temu klien..."
              className="min-h-[72px] rounded-xl border-slate-700/80 bg-slate-950/65 text-xs focus-visible:ring-cyan-500/25"
            />
          </div>

          {isReschedule && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/80">Catatan Reschedule (opsional)</Label>
              <Textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Alasan perubahan jadwal untuk surveyor..."
                className="min-h-[72px] rounded-xl border-slate-700/80 bg-slate-950/65 text-xs focus-visible:ring-cyan-500/25"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-700/80 bg-slate-950/40 hover:bg-slate-800/60">
            Batal
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={assignMutation.isPending || rescheduleMutation.isPending}
            className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            {assignMutation.isPending || rescheduleMutation.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : null}
            {isReschedule ? 'Simpan Reschedule' : 'Tetapkan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── ADMIN RESCHEDULE DIALOG ────────────────────────────────────
function AdminRescheduleDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const rescheduleMutation = useRescheduleSurvey(survey.id)
  const suggested = survey.requested_date
    ? `${survey.requested_date}T${(survey.requested_time || '09:00').slice(0, 5)}`
    : survey.scheduled_at ? toLocalInput(survey.scheduled_at) : ''
  const [requestedDate, setRequestedDate] = useState(() => suggested.slice(0, 10))
  const [requestedTime, setRequestedTime] = useState(() => suggested.slice(11, 16))
  const [notes, setNotes] = useState(survey.admin_notes ?? '')
  const setRequestedDatePart = (date: string) => {
    const nextTime = requestedTime || '09:00'
    setRequestedDate(date)
    setRequestedTime(nextTime)
  }
  const setRequestedTimePart = (time: string) => {
    setRequestedTime(time)
  }

  const submit = () => {
    if (!requestedDate || !requestedTime) return toast.error('Tentukan usulan tanggal dan jam survey.')
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
      <DialogContent className="border-slate-700/70 bg-[#131b2e] text-foreground shadow-[0_24px_70px_-40px_rgba(0,188,212,0.5)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <RotateCcw className="size-4" />
            </span>
            Reschedule Survey
          </DialogTitle>
          <DialogDescription>Usulan jadwal baru akan dikirim ke Manager Surveyor untuk divalidasi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid gap-3 sm:grid-cols-[1fr_128px]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/80">Usulan Tanggal</Label>
              <Popover>
                <PopoverTrigger
                  type="button"
                  className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/65 px-3 text-left text-xs font-semibold text-foreground/90 outline-none transition-colors hover:border-cyan-500/35 hover:bg-slate-950/80 focus-visible:ring-2 focus-visible:ring-cyan-500/25"
                >
                  {formatDateLabel(requestedDate)}
                  <CalendarIcon className="size-4 text-cyan-400/80" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto border-slate-700/80 bg-slate-950 p-0 text-foreground shadow-2xl">
                  <CalendarComponent
                    mode="single"
                    selected={requestedDate ? new Date(`${requestedDate}T00:00:00`) : undefined}
                    disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                    onSelect={(picked) => {
                      if (!picked) return
                      const yyyy = picked.getFullYear()
                      const mm = String(picked.getMonth() + 1).padStart(2, '0')
                      const dd = String(picked.getDate()).padStart(2, '0')
                      setRequestedDatePart(`${yyyy}-${mm}-${dd}`)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/80">Jam</Label>
              <TimeSearchSelect
                value={requestedTime}
                onChange={setRequestedTimePart}
                options={SURVEY_TIME_OPTIONS}
                placeholder="09:00 WIB"
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/80">Catatan untuk Manager (opsional)</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alasan perubahan jadwal atau informasi dari klien..." className="min-h-[88px] rounded-xl border-slate-700/80 bg-slate-950/65 text-xs focus-visible:ring-cyan-500/25" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-700/80 bg-slate-950/40 hover:bg-slate-800/60">Batal</Button>
          <Button size="sm" onClick={submit} disabled={rescheduleMutation.isPending} className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400">
            {rescheduleMutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 size-3.5" />}
            Kirim Reschedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── RESULT DIALOG ──────────────────────────────────────────────
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
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-amber-500" />
            Isi Hasil Survey
          </DialogTitle>
          <DialogDescription>
            {survey.consultation?.client_name} &middot; {survey.consultation?.consultation_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/80">Status Hasil</Label>
            <CustomSelect
              value={statusId}
              onChange={setStatusId}
              placeholder={isLoading ? 'Memuat status...' : 'Pilih status (mis. Hold Up Desain)'}
              options={statuses.map((s) => ({ value: String(s.id), label: s.name }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/80">Catatan Hasil</Label>
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
            {resultMutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            Simpan Hasil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── HELPERS ────────────────────────────────────────────────────
function toLocalInput(value: string): string {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
