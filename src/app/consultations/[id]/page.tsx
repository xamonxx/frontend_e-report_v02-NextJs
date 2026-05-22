'use client'

import { use, useState } from 'react'
import {
  useConsultation,
  useUpdateConsultationStatus,
  useCreateNote,
  useDeleteNote,
  useCreateReminder,
  useDeleteReminder,
  useMarkReminderDone
} from '@/lib/hooks/useConsultations'
import { useStatusCategories } from '@/lib/hooks/useMasterData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Tag,
  Clock,
  ArrowLeft,
  Loader2,
  Trash2,
  Send,
  Plus,
  Edit,
  CheckCircle2,
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn, rawPhoneDigits } from '@/lib/utils'
import { CustomSelect } from '@/components/ui/custom-select'

type PageParams = {
  id: string
}

export default function ConsultationDetailPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params)
  const consultationId = parseInt(resolvedParams.id, 10)

  const { data: detailResponse, isLoading, error } = useConsultation(consultationId)
  const consultation = detailResponse?.data

  const { data: statuses } = useStatusCategories()

  const updateStatusMutation = useUpdateConsultationStatus(consultationId)
  const createNoteMutation = useCreateNote(consultationId)
  const deleteNoteMutation = useDeleteNote(consultationId)
  const createReminderMutation = useCreateReminder(consultationId)
  const deleteReminderMutation = useDeleteReminder(consultationId)
  const markReminderDoneMutation = useMarkReminderDone(consultationId)

  const [noteBody, setNoteBody] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  if (isLoading) {
    return <DetailPageSkeleton />
  }

  if (error || !consultation) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-muted-foreground gap-4">
        <p className="text-sm font-medium">Gagal memuat detail konsultasi atau lead tidak ditemukan.</p>
        <Link
          href="/consultations"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "border-border text-foreground/80 dark:border-zinc-800 dark:text-zinc-300"
          )}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar
        </Link>
      </div>
    )
  }

  const handleStatusChange = (statusIdStr: string) => {
    const statusId = parseInt(statusIdStr, 10)
    updateStatusMutation.mutate(statusId, {
      onSuccess: () => {
        toast.success('Status lead berhasil diperbarui')
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal memperbarui status')
      },
    })
  }

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteBody.trim()) return

    createNoteMutation.mutate(noteBody, {
      onSuccess: () => {
        toast.success('Catatan berhasil ditambahkan')
        setNoteBody('')
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal menambahkan catatan')
      },
    })
  }

  const handleNoteDelete = (noteId: number) => {
    if (confirm('Hapus catatan ini dari timeline?')) {
      deleteNoteMutation.mutate(noteId, {
        onSuccess: () => {
          toast.success('Catatan berhasil dihapus')
        },
        onError: () => {
          toast.error('Gagal menghapus catatan')
        },
      })
    }
  }

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reminderMessage.trim() || !reminderDate) {
      toast.error('Pesan dan tanggal reminder wajib diisi.')
      return
    }

    createReminderMutation.mutate(
      { message: reminderMessage, remind_at: reminderDate },
      {
        onSuccess: () => {
          toast.success('Reminder berhasil dijadwalkan')
          setReminderMessage('')
          setReminderDate('')
        },
        onError: (err: any) => {
          toast.error(err.message || 'Gagal membuat reminder')
        },
      }
    )
  }

  const handleReminderDelete = (reminderId: number) => {
    if (confirm('Hapus reminder ini?')) {
      deleteReminderMutation.mutate(reminderId, {
        onSuccess: () => {
          toast.success('Reminder berhasil dihapus')
        },
        onError: () => {
          toast.error('Gagal menghapus reminder')
        },
      })
    }
  }

  const handleReminderDone = (reminderId: number) => {
    markReminderDoneMutation.mutate(reminderId, {
      onSuccess: () => {
        toast.success('Reminder ditandai selesai')
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal menandai reminder selesai')
      },
    })
  }

  const whatsappNumber = consultation.phone ? rawPhoneDigits(consultation.phone) : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/consultations"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-zinc-800"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{consultation.client_name}</h1>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground dark:border-zinc-800">
                {consultation.consultation_id}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground/70">
              Dibuat oleh {consultation.creator?.name || 'Sistem'} pada{' '}
              {new Date(consultation.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground shrink-0">Tahap Pipeline:</Label>
            <CustomSelect
              value={consultation.status_category_id ? consultation.status_category_id.toString() : ''}
              onChange={(val) => handleStatusChange(val)}
              disabled={updateStatusMutation.isPending}
              options={(statuses || []).map((st) => ({
                value: st.id.toString(),
                label: st.name.toUpperCase()
              }))}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500/50 w-[180px] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <Link
            href={`/consultations/${consultationId}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-border text-foreground/80 hover:bg-muted font-semibold dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit Lead
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground/90">Informasi Klien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Nama Lengkap</p>
                    <p className="text-xs text-foreground/80 font-medium">{consultation.client_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">No. Telepon / WhatsApp</p>
                    {consultation.phone ? (
                      <a
                        href={`https://wa.me/${whatsappNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-semibold hover:text-amber-400 transition-colors dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {consultation.phone}
                      </a>
                    ) : (
                      <p className="text-xs text-foreground/80 font-medium">-</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Alamat Lengkap</p>
                    <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                      {consultation.address || '-'}
                      {consultation.district && `, Kec. ${consultation.district}`}
                      {consultation.city && `, ${consultation.city}`}
                      {consultation.province && `, ${consultation.province}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Tanggal Konsultasi</p>
                    <p className="text-xs text-foreground/80 font-medium">
                      {consultation.consultation_date
                        ? new Date(consultation.consultation_date).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Kategori Kebutuhan</p>
                    <p className="text-xs text-foreground/80 font-medium">
                      {consultation.needs_category?.name || 'Kebutuhan Umum'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product requirements detail box */}
          <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground/90">Detail & Kebutuhan Produk</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/70">
                Deskripsi pengerjaan produk interior yang diajukan klien.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border bg-muted/40 p-4 min-h-[120px] text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap dark:border-zinc-800 dark:bg-zinc-950/40">
                {consultation.product_details || 'Tidak ada detail produk khusus yang dicantumkan.'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Notes log & Reminder Schedule */}
        <div className="space-y-6">
          {/* Timeline Notes */}
          <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground/90">Catatan Aktivitas</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/70">
                Log pembicaraan atau perkembangan pengerjaan interior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleNoteSubmit} className="flex gap-2">
                <Input
                  placeholder="Tambah catatan timeline baru..."
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  className="h-8 text-xs border-border bg-background focus-visible:ring-amber-500/50 flex-1 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <Button
                  type="submit"
                  size="xs"
                  disabled={createNoteMutation.isPending}
                  className="bg-amber-500 text-zinc-950 hover:bg-amber-400 h-8 font-semibold shrink-0"
                >
                  {createNoteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </form>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {consultation.timeline_notes && consultation.timeline_notes.length > 0 ? (
                  consultation.timeline_notes.map((note: any) => (
                    <div
                      key={note.id}
                      className="group border border-border bg-muted/40 rounded-xl p-2.5 relative dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-semibold text-amber-500">
                          {note.user?.name}
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleNoteDelete(note.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-red-500 hover:bg-muted h-5 w-5 rounded-lg shrink-0 dark:hover:bg-zinc-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-foreground/80 mt-1">{note.body}</p>
                      <p className="text-[9px] text-muted-foreground/70 text-right mt-1.5">
                        {new Date(note.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground/70 text-center py-4">Belum ada catatan aktivitas.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reminders List */}
          <Card className="border-border bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground/90">Pengingat Terjadwal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleReminderSubmit} className="space-y-2">
                <div>
                  <Label htmlFor="rem-msg" className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Pesan Reminder</Label>
                  <Input
                    id="rem-msg"
                    placeholder="Hubungi klien untuk survey..."
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    className="h-8 text-xs border-border bg-background focus-visible:ring-amber-500/50 mt-1 dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="h-8 text-xs border-border bg-background focus-visible:ring-amber-500/50 dark:border-zinc-800 dark:bg-zinc-950"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="xs"
                    disabled={createReminderMutation.isPending}
                    className="bg-amber-500 text-zinc-950 hover:bg-amber-400 h-8 font-semibold"
                  >
                    {createReminderMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1" />
                    )}
                    Set
                  </Button>
                </div>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {consultation.reminders && consultation.reminders.length > 0 ? (
                  consultation.reminders.map((rem: any) => (
                    <div
                      key={rem.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-2.5 bg-muted/40 dark:bg-zinc-950/40",
                        rem.is_read ? "border-border dark:border-zinc-800" : "border-amber-500/20"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground/80">{rem.message}</p>
                        <p className="text-[9px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(rem.remind_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {rem.is_read && (
                            <span className="text-green-600 dark:text-green-400 font-semibold">(Selesai)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!rem.is_read && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleReminderDone(rem.id)}
                            disabled={markReminderDoneMutation.isPending}
                            title="Tandai selesai"
                            className="text-muted-foreground/70 hover:text-emerald-600 hover:bg-muted h-6 w-6 rounded-lg dark:hover:text-emerald-400 dark:hover:bg-zinc-800"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleReminderDelete(rem.id)}
                          className="text-muted-foreground/70 hover:text-red-500 hover:bg-muted h-6 w-6 rounded-lg dark:hover:bg-zinc-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground/70 text-center py-2">Tidak ada pengingat.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg bg-muted" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-muted" />
          <Skeleton className="h-4 w-72 bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full bg-muted rounded-xl" />
          <Skeleton className="h-40 w-full bg-muted rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full bg-muted rounded-xl" />
          <Skeleton className="h-64 w-full bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  )
}
