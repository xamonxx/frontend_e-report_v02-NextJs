'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDebounce } from 'use-debounce'
import {
  Clock,
  UserCheck,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  History,
  XCircle,
  FileText,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Timer,
  ExternalLink,
  Search,
  X,
  Phone,
  MapPin,
  Building2,
  Tag,
  Eye,
  MessageCircle,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { isAdmin, isManagerSurveyor, isSurveyor as isSurveyorRole } from '@/lib/auth/roles'
import {
  useSurveys,
  useSurveyStatuses,
  useRescheduleSurvey,
  useStartSurvey,
  useSubmitSurveyResult,
  useSurveyHistory,
  useCancelSurvey,
} from '@/lib/hooks/useSurveys'
import type { Survey, SurveyActivity, SurveyState } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSelect } from '@/components/ui/custom-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { TimeSearchSelect } from '@/components/ui/time-search-select'
import { SurveyAssignmentDialog } from '@/components/surveys/survey-assignment-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  formatDateLabel,
  requestedScheduleParts,
  SURVEY_TIME_OPTIONS,
  toLocalInput,
} from '@/lib/survey-scheduling'
import { cn, PENDING_NEEDS_CATEGORY_LABEL, productCategoryNames, rawPhoneDigits } from '@/lib/utils'

// ── State metadata ─────────────────────────────────────────────
const STATE_META: Record<SurveyState, { label: string; color: string; icon: typeof Clock }> = {
  requested:   { label: 'Request Survey',   color: '#f59e0b', icon: FileText },
  scheduled:   { label: 'Terjadwal',        color: '#3b82f6', icon: CalendarIcon },
  in_progress: { label: 'Sedang Survey',    color: '#8b5cf6', icon: Timer },
  completed:   { label: 'Selesai',          color: '#10b981', icon: CheckCircle2 },
  cancelled:   { label: 'Dibatalkan',        color: '#71717a', icon: XCircle },
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isEmptyInfo(value?: string | null): boolean {
  const normalized = (value || '').trim().toLowerCase()
  return !normalized || normalized === '-' || normalized === 'belum konfirmasi'
}

function locationLine(s: Survey): string {
  const c = s.consultation
  if (!c) return '-'
  const area = [c.district, c.city, c.province].filter((item) => !isEmptyInfo(item)).join(', ')
  if (area) return area
  if (!isEmptyInfo(c.address)) return c.address as string
  return '-'
}

function needsCategoryLine(s: Survey): string {
  const categories = needsCategories(s)
  return categories.length ? categories.join(', ') : '-'
}

function needsCategories(s: Survey): string[] {
  const c = s.consultation
  if (!c) return []
  return productCategoryNames(c).filter((name) => {
    const normalized = name.trim().toLowerCase()
    return normalized && normalized !== PENDING_NEEDS_CATEGORY_LABEL.toLowerCase()
  })
}

function compactNeedsLabel(categories: string[]): string {
  if (categories.length === 0) return '-'
  const visible = categories.slice(0, 2)
  const remaining = categories.length - visible.length
  return remaining > 0
    ? `${visible.join(' · ')} · +${remaining} lainnya`
    : visible.join(' · ')
}

function displayValue(value?: string | null): string {
  const normalized = (value || '').trim()
  return normalized ? normalized : '-'
}

function requestedSurveyLabel(s: Survey): string {
  const requested = requestedScheduleParts(s)
  if (!requested) return '-'
  const { date: datePart, time } = requested
  const parsed = new Date(`${datePart}T${time || '00:00'}`)

  if (Number.isNaN(parsed.getTime())) {
    return time ? `Tanggal belum valid, ${time}` : 'Tanggal jadwal belum valid'
  }

  const date = parsed.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return time ? `${date}, ${time}` : date
}

function scheduledSurveyLabel(s: Survey): string {
  return formatDateTime(s.scheduled_at)
}

function primaryScheduleDate(s: Survey): Date | null {
  if (s.state !== 'requested' && s.scheduled_at) {
    const scheduled = new Date(s.scheduled_at)
    return Number.isNaN(scheduled.getTime()) ? null : scheduled
  }

  const requested = requestedScheduleParts(s)
  if (!requested) return null
  const parsed = new Date(`${requested.date}T${requested.time || '00:00'}+07:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function jakartaDateKey(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function primaryScheduleParts(s: Survey): {
  date: string
  time: string
  caption: string
} {
  const date = primaryScheduleDate(s)
  if (!date) {
    return {
      date: 'JADWAL BELUM TERSEDIA',
      time: '--:--',
      caption: s.state === 'requested' ? 'Jadwal diajukan' : 'Jadwal survey',
    }
  }

  return {
    date: new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date).toUpperCase(),
    time: new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date).replace('.', ':'),
    caption: s.state === 'requested' ? 'Jadwal diajukan' : 'Jadwal survey',
  }
}

function scheduleTone(s: Survey): {
  panel: string
  badge: string
  dot: string
} {
  if (s.state === 'completed') {
    return {
      panel: 'border-emerald-500/25 bg-emerald-500/10 dark:border-emerald-400/20 dark:bg-emerald-400/[0.09]',
      badge: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    }
  }

  const schedule = primaryScheduleDate(s)
  if (!schedule) {
    return {
      panel: 'border-slate-300/75 bg-slate-100 dark:border-slate-600/60 dark:bg-slate-800/65',
      badge: 'border-slate-300/80 bg-white/70 text-slate-600 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-300',
      dot: 'bg-slate-400',
    }
  }

  const scheduleKey = jakartaDateKey(schedule)
  const todayKey = jakartaDateKey(new Date())

  if (scheduleKey < todayKey) {
    return {
      panel: 'border-rose-500/25 bg-rose-500/10 dark:border-rose-400/20 dark:bg-rose-400/[0.09]',
      badge: 'border-rose-500/25 bg-rose-500/15 text-rose-700 dark:text-rose-300',
      dot: 'bg-rose-500',
    }
  }

  if (scheduleKey === todayKey) {
    return {
      panel: 'border-amber-500/30 bg-amber-500/12 dark:border-amber-400/25 dark:bg-amber-400/[0.1]',
      badge: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
    }
  }

  return {
    panel: 'border-blue-500/25 bg-blue-500/10 dark:border-blue-400/20 dark:bg-blue-400/[0.09]',
    badge: 'border-blue-500/25 bg-blue-500/15 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  }
}

function DetailLine({ label, value, children }: {
  label: string
  value?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-1 border-b border-border/50 py-3 last:border-b-0 sm:grid-cols-[144px_minmax(0,1fr)] sm:gap-4">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/65">
        {label}
      </span>
      <div className="min-w-0 text-xs font-semibold leading-relaxed text-foreground/90">
        {children ?? value ?? '-'}
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────
export default function SurveysView() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const surveyorMode = isSurveyorRole(user)
  const adminMode = isAdmin(user)
  const managerMode = isManagerSurveyor(user) || user?.role === 'super_admin'

  const tabs: { key: SurveyState; label: string; mobileLabel: string }[] = surveyorMode
    ? [
        { key: 'scheduled', label: 'Terjadwal', mobileLabel: 'Terjadwal' },
        { key: 'in_progress', label: 'Sedang Survey', mobileLabel: 'Berlangsung' },
        { key: 'completed', label: 'Selesai', mobileLabel: 'Selesai' },
        { key: 'cancelled', label: 'Dibatalkan', mobileLabel: 'Batal' },
      ]
      : adminMode
      ? [
          { key: 'requested', label: 'Pengajuan Saya', mobileLabel: 'Request' },
          { key: 'scheduled', label: 'Menunggu Survey', mobileLabel: 'Terjadwal' },
          { key: 'in_progress', label: 'Sedang Survey', mobileLabel: 'Berlangsung' },
          { key: 'completed', label: 'Selesai', mobileLabel: 'Selesai' },
          { key: 'cancelled', label: 'Dibatalkan', mobileLabel: 'Batal' },
        ]
      : [
        { key: 'requested', label: 'Request Survey', mobileLabel: 'Request' },
        { key: 'scheduled', label: 'Terjadwal', mobileLabel: 'Terjadwal' },
        { key: 'in_progress', label: 'Sedang Survey', mobileLabel: 'Berlangsung' },
        { key: 'completed', label: 'Selesai', mobileLabel: 'Selesai' },
        { key: 'cancelled', label: 'Dibatalkan', mobileLabel: 'Batal' },
      ]

  const [activeTab, setActiveTab] = useState<SurveyState>(tabs[0].key)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [sortMode, setSortMode] = useState<'nearest' | 'latest'>('nearest')
  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [activeTab, debouncedSearch, sortMode])

  const { data, isLoading } = useSurveys({
    state: activeTab,
    page,
    per_page: 12,
    search: debouncedSearch.trim() || undefined,
    sort: sortMode,
  })
  const surveys = data?.data ?? []

  const [assignTarget, setAssignTarget] = useState<Survey | null>(null)
  const [adminRescheduleTarget, setAdminRescheduleTarget] = useState<Survey | null>(null)
  const [resultTarget, setResultTarget] = useState<Survey | null>(null)
  const [historyTarget, setHistoryTarget] = useState<Survey | null>(null)
  const [detailTarget, setDetailTarget] = useState<Survey | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Survey | null>(null)
  const openAssignment = (survey: Survey) => {
    if (window.matchMedia('(max-width: 639px)').matches) {
      router.push(`/surveys/${survey.id}/assign`)
      return
    }
    setAssignTarget(survey)
  }
  const sortLabel = activeTab === 'requested'
    ? 'Antrian terlama'
    : activeTab === 'in_progress'
      ? 'Mulai terlama'
      : activeTab === 'completed'
        ? 'Selesai terbaru'
        : 'Jadwal terdekat'
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-1 text-center sm:pt-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Survey Lokasi
        </h1>
        <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground/75 sm:text-sm">
          {surveyorMode
            ? 'Jadwal survey yang ditugaskan & pengisian hasil.'
            : 'Antrian pengajuan, penjadwalan surveyor, dan hasil survey.'}
        </p>
      </div>

      {/* ── TABS ────────────────────────────────────────────── */}
      <nav
        aria-label="Status survey"
        className="mx-auto grid w-full max-w-4xl min-w-0 overflow-hidden rounded-2xl border border-slate-300/70 bg-white p-1.5 shadow-[0_10px_26px_-22px_rgba(15,23,42,0.42),inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-600/55 dark:bg-[#182233] dark:shadow-[0_14px_34px_-24px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.05)]"
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
                'relative isolate flex min-w-0 items-center justify-center overflow-hidden rounded-xl px-1.5 py-2.5 text-[10px] font-semibold outline-none transition-[color,transform] duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--primary-theme)] focus-visible:ring-offset-1 focus-visible:ring-offset-card sm:px-3 sm:text-xs',
                active
                  ? ''
                  : 'text-slate-500 hover:bg-slate-500/8 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/6 dark:hover:text-slate-100'
              )}
            >
              {active && (
                <span
                  className="absolute inset-0 -z-10 overflow-hidden rounded-xl border backdrop-blur-xl"
                  style={{
                    background: `linear-gradient(145deg, color-mix(in srgb, ${meta.color} 18%, var(--card)) 0%, color-mix(in srgb, ${meta.color} 10%, var(--background)) 58%, color-mix(in srgb, ${meta.color} 7%, var(--card)) 100%)`,
                    borderColor: `color-mix(in srgb, ${meta.color} 28%, var(--border))`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.56), inset 0 -10px 18px -18px ${meta.color}, 0 12px 24px -20px ${meta.color}`,
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-1 h-px rounded-full opacity-70"
                    style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${meta.color} 45%, transparent), rgba(255,255,255,0.72), transparent)` }}
                  />
                  <span
                    aria-hidden
                    className="absolute -left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full blur-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}
                  />
                  <span
                    aria-hidden
                    className="absolute -right-5 bottom-0 h-10 w-10 rounded-full blur-xl"
                    style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)` }}
                  />
                </span>
              )}
              <span className="relative z-10 flex min-w-0 items-center justify-center gap-1 sm:gap-1.5">
                <Icon
                  className={cn('size-3 shrink-0 transition-[color,filter,transform] duration-200 sm:size-3.5', !active && 'text-slate-500/75 dark:text-slate-400/75')}
                  style={active ? { color: meta.color, filter: `drop-shadow(0 0 5px ${meta.color}45)`, transform: 'translateY(-1px)' } : undefined}
                />
                <span
                  className="min-w-0 truncate sm:hidden"
                  style={active ? { color: meta.color } : undefined}
                >
                  {tab.mobileLabel}
                </span>
                <span
                  className="hidden min-w-0 truncate sm:inline"
                  style={active ? { color: meta.color } : undefined}
                >
                  {tab.label}
                </span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.45)] sm:flex-row sm:items-center dark:border-slate-700/70 dark:bg-[#151f30]/95">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Cari survey berdasarkan nama, nomor WhatsApp, atau ID konsumen</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari nama, WhatsApp, atau ID..."
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-10 text-sm dark:border-slate-700 dark:bg-slate-950/35"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        {activeTab === 'requested' ? (
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-muted-foreground sm:min-w-40 dark:border-slate-700 dark:bg-slate-950/35">
            <span>{sortLabel}</span>
            <span className="rounded-md bg-background px-2 py-1 text-[10px] font-bold text-foreground">
              {data?.meta.total ?? surveys.length}
            </span>
          </div>
        ) : (
          <CustomSelect
            value={sortMode}
            onChange={(value) => setSortMode(value as 'nearest' | 'latest')}
            options={[
              { value: 'nearest', label: sortLabel },
              { value: 'latest', label: 'Terbaru diperbarui' },
            ]}
            className="h-11 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold sm:w-48 dark:border-slate-700 dark:bg-slate-950/35"
          />
        )}
      </div>

      {/* ── LIST ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[438px] w-full rounded-2xl bg-muted/60 xl:h-[410px]" />
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <EmptyState state={activeTab} surveyorMode={surveyorMode} search={debouncedSearch.trim()} />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-3">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              surveyorMode={surveyorMode}
              managerMode={managerMode}
              adminMode={adminMode}
              onAssign={() => openAssignment(survey)}
              onAdminReschedule={() => setAdminRescheduleTarget(survey)}
              onResult={() => setResultTarget(survey)}
              onHistory={() => setHistoryTarget(survey)}
              onDetail={() => setDetailTarget(survey)}
              onCancel={() => setCancelTarget(survey)}
            />
          ))}
        </div>
      )}

      {/* ── DIALOGS ──────────────────────────────────────────── */}
      {(data?.meta.last_page ?? 1) > 1 && (
        <nav className="mx-auto flex w-full max-w-md items-center justify-between gap-3" aria-label="Halaman daftar survey">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="size-4" />
            Sebelumnya
          </Button>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {data?.meta.current_page ?? page} / {data?.meta.last_page ?? 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= (data?.meta.last_page ?? 1) || isLoading}
            onClick={() => setPage((current) => Math.min(data?.meta.last_page ?? current, current + 1))}
          >
            Berikutnya
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}

      {assignTarget && (
        <SurveyAssignmentDialog survey={assignTarget} onClose={() => setAssignTarget(null)} />
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
      {detailTarget && (
        <SurveyDetailDialog survey={detailTarget} onClose={() => setDetailTarget(null)} />
      )}
      {cancelTarget && (
        <CancelSurveyDialog survey={cancelTarget} onClose={() => setCancelTarget(null)} />
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
  onDetail,
  onCancel,
}: {
  survey: Survey
  surveyorMode: boolean
  managerMode: boolean
  adminMode: boolean
  onAssign: () => void
  onAdminReschedule: () => void
  onResult: () => void
  onHistory: () => void
  onDetail: () => void
  onCancel: () => void
}) {
  const c = survey.consultation
  const phone = c?.phone ? rawPhoneDigits(c.phone) : ''
  const startMutation = useStartSurvey(survey.id)
  const location = locationLine(survey)
  const categories = needsCategories(survey)
  const schedule = primaryScheduleParts(survey)
  const tone = scheduleTone(survey)
  const meta = STATE_META[survey.state]
  const StateIcon = meta.icon
  const clientName = (c?.client_name || '').trim() || 'Tidak ada nama'
  const hasPrimaryAction =
    (managerMode && (survey.state === 'requested' || survey.state === 'scheduled')) ||
    (adminMode && (survey.state === 'requested' || survey.state === 'scheduled')) ||
    (surveyorMode && (survey.state === 'scheduled' || survey.state === 'in_progress'))
  const canCancel = survey.state !== 'completed' && survey.state !== 'cancelled'

  const startSurvey = () => {
    startMutation.mutate(undefined, {
      onSuccess: () => toast.success('Survey dimulai. Waktu aktual sudah dicatat.'),
      onError: (err: any) => toast.error(err.message || 'Gagal memulai survey'),
    })
  }

  return (
    <article className="min-w-0">
      <Card className="group h-full min-w-0 overflow-hidden border-slate-200/85 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.38)] dark:border-slate-700/75 dark:bg-[#172031] dark:shadow-[0_20px_44px_-34px_rgba(0,0,0,0.72)]">
        <CardContent className="flex h-full min-h-[438px] flex-col gap-4 p-4 xl:min-h-[410px] xl:gap-3 xl:p-3">
          <section className={cn('min-h-[88px] rounded-lg border p-3', tone.panel)}>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="truncate text-xs font-semibold text-muted-foreground">
                {schedule.caption}
              </p>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground/75">
                <StateIcon className="size-3.5" style={{ color: meta.color }} />
                {meta.label}
              </span>
            </div>
            <div className="mt-2 flex min-w-0 items-end justify-between gap-3">
              <p className="truncate text-sm font-black leading-5 text-foreground">
                {schedule.date}
              </p>
              <p className="shrink-0 text-xl font-black leading-none tabular-nums text-foreground">
                {schedule.time}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">WIB</span>
              </p>
            </div>
          </section>

          <section className="min-w-0">
            <h2 className="truncate text-base font-black text-foreground xl:text-[15px]" title={clientName}>
              {clientName}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
              {displayValue(c?.consultation_id)}
            </p>
            {c?.phone ? (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Hubungi ${clientName} melalui WhatsApp di ${c.phone}`}
                className="mt-3 flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 xl:mt-2 xl:h-9 dark:text-emerald-300"
              >
                <MessageCircle className="size-4 shrink-0" />
                <span className="truncate">{c.phone}</span>
              </a>
            ) : (
              <div className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground xl:mt-2 xl:h-9">
                <Phone className="size-4" />
                Nomor WhatsApp belum tersedia
              </div>
            )}
            {survey.google_maps_url ? (
              <a
                href={survey.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buka lokasi Google Maps untuk ${clientName}`}
                className="mt-2 flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-500/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 xl:h-9 dark:text-blue-300"
              >
                <MapPin className="size-4 shrink-0" />
                <span className="truncate">Buka Google Maps</span>
                <ExternalLink className="size-3.5 shrink-0 opacity-70" />
              </a>
            ) : (
              <div
                aria-disabled="true"
                className="mt-2 flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground/70 xl:h-9"
              >
                <MapPin className="size-4" />
                Google Maps belum tersedia
              </div>
            )}
          </section>

          <section className="space-y-2.5 border-t border-border/60 pt-3 xl:space-y-2 xl:pt-2.5">
            <div className="flex min-h-10 min-w-0 items-start gap-2.5 xl:min-h-9">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-foreground/80">
                {location}
              </p>
            </div>
            <div className="flex min-h-9 min-w-0 items-start gap-2.5 xl:min-h-8">
              <Tag className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-foreground/80">
                {compactNeedsLabel(categories)}
              </p>
            </div>
          </section>

          <div className="mt-auto space-y-2 border-t border-border/60 pt-3 xl:pt-2.5">
            {hasPrimaryAction && (
              <div className="w-full">
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
              </div>
            )}
            <div className={cn('grid gap-2', canCancel ? 'grid-cols-3' : 'grid-cols-2')}>
              <ActionButton icon={Eye} label="Lihat Detail" onClick={onDetail} subtle />
              <ActionButton icon={History} label="Riwayat" onClick={onHistory} subtle />
              {canCancel && (
                <ActionButton icon={XCircle} label="Batal" onClick={onCancel} danger />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
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
  danger,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  warning?: boolean
  subtle?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-xs font-bold transition-all duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none sm:gap-2 sm:px-3 xl:h-9',
        primary &&
          'bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50',
        warning &&
          'border border-amber-500/35 bg-amber-500/8 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300',
        subtle &&
          'border border-border/70 bg-background/35 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        danger &&
          'border border-rose-500/25 bg-rose-500/8 text-rose-700 hover:bg-rose-500/14 dark:text-rose-300',
        !primary && !warning && !subtle && !danger &&
          'border border-border/70 bg-background/35 text-foreground/80 hover:bg-muted/60 dark:border-zinc-700'
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}

// ── EMPTY STATE ────────────────────────────────────────────────
function SurveyDetailDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const c = survey.consultation
  const meta = STATE_META[survey.state]
  const tone = scheduleTone(survey)
  const schedule = primaryScheduleParts(survey)
  const phone = c?.phone ? rawPhoneDigits(c.phone) : ''
  const emergencyPhone = c?.emergency_phone ? rawPhoneDigits(c.emergency_phone) : ''
  const clientName = (c?.client_name || '').trim() || 'Tidak ada nama'
  const adminName = c?.account?.admins?.map((admin) => admin.name).filter(Boolean).join(', ')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 border-slate-200 bg-white p-0 text-foreground shadow-2xl max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-h-[88dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl sm:max-w-xl dark:border-slate-700 dark:bg-[#151f30]">
        <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-5 pr-14">
          <DialogTitle className="truncate text-lg font-black">{clientName}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {displayValue(c?.consultation_id)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <section className={cn('rounded-xl border p-4', tone.panel)}>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {schedule.caption}
                </p>
                <p className="mt-1 text-sm font-black text-foreground">{schedule.date}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-black tabular-nums">{schedule.time}</p>
                <p className="text-[9px] font-bold uppercase text-muted-foreground">WIB</p>
              </div>
            </div>
            <span className={cn('mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase', tone.badge)}>
              <span className={cn('size-1.5 rounded-full', tone.dot)} />
              {meta.label}
            </span>
          </section>

          <section aria-labelledby="detail-konsumen">
            <h3 id="detail-konsumen" className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Phone className="size-4 text-emerald-500" />
              Informasi Konsumen
            </h3>
            <div className="mt-2">
              <DetailLine label="Nama Konsumen" value={clientName} />
              <DetailLine label="ID Konsumen" value={displayValue(c?.consultation_id)} />
              <DetailLine label="No. WhatsApp">
                {c?.phone ? (
                  <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline dark:text-emerald-300"
                  >
                    {c.phone}
                    <ExternalLink className="size-3" />
                  </a>
                ) : '-'}
              </DetailLine>
              <DetailLine label="No. Darurat">
                {c?.emergency_phone ? (
                  <a
                    href={`tel:+${emergencyPhone}`}
                    className="text-emerald-600 hover:underline dark:text-emerald-300"
                  >
                    {c.emergency_phone}
                  </a>
                ) : '-'}
              </DetailLine>
              <DetailLine label="Alamat" value={locationLine(survey)} />
              <DetailLine label="Kebutuhan" value={needsCategoryLine(survey)} />
            </div>
          </section>

          <section aria-labelledby="detail-penugasan">
            <h3 id="detail-penugasan" className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <Building2 className="size-4 text-blue-500" />
              Akun dan Penugasan
            </h3>
            <div className="mt-2">
              <DetailLine label="Nama Akun" value={displayValue(c?.account?.name)} />
              <DetailLine label="Admin" value={displayValue(adminName)} />
              <DetailLine label="Surveyor" value={displayValue(survey.surveyor?.name)} />
              <DetailLine label="Ditugaskan Oleh" value={displayValue(survey.assigner?.name)} />
            </div>
          </section>

          <section aria-labelledby="detail-jadwal">
            <h3 id="detail-jadwal" className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
              <CalendarIcon className="size-4 text-amber-500" />
              Jadwal dan Progres
            </h3>
            <div className="mt-2">
              <DetailLine label="Jadwal Diajukan" value={requestedSurveyLabel(survey)} />
              <DetailLine label="Jadwal Survey" value={scheduledSurveyLabel(survey)} />
              <DetailLine label="Mulai Aktual" value={formatDateTime(survey.actual_start_at)} />
              <DetailLine label="Selesai Aktual" value={formatDateTime(survey.actual_finish_at)} />
              <DetailLine label="Hasil Survey" value={displayValue(survey.result_status?.name)} />
              <DetailLine label="Google Maps">
                {survey.google_maps_url ? (
                  <a
                    href={survey.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-300"
                  >
                    Buka lokasi
                    <ExternalLink className="size-3" />
                  </a>
                ) : '-'}
              </DetailLine>
            </div>
          </section>

          {(survey.location_notes || survey.admin_notes || survey.result_notes || survey.recommendations) && (
            <section aria-labelledby="detail-catatan">
              <h3 id="detail-catatan" className="text-xs font-black uppercase text-foreground">
                Catatan Survey
              </h3>
              <div className="mt-2">
                <DetailLine label="Lokasi" value={displayValue(survey.location_notes)} />
                <DetailLine label="Admin" value={displayValue(survey.admin_notes)} />
                <DetailLine label="Hasil" value={displayValue(survey.result_notes)} />
                <DetailLine label="Rekomendasi" value={displayValue(survey.recommendations)} />
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({
  state,
  surveyorMode,
  search,
}: {
  state: SurveyState
  surveyorMode: boolean
  search?: string
}) {
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
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 py-20 text-center duration-300 animate-in fade-in slide-in-from-bottom-2 dark:border-zinc-800">
      <span
        className="flex size-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
      >
        <Icon className="size-7" />
      </span>
      <p className="max-w-xs text-sm font-medium text-muted-foreground/70">
        {search ? `Tidak ada survey yang cocok dengan "${search}".` : messages[state]}
      </p>
    </div>
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
// ── ADMIN RESCHEDULE DIALOG ────────────────────────────────────
function AdminRescheduleDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const rescheduleMutation = useRescheduleSurvey(survey.id)
  const suggested = survey.requested_date
    ? `${survey.requested_date}T${(survey.requested_time || '09:00').slice(0, 5)}`
    : survey.scheduled_at ? toLocalInput(survey.scheduled_at) : ''
  const [requestedDate, setRequestedDate] = useState(() => suggested.slice(0, 10))
  const [requestedTime, setRequestedTime] = useState(() => suggested.slice(11, 16))
  const [requestedCalendarOpen, setRequestedCalendarOpen] = useState(false)
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
      <DialogContent className="!max-h-none !overflow-visible border-border/75 bg-card text-card-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] sm:max-w-md dark:border-white/10 dark:bg-[#131b2e] dark:shadow-[0_24px_70px_-40px_rgba(0,188,212,0.45)] [&>[data-slot=dialog-close]]:text-muted-foreground [&>[data-slot=dialog-close]]:hover:bg-muted [&>[data-slot=dialog-close]]:hover:text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              <RotateCcw className="size-4" />
            </span>
            Reschedule Survey
          </DialogTitle>
          <DialogDescription>Usulan jadwal baru akan dikirim ke Manager Surveyor untuk divalidasi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid gap-3 sm:grid-cols-[1fr_128px]">
            <div className="relative space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/80">Usulan Tanggal</Label>
              <button
                type="button"
                aria-expanded={requestedCalendarOpen}
                onClick={() => setRequestedCalendarOpen((open) => !open)}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-border/75 bg-background/70 px-3 text-left text-xs font-semibold text-foreground/90 shadow-inner shadow-black/[0.03] outline-none transition-colors hover:border-cyan-500/45 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/65 dark:hover:border-cyan-400/35 dark:hover:bg-slate-950/80"
              >
                {formatDateLabel(requestedDate)}
                <CalendarIcon className="size-4 text-cyan-600/80 dark:text-cyan-400/80" />
              </button>
              {requestedCalendarOpen && (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-fit rounded-xl border border-border/75 bg-popover p-0 text-popover-foreground shadow-2xl dark:border-white/10 dark:bg-slate-950">
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
                      setRequestedCalendarOpen(false)
                    }}
                  />
                </div>
              )}
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
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alasan perubahan jadwal atau informasi dari klien..." className="min-h-[88px] rounded-xl border-border/75 bg-background/70 text-xs text-foreground placeholder:text-muted-foreground/65 shadow-inner shadow-black/[0.03] focus-visible:border-cyan-500/45 focus-visible:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/65 dark:focus-visible:border-cyan-400/35" />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="h-10 rounded-xl border-border/75 bg-background/60 px-4 text-sm font-semibold text-foreground/80 hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-slate-950/40 dark:hover:bg-slate-800/60">Batal</Button>
          <Button size="sm" onClick={submit} disabled={rescheduleMutation.isPending} className="h-10 rounded-xl bg-cyan-500 px-4 text-sm font-bold text-slate-950 shadow-sm shadow-cyan-500/20 hover:bg-cyan-400">
            {rescheduleMutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 size-3.5" />}
            Kirim Reschedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── RESULT DIALOG ──────────────────────────────────────────────
function CancelSurveyDialog({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const cancelMutation = useCancelSurvey(survey.id, survey.consultation?.id)
  const [reason, setReason] = useState('')
  const clientName = (survey.consultation?.client_name || '').trim() || 'Tidak ada nama'
  const meta = STATE_META[survey.state]

  const submit = () => {
    cancelMutation.mutate(
      { cancellation_reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Survey dibatalkan dan role terkait diberi notifikasi')
          onClose()
        },
        onError: (err: any) => toast.error(err.message || 'Gagal membatalkan survey'),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border/75 bg-card text-card-foreground shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] sm:max-w-md dark:border-white/10 dark:bg-[#131b2e] dark:shadow-[0_24px_70px_-40px_rgba(244,63,94,0.34)] [&>[data-slot=dialog-close]]:text-muted-foreground [&>[data-slot=dialog-close]]:hover:bg-muted [&>[data-slot=dialog-close]]:hover:text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <XCircle className="size-4" />
            </span>
            Batalkan Survey
          </DialogTitle>
          <DialogDescription>
            Survey akan masuk tab Dibatalkan dan lead dapat diajukan ulang bila dibutuhkan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/35 p-3 text-xs dark:border-zinc-800/70 dark:bg-zinc-950/25">
          <p className="font-bold text-foreground">{clientName}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {displayValue(survey.consultation?.consultation_id)}
          </p>
          <div
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase"
            style={{ borderColor: `${meta.color}35`, color: meta.color, backgroundColor: `${meta.color}12` }}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground/80">
            Alasan pembatalan <span className="text-muted-foreground/60">(opsional)</span>
          </Label>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Contoh: konsumen minta batal, alamat belum valid, jadwal tidak cocok..."
            className="min-h-[96px] rounded-xl border-border/75 bg-background/70 text-sm text-foreground placeholder:text-muted-foreground/65 shadow-inner shadow-black/[0.03] focus-visible:border-rose-500/45 focus-visible:ring-rose-500/20 dark:border-white/10 dark:bg-slate-950/65 dark:focus-visible:border-rose-400/35"
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Alasan ini masuk riwayat dan notifikasi agar admin, manager, dan surveyor tidak kehilangan konteks.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={cancelMutation.isPending}
            className="h-10 rounded-xl border-border/75 bg-background/60 px-4 text-sm font-semibold text-foreground/80 hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-slate-950/40 dark:hover:bg-slate-800/60"
          >
            Jangan batalkan
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={cancelMutation.isPending}
            className="h-10 rounded-xl bg-rose-500 px-4 text-sm font-bold text-white shadow-sm shadow-rose-500/20 hover:bg-rose-400"
          >
            {cancelMutation.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <XCircle className="mr-1.5 size-4" />}
            Batalkan Survey
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
