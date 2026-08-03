'use client'

import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowRight,
  Bell,
  BellDot,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Inbox,
  Loader2,
  MapPin,
  MessageSquareText,
  RotateCcw,
  Timer,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react'

import {
  useClearNotifications,
  useDeleteAttendanceNotification,
  useDeleteSurveyNotification,
  useMarkAttendanceRead,
  useMarkNoteRead,
  useMarkReminderRead,
  useMarkSurveyRead,
  useNotificationCount,
  useNotificationSummary,
} from '@/lib/hooks/useNotifications'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import type { AttendanceNotification, SurveyNotification } from '@/types'

import PushToggle from './push-toggle'
import { HEADER_ACTION_CLASS } from './header-action'

type EmptyStateProps = {
  description: string
  icon: ComponentType<{ className?: string }>
  title: string
}

function EmptyState({ description, icon: Icon, title }: EmptyStateProps) {
  return (
    <div className="flex h-56 flex-col items-center justify-center px-6 text-center sm:h-64">
      <div className="mb-3 grid size-12 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_7%,var(--card))] text-[var(--primary-theme)]">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-semibold text-foreground/85">{title}</p>
      <p className="mt-1 max-w-[26ch] text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

const tabClassName = cn(
  'notification-tab h-full w-full min-w-0 cursor-pointer touch-manipulation select-none gap-1 rounded-md border px-1.5 text-[10px] font-semibold text-muted-foreground transition-[border-color,background-color,color,box-shadow] duration-200 [&>*]:pointer-events-none sm:text-[11px]',
  'hover:border-border/70 hover:bg-background/45 hover:text-foreground',
  'data-active:text-[var(--primary-theme)]',
  'data-active:border-[color-mix(in_srgb,var(--primary-theme)_38%,var(--border))] data-active:bg-[color-mix(in_srgb,var(--primary-theme)_12%,var(--card))]',
  'data-active:shadow-[inset_0_-2px_0_var(--primary-theme),inset_0_1px_0_rgba(255,255,255,0.06)]',
)

const surveyNotificationMeta: Record<string, {
  icon: ComponentType<{ className?: string }>
  label: string
  tone: string
}> = {
  request_created: {
    icon: FileText,
    label: 'Permintaan baru',
    tone: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
  scheduled: {
    icon: CalendarClock,
    label: 'Terjadwal',
    tone: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  rescheduled_by_admin: {
    icon: RotateCcw,
    label: 'Jadwal berubah',
    tone: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  rescheduled_by_manager: {
    icon: RotateCcw,
    label: 'Jadwal berubah',
    tone: 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  },
  started: {
    icon: Timer,
    label: 'Berlangsung',
    tone: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Selesai',
    tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  cancelled: {
    icon: XCircle,
    label: 'Dibatalkan',
    tone: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  maps_updated: {
    icon: MapPin,
    label: 'Maps berubah',
    tone: 'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300',
  },
  unassigned: {
    icon: UserRound,
    label: 'Surveyor diganti',
    tone: 'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  },
}

function SurveyNotificationItem({
  notification,
  onOpen,
  onRead,
  onDelete,
  isDeleting,
}: {
  notification: SurveyNotification
  onOpen: () => void
  onRead: (id: number) => void
  onDelete: (id: number) => void
  isDeleting: boolean
}) {
  const meta = surveyNotificationMeta[notification.type] ?? {
    icon: BellDot,
    label: 'Pembaruan',
    tone: 'border-[color-mix(in_srgb,var(--primary-theme)_24%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_8%,var(--card))] text-[var(--primary-theme)]',
  }
  const Icon = meta.icon

  return (
    <div
      className={cn(
        'group relative border-b border-border/55 transition-colors duration-200 last:border-b-0 hover:bg-background/45',
        !notification.is_read && 'bg-[color-mix(in_srgb,var(--primary-theme)_6%,var(--card))]',
      )}
    >
      {!notification.is_read && (
        <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-[var(--primary-theme)]" aria-label="Belum dibaca" />
      )}

      <Link
        href={notification.survey_url || '/surveys'}
        onClick={() => {
          if (!notification.is_read) onRead(notification.id)
          onOpen()
        }}
        className="block px-3.5 py-3.5 pr-11 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary-theme)]"
        title={`Buka ${notification.title}`}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-[10px] border', meta.tone)}>
            <Icon className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]', meta.tone)}>
                {meta.label}
              </span>
              <time className="shrink-0 text-[10px] text-muted-foreground/70">
                {notification.created_human || 'Baru saja'}
              </time>
            </div>

            <h4 className="mt-2 truncate text-xs font-bold text-foreground/95">
              {notification.title}
            </h4>

            <div className="mt-1.5 space-y-1">
            <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
              <UserRound className="size-3 shrink-0 text-muted-foreground/60" />
              <span className="min-w-0 truncate font-semibold text-foreground/80">
                {notification.client_name || 'Konsumen'}
              </span>
              {notification.consultation_code && (
                <span className="shrink-0 rounded border border-border/70 px-1 font-mono text-[9px] text-muted-foreground">
                  {notification.consultation_code}
                </span>
              )}
            </div>

            {notification.location && (
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="size-3 shrink-0 text-muted-foreground/60" />
                <span className="truncate">{notification.location}</span>
              </div>
            )}

            {(notification.schedule_label || notification.surveyor_name) && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {notification.schedule_label && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3 shrink-0 text-muted-foreground/60" />
                    {notification.schedule_label}
                  </span>
                )}
                {notification.surveyor_name && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <UserRound className="size-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{notification.surveyor_name}</span>
                  </span>
                )}
              </div>
            )}
            </div>

            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {notification.message}
            </p>

            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--primary-theme)] opacity-80 transition-opacity group-hover:opacity-100">
              Buka survey
              <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isDeleting}
        onClick={() => onDelete(notification.id)}
        className="absolute bottom-3 right-2.5 size-7 rounded-lg text-muted-foreground opacity-100 hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        title="Hapus notifikasi"
        aria-label={`Hapus notifikasi ${notification.title}`}
      >
        {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </Button>
    </div>
  )
}

function AttendanceNotificationItem({
  notification,
  onOpen,
  onRead,
  onDelete,
  isDeleting,
}: {
  notification: AttendanceNotification
  onOpen: () => void
  onRead: (id: number) => void
  onDelete: (id: number) => void
  isDeleting: boolean
}) {
  return (
    <div
      className={cn(
        'group relative border-b border-border/55 transition-colors duration-200 last:border-b-0 hover:bg-background/45',
        !notification.is_read && 'bg-[color-mix(in_srgb,var(--primary-theme)_6%,var(--card))]',
      )}
    >
      {!notification.is_read && (
        <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-[var(--primary-theme)]" aria-label="Belum dibaca" />
      )}

      <Link
        href={notification.url || '/report-attendances'}
        onClick={() => {
          if (!notification.is_read) onRead(notification.id)
          onOpen()
        }}
        className="block px-3.5 py-3.5 pr-11 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary-theme)]"
        title={`Buka ${notification.title}`}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <ClipboardList className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
                {notification.report_category_label}
              </span>
              <time className="shrink-0 text-[10px] text-muted-foreground/70">
                {notification.created_human || 'Baru saja'}
              </time>
            </div>

            <h4 className="mt-2 truncate text-xs font-bold text-foreground/95">
              {notification.title}
            </h4>

            <div className="mt-1.5 space-y-1">
              <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
                <UserRound className="size-3 shrink-0 text-muted-foreground/60" />
                <span className="min-w-0 truncate font-semibold text-foreground/80">
                  {notification.admin_name}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {notification.account_name && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Inbox className="size-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{notification.account_name}</span>
                  </span>
                )}
                {notification.report_date_label && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3 shrink-0 text-muted-foreground/60" />
                    {notification.report_date_label}
                  </span>
                )}
              </div>
            </div>

            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {notification.message}
            </p>

            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--primary-theme)] opacity-80 transition-opacity group-hover:opacity-100">
              Buka absensi
              <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isDeleting}
        onClick={() => onDelete(notification.id)}
        className="absolute bottom-3 right-2.5 size-7 rounded-lg text-muted-foreground opacity-100 hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        title="Hapus notifikasi"
        aria-label={`Hapus notifikasi ${notification.title}`}
      >
        {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </Button>
    </div>
  )
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('surveys')
  const confirm = useConfirm()
  const user = useAuthStore((state) => state.user)
  const { data: count } = useNotificationCount()
  const { data: summary, isLoading } = useNotificationSummary(open)
  const markNoteRead = useMarkNoteRead()
  const markReminderRead = useMarkReminderRead()
  const markSurveyRead = useMarkSurveyRead()
  const markAttendanceRead = useMarkAttendanceRead()
  const deleteSurveyNotification = useDeleteSurveyNotification()
  const deleteAttendanceNotification = useDeleteAttendanceNotification()
  const clearNotifications = useClearNotifications()

  const surveyUnread = summary?.unread_surveys ?? count?.unread_surveys ?? 0
  const canSeeAttendances = user?.role === 'super_admin'
  const attendanceUnread = canSeeAttendances ? (summary?.unread_attendances ?? count?.unread_attendances ?? 0) : 0
  const noteUnread = summary?.unread_notes ?? count?.unread_notes ?? 0
  const reminderUnread = summary?.upcoming_reminders ?? count?.upcoming_reminders ?? 0
  const totalUnread = surveyUnread + attendanceUnread + noteUnread + reminderUnread
  const hasNotifications = Boolean(
    summary?.surveys?.length || (canSeeAttendances && summary?.attendances?.length) || summary?.notes?.length || summary?.reminders?.length
  )
  const TriggerIcon = totalUnread > 0 ? BellDot : Bell

  const clearAll = async () => {
    const accepted = await confirm({
      title: 'Bersihkan semua notifikasi?',
      description: 'Semua notifikasi akan dihilangkan dari panel. Data konsultasi, catatan, dan jadwal tetap aman.',
      actionLabel: 'Bersihkan semua',
      variant: 'destructive',
    })
    if (!accepted) return

    try {
      const result = await clearNotifications.mutateAsync()
      toast.success(`${result.cleared} notifikasi dibersihkan`)
    } catch {
      toast.error('Gagal membersihkan notifikasi')
    }
  }

  const renderNotificationPanel = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-[var(--primary-theme)]" />
        </div>
      )
    }

    if (activeTab === 'notes') {
      if (!summary?.notes?.length) {
        return <EmptyState icon={MessageSquareText} title="Tidak ada catatan baru" description="Catatan yang belum dibaca akan tampil di sini." />
      }

      return (
        <div className="divide-y divide-border/60">
          {summary.notes.map((note) => {
            const inner = (
              <>
                <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/55 text-xs font-bold uppercase text-[var(--primary-theme)]">
                  {note.author_initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground/90">{note.author_name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{note.body}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/75">
                    <span className="truncate">{note.consultation_name}</span>
                    <span aria-hidden="true">/</span>
                    <span className="shrink-0">{note.created_human}</span>
                  </p>
                </div>
              </>
            )

            return (
              <div key={note.id} className="group relative p-3 transition-colors hover:bg-muted/45">
                <div className="flex items-start gap-2.5">
                  {note.consultation_url ? (
                    <Link href={note.consultation_url} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-start gap-2.5" title={`Buka konsultasi ${note.consultation_name}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">{inner}</div>
                  )}
                  <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); markNoteRead.mutate(note.id) }} className="size-7 shrink-0 rounded-lg text-muted-foreground opacity-100 hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100" title="Hapus dari notifikasi" aria-label="Hapus catatan dari notifikasi">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (activeTab === 'attendances' && canSeeAttendances) {
      if (!summary?.attendances?.length) {
        return <EmptyState icon={ClipboardList} title="Belum ada notifikasi absensi" description="Laporan absensi admin akan muncul di sini." />
      }

      return (
        <div>
          {summary.attendances.map((notification) => (
            <AttendanceNotificationItem
              key={notification.id}
              notification={notification}
              onRead={(id) => markAttendanceRead.mutate(id)}
              onDelete={(id) => deleteAttendanceNotification.mutate(id)}
              isDeleting={deleteAttendanceNotification.isPending && deleteAttendanceNotification.variables === notification.id}
              onOpen={() => setOpen(false)}
            />
          ))}
        </div>
      )
    }

    if (activeTab === 'reminders') {
      if (!summary?.reminders?.length) {
        return <EmptyState icon={CalendarClock} title="Belum ada pengingat" description="Pengingat terjadwal akan muncul di sini." />
      }

      return (
        <div className="divide-y divide-border/60">
          {summary.reminders.map((reminder) => {
            const inner = (
              <>
                <div className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg border',
                  reminder.overdue
                    ? 'border-red-500/20 bg-red-500/10 text-red-500'
                    : 'border-[color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_7%,var(--card))] text-[var(--primary-theme)]',
                )}>
                  <CalendarClock className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground/90">{reminder.message}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/75">
                    <span className="truncate">{reminder.consultation_name}</span>
                    <span aria-hidden="true">/</span>
                    <span className={cn('shrink-0', reminder.overdue && 'text-red-500')}>{reminder.remind_human}</span>
                  </p>
                </div>
              </>
            )

            return (
              <div key={reminder.id} className="group relative p-3 transition-colors hover:bg-muted/45">
                <div className="flex items-start gap-2.5">
                  {reminder.consultation_url ? (
                    <Link href={reminder.consultation_url} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-start gap-2.5" title={`Buka konsultasi ${reminder.consultation_name}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">{inner}</div>
                  )}
                  <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); markReminderRead.mutate(reminder.id) }} className="size-7 shrink-0 rounded-lg text-muted-foreground opacity-100 hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100" title="Hapus dari notifikasi" aria-label="Hapus reminder dari notifikasi">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (!summary?.surveys?.length) {
      return <EmptyState icon={Inbox} title="Belum ada notifikasi survey" description="Penugasan dan perubahan survey akan muncul di sini." />
    }

    return (
      <div>
        {summary.surveys.map((notification) => (
          <SurveyNotificationItem
            key={notification.id}
            notification={notification}
            onRead={(id) => markSurveyRead.mutate(id)}
            onDelete={(id) => deleteSurveyNotification.mutate(id)}
            isDeleting={deleteSurveyNotification.isPending && deleteSurveyNotification.variables === notification.id}
            onOpen={() => setOpen(false)}
          />
        ))}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={totalUnread > 0 ? `Notifikasi, ${totalUnread} belum dibaca` : 'Notifikasi'}
        title="Notifikasi"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          HEADER_ACTION_CLASS,
          'border-border/75 bg-card/75 text-muted-foreground',
          'hover:border-[color-mix(in_srgb,var(--primary-theme)_34%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_7%,var(--card))] hover:text-[var(--primary-theme)] hover:shadow-md active:scale-[0.97]',
          'data-popup-open:border-[color-mix(in_srgb,var(--primary-theme)_42%,var(--border))] data-popup-open:bg-[color-mix(in_srgb,var(--primary-theme)_9%,var(--card))] data-popup-open:text-[var(--primary-theme)]',
        )}
      >
        <TriggerIcon className="size-[18px] sm:size-4" strokeWidth={2.1} />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-md border-2 border-card bg-[var(--primary-theme)] px-1 text-[9px] font-black leading-3.5 text-[color:var(--primary-theme-foreground)] shadow-sm">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(27rem,calc(100vw-1rem))] gap-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--primary-theme)_26%,var(--border))] bg-[color-mix(in_srgb,var(--muted)_76%,var(--card))] p-0 text-popover-foreground shadow-[0_24px_64px_-24px_rgba(2,8,23,0.52),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3 px-3.5 py-3.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[color-mix(in_srgb,var(--primary-theme)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_8%,var(--card))] text-[var(--primary-theme)]">
              <BellDot className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">Notifikasi</h3>
              <p className="truncate text-[11px] text-muted-foreground">
                {totalUnread > 0 ? `${totalUnread} belum dibaca` : 'Semua sudah diperiksa'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <PushToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasNotifications || clearNotifications.isPending}
              onClick={clearAll}
              className="h-8 gap-1.5 rounded-lg border border-border/70 px-2 text-[10px] font-semibold text-muted-foreground hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
              title="Bersihkan semua notifikasi"
            >
              {clearNotifications.isPending ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              <span className="hidden sm:inline">Bersihkan</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-0">
          <TabsList className={cn(
            'grid h-11 w-full gap-1 rounded-none border-y border-border/70 bg-background/35 p-1',
            canSeeAttendances ? 'grid-cols-4' : 'grid-cols-3',
          )}>
            <TabsTrigger value="surveys" aria-label="Buka notifikasi survey" className={tabClassName}>
              <ClipboardCheck className="size-3.5" />
              <span className="truncate">Survey</span>
              <Badge className="h-4 min-w-4 rounded-[5px] bg-muted px-1 text-[9px] text-muted-foreground shadow-none">{surveyUnread}</Badge>
            </TabsTrigger>
            {canSeeAttendances && (
              <TabsTrigger value="attendances" aria-label="Buka notifikasi absensi" className={tabClassName}>
                <ClipboardList className="size-3.5" />
                <span className="truncate">Absen</span>
                <Badge className="h-4 min-w-4 rounded-[5px] bg-muted px-1 text-[9px] text-muted-foreground shadow-none">{attendanceUnread}</Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="notes" aria-label="Buka notifikasi catatan" className={tabClassName}>
              <MessageSquareText className="size-3.5" />
              <span className="truncate">Catat</span>
              <Badge className="h-4 min-w-4 rounded-[5px] bg-muted px-1 text-[9px] text-muted-foreground shadow-none">{noteUnread}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reminders" aria-label="Buka notifikasi reminder" className={tabClassName}>
              <CalendarClock className="size-3.5" />
              <span className="truncate">Ingat</span>
              <Badge className="h-4 min-w-4 rounded-[5px] bg-muted px-1 text-[9px] text-muted-foreground shadow-none">{reminderUnread}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="border-t border-border/55 bg-background/15">
            <ScrollArea className="h-64 sm:h-72">
              <div className="min-h-64 sm:min-h-72">
                {renderNotificationPanel()}
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
