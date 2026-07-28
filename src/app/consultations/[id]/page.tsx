'use client'

import { use, useEffect, useState } from 'react'
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
import SurveyRequestCard from '@/components/consultations/survey-request-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { cn, rawPhoneDigits, productCategoryNames } from '@/lib/utils'
import { CustomSelect } from '@/components/ui/custom-select'
import { useConfirm } from '@/components/ui/confirm-dialog'

type PageParams = {
  id: string
}

export default function ConsultationDetailPage({ params }: { params: Promise<PageParams> }) {
  const confirm = useConfirm()
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
  // Dinaikkan tiap status berpindah ke Request Survey; kartu survey memakainya
  // sebagai pemicu membuka form pengajuan secara otomatis.
  const [surveyPromptSignal, setSurveyPromptSignal] = useState(0)

  // Datang dari halaman create dengan status Request Survey: buka formnya
  // sekali begitu data lead selesai dimuat.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('prompt_survey') !== '1') return

    setSurveyPromptSignal((value) => value + 1)
    // Bersihkan query supaya refresh halaman tidak membuka modal lagi.
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

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

  const surveyStageName = 'request survey'
  const isAtSurveyStage =
    (consultation.status_category?.name ?? '').trim().toLowerCase() === surveyStageName

  const handleStatusChange = (statusIdStr: string) => {
    const statusId = parseInt(statusIdStr, 10)
    const nextStatus = statuses?.find((s) => s.id === statusId)
    const movesToSurveyStage =
      (nextStatus?.name ?? '').trim().toLowerCase() === surveyStageName

    updateStatusMutation.mutate(statusId, {
      onSuccess: () => {
        toast.success('Status lead berhasil diperbarui')

        // Baru masuk tahap survey dan belum pernah diajukan: langsung tawarkan
        // formnya supaya lead tidak menggantung tanpa diteruskan ke manager.
        if (movesToSurveyStage && !consultation.active_survey) {
          setSurveyPromptSignal((value) => value + 1)
        }
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

  const handleNoteDelete = async (noteId: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Catatan?',
      description: 'Hapus catatan ini dari timeline?',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
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

  const handleReminderDelete = async (reminderId: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus Pengingat?',
      description: 'Hapus reminder ini?',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
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
  const emergencyWhatsappNumber = consultation.emergency_phone ? rawPhoneDigits(consultation.emergency_phone) : ''

  return (
    <div className="consultation-page mx-auto w-full max-w-[1520px] space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
              className="h-11 w-[190px] text-xs font-semibold"
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
          <Card className="consultation-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground/90">Informasi Klien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nama Lengkap */}
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Nama Lengkap</p>
                    <p className="text-xs text-foreground/80 font-medium">{consultation.client_name}</p>
                  </div>
                </div>

                {/* No. Telepon / WhatsApp */}
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

                {/* No. Telepon Darurat */}
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">No. Telepon Darurat</p>
                    {consultation.emergency_phone ? (
                      <a
                        href={`https://wa.me/${emergencyWhatsappNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-semibold hover:text-amber-400 transition-colors dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {consultation.emergency_phone}
                      </a>
                    ) : (
                      <p className="text-xs text-foreground/80 font-medium">Tidak dicantumkan</p>
                    )}
                  </div>
                </div>

                {/* Tanggal Konsultasi */}
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

                {/* Kategori Kebutuhan — satu lead bisa punya beberapa kategori */}
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Kategori Kebutuhan</p>
                    {(() => {
                      const categories = productCategoryNames(consultation)

                      if (categories.length === 0) {
                        return <p className="text-xs text-foreground/80 font-medium">Kebutuhan Umum</p>
                      }

                      return (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {categories.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Alamat Lengkap */}
                {consultation.address && (
                  <div className="flex items-start gap-3 sm:col-span-2 border-t border-border/40 pt-4 dark:border-zinc-800/40">
                    <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Alamat Lengkap</p>
                      <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                        {consultation.address}
                      </p>
                    </div>
                  </div>
                )}

                {/* Region Sub-grid (Kecamatan, Kota / Kabupaten, Provinsi) */}
                {(consultation.district || consultation.city || consultation.province) && (
                  <div className={cn(
                    "grid gap-4 sm:grid-cols-3 sm:col-span-2 pt-4",
                    consultation.address ? "border-t border-border/20 dark:border-zinc-800/20" : "border-t border-border/40 dark:border-zinc-800/40"
                  )}>
                    {consultation.district && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Kecamatan</p>
                          <p className="text-xs text-foreground/80 font-medium">{consultation.district}</p>
                        </div>
                      </div>
                    )}

                    {consultation.city && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Kota / Kabupaten</p>
                          <p className="text-xs text-foreground/80 font-medium">{consultation.city}</p>
                        </div>
                      </div>
                    )}

                    {consultation.province && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Provinsi</p>
                          <p className="text-xs text-foreground/80 font-medium">{consultation.province}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback if everything is empty */}
                {!consultation.address && !consultation.district && !consultation.city && !consultation.province && (
                  <div className="flex items-start gap-3 sm:col-span-2 border-t border-border/40 pt-4 dark:border-zinc-800/40">
                    <MapPin className="h-4 w-4 text-muted-foreground/70 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Alamat Lengkap</p>
                      <p className="text-xs text-foreground/80 font-medium">-</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product requirements detail box */}
          <Card className="consultation-card">
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
          <SurveyRequestCard
            consultation={consultation}
            isAtSurveyStage={isAtSurveyStage}
            autoOpenSignal={surveyPromptSignal}
          />

          {/* Timeline Notes */}
          <Card className="consultation-card">
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
                  className="flex-1 text-xs"
                />
                <Button
                  type="submit"
                  size="xs"
                  disabled={createNoteMutation.isPending}
                  className="consultation-primary-action size-11 shrink-0 rounded-[10px] p-0 font-semibold"
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
          <Card className="consultation-card">
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
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="xs"
                    disabled={createReminderMutation.isPending}
                    className="consultation-primary-action h-11 rounded-[10px] px-4 font-semibold"
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
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {rem.creator && (
                            <span className="text-[9px] text-muted-foreground/60 italic ml-1">
                              (oleh {rem.creator.name})
                            </span>
                          )}
                          {rem.is_read && (
                            <span className="text-green-600 dark:text-green-400 font-semibold ml-1">(Selesai)</span>
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
