'use client'

import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import {
  Bell,
  BellDot,
  CalendarClock,
  Check,
  ClipboardCheck,
  Inbox,
  Loader2,
  MessageSquareText,
} from 'lucide-react'

import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import PushToggle from './push-toggle'

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
  'notification-tab h-full w-full min-w-0 cursor-pointer touch-manipulation select-none gap-1 rounded-lg border px-2 text-[11px] font-semibold text-muted-foreground transition-[border-color,background-color,color,box-shadow] duration-200 [&>*]:pointer-events-none',
  'hover:border-border/70 hover:bg-background/45 hover:text-foreground',
  'data-active:text-[var(--primary-theme)]',
  'data-active:shadow-[0_6px_16px_-12px_color-mix(in_srgb,var(--primary-theme)_70%,transparent),inset_0_-2px_0_var(--primary-theme),inset_0_1px_0_rgba(255,255,255,0.06)]',
)

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('surveys')
  const { data: count } = useNotificationCount()
  const { data: summary, isLoading } = useNotificationSummary(open)
  const markNoteRead = useMarkNoteRead()
  const markReminderRead = useMarkReminderRead()
  const markSurveyRead = useMarkSurveyRead()

  const surveyUnread = summary?.surveys?.filter((item) => !item.is_read).length ?? count?.unread_surveys ?? 0
  const noteUnread = summary?.unread_notes ?? count?.unread_notes ?? 0
  const reminderUnread = summary?.upcoming_reminders ?? count?.upcoming_reminders ?? 0
  const totalUnread = surveyUnread + noteUnread + reminderUnread
  const TriggerIcon = totalUnread > 0 ? BellDot : Bell

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={totalUnread > 0 ? `Notifikasi, ${totalUnread} belum dibaca` : 'Notifikasi'}
        title="Notifikasi"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'relative size-10 rounded-[10px] border border-border/75 bg-card/75 text-muted-foreground shadow-sm transition-[border-color,background-color,color,box-shadow,transform] duration-200',
          'hover:border-[color-mix(in_srgb,var(--primary-theme)_34%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_7%,var(--card))] hover:text-[var(--primary-theme)] hover:shadow-md active:scale-[0.97]',
          'data-popup-open:border-[color-mix(in_srgb,var(--primary-theme)_42%,var(--border))] data-popup-open:bg-[color-mix(in_srgb,var(--primary-theme)_9%,var(--card))] data-popup-open:text-[var(--primary-theme)]',
        )}
      >
        <TriggerIcon className="size-[18px]" strokeWidth={2.1} />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-md border-2 border-card bg-[var(--primary-theme)] px-1 text-[9px] font-black leading-3.5 text-[color:var(--primary-theme-foreground)] shadow-sm">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(24rem,calc(100vw-1rem))] gap-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--primary-theme)_26%,var(--border))] bg-[color-mix(in_srgb,var(--muted)_78%,var(--card))] p-0 text-popover-foreground shadow-[0_24px_64px_-24px_rgba(2,8,23,0.52),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/65 px-3.5 py-3.5 sm:px-4">
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
          <PushToggle />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-0">
          <TabsList className="grid h-12 w-full grid-cols-3 gap-1 rounded-none border-b border-border/70 bg-background/35 p-1">
            <TabsTrigger value="surveys" aria-label="Buka notifikasi survey" className={tabClassName}>
              <ClipboardCheck className="size-3.5" />
              <span className="truncate">Survey</span>
              <Badge className="h-4 min-w-4 rounded-[5px] bg-muted px-1 text-[9px] text-muted-foreground shadow-none">{surveyUnread}</Badge>
            </TabsTrigger>
            <TabsTrigger value="notes" aria-label="Buka notifikasi catatan" className={tabClassName}>
              <MessageSquareText className="size-3.5" />
              <span className="truncate">Catatan</span>
              <Badge className="h-4 min-w-4 rounded-[5px] bg-muted px-1 text-[9px] text-muted-foreground shadow-none">{noteUnread}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reminders" aria-label="Buka notifikasi reminder" className={tabClassName}>
              <CalendarClock className="size-3.5" />
              <span className="truncate">Reminder</span>
              <Badge className="h-4 min-w-4 rounded-[5px] bg-muted px-1 text-[9px] text-muted-foreground shadow-none">{reminderUnread}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="m-0">
            <ScrollArea className="h-64 sm:h-72">
              {isLoading ? (
                <div className="flex h-56 items-center justify-center sm:h-64">
                  <Loader2 className="size-5 animate-spin text-[var(--primary-theme)]" />
                </div>
              ) : !summary?.notes?.length ? (
                <EmptyState icon={MessageSquareText} title="Tidak ada catatan baru" description="Catatan yang belum dibaca akan tampil di sini." />
              ) : (
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
                          <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); markNoteRead.mutate(note.id) }} className="size-7 shrink-0 rounded-lg text-muted-foreground opacity-100 hover:bg-emerald-500/10 hover:text-emerald-500 sm:opacity-0 sm:group-hover:opacity-100" title="Tandai telah dibaca" aria-label="Tandai catatan telah dibaca">
                            <Check className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="surveys" className="m-0">
            <ScrollArea className="h-64 sm:h-72">
              {isLoading ? (
                <div className="flex h-56 items-center justify-center sm:h-64">
                  <Loader2 className="size-5 animate-spin text-[var(--primary-theme)]" />
                </div>
              ) : !summary?.surveys?.length ? (
                <EmptyState icon={Inbox} title="Belum ada notifikasi survey" description="Penugasan dan perubahan survey akan muncul di sini." />
              ) : (
                <div className="divide-y divide-border/60">
                  {summary.surveys.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => !notification.is_read && markSurveyRead.mutate(notification.id)}
                      className={cn(
                        'w-full px-3.5 py-3 text-left transition-colors hover:bg-muted/45',
                        !notification.is_read && 'bg-[color-mix(in_srgb,var(--primary-theme)_6%,var(--card))]',
                      )}
                    >
                      <p className="text-xs font-semibold text-foreground/90">{notification.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
                      <p className="mt-1.5 text-[10px] text-muted-foreground/70">{notification.created_human}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reminders" className="m-0">
            <ScrollArea className="h-64 sm:h-72">
              {isLoading ? (
                <div className="flex h-56 items-center justify-center sm:h-64">
                  <Loader2 className="size-5 animate-spin text-[var(--primary-theme)]" />
                </div>
              ) : !summary?.reminders?.length ? (
                <EmptyState icon={CalendarClock} title="Belum ada pengingat" description="Pengingat terjadwal akan muncul di sini." />
              ) : (
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
                          <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); markReminderRead.mutate(reminder.id) }} className="size-7 shrink-0 rounded-lg text-muted-foreground opacity-100 hover:bg-emerald-500/10 hover:text-emerald-500 sm:opacity-0 sm:group-hover:opacity-100" title="Tandai selesai" aria-label="Tandai pengingat selesai">
                            <Check className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
