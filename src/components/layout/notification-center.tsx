'use client'

import { useNotificationSummary, useMarkNoteRead, useMarkReminderRead } from '@/lib/hooks/useNotifications'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, MessageSquare, Clock, Check, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import { buttonVariants } from '@/components/ui/button'

export default function NotificationCenter() {
  const { data: summary, isLoading } = useNotificationSummary()
  const markNoteRead = useMarkNoteRead()
  const markReminderRead = useMarkReminderRead()

  const totalUnread = summary ? summary.unread_notes + summary.upcoming_reminders : 0

  return (
    <Popover>
      <PopoverTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "relative text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800")}>
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-zinc-950">
            {totalUnread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 border-zinc-800 bg-zinc-900 text-zinc-100 p-0 shadow-2xl" align="end">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h3 className="font-semibold text-sm">Notifikasi</h3>
          {totalUnread > 0 && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
              {totalUnread} Unread
            </Badge>
          )}
        </div>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-zinc-800 bg-transparent h-10 p-0">
            <TabsTrigger
              value="notes"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 bg-transparent text-zinc-400 data-[state=active]:text-zinc-100 text-xs h-full"
            >
              Catatan ({summary?.unread_notes || 0})
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 bg-transparent text-zinc-400 data-[state=active]:text-zinc-100 text-xs h-full"
            >
              Reminder ({summary?.upcoming_reminders || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="m-0">
            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
              ) : !summary?.notes || summary.notes.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center p-4">
                  <MessageSquare className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-500">Tidak ada catatan belum dibaca</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {summary.notes.map((note) => (
                    <div key={note.id} className="p-3 hover:bg-zinc-800/40 group relative transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-amber-500 uppercase">
                          {note.author_initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-300">{note.author_name}</p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{note.body}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                            <span>{note.consultation_name}</span>
                            <span>•</span>
                            <span>{note.created_human}</span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markNoteRead.mutate(note.id)}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-zinc-400 hover:text-green-400 hover:bg-zinc-800 transition-opacity shrink-0"
                          title="Tandai telah dibaca"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reminders" className="m-0">
            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
              ) : !summary?.reminders || summary.reminders.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center p-4">
                  <Clock className="h-8 w-8 text-zinc-600 mb-2" />
                  <p className="text-xs text-zinc-500">Tidak ada pengingat terjadwal</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {summary.reminders.map((reminder) => (
                    <div key={reminder.id} className="p-3 hover:bg-zinc-800/40 group relative transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0",
                          reminder.overdue ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                        )}>
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 font-medium">{reminder.message}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                            <span className="truncate">{reminder.consultation_name}</span>
                            <span>•</span>
                            <span className={cn(reminder.overdue && "text-red-400")}>
                              {reminder.remind_human}
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markReminderRead.mutate(reminder.id)}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-zinc-400 hover:text-green-400 hover:bg-zinc-800 transition-opacity shrink-0"
                          title="Tandai selesai"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
