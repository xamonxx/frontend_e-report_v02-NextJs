'use client'

import { use, useEffect, useRef, useState } from 'react'
import {
  useConsultation,
  useUpdateConsultationStatus,
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
  useDeleteNotes,
  useClearNotes,
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  MessageCircle,
  EllipsisVertical,
  ListChecks,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn, rawPhoneDigits, productCategoryNames } from '@/lib/utils'
import { CustomSelect } from '@/components/ui/custom-select'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { isSuperAdmin } from '@/lib/auth/roles'
import { useAuthStore } from '@/lib/stores/authStore'

type PageParams = {
  id: string
}

export default function ConsultationDetailPage({ params }: { params: Promise<PageParams> }) {
  const confirm = useConfirm()
  const currentUser = useAuthStore((state) => state.user)
  const resolvedParams = use(params)
  const consultationId = parseInt(resolvedParams.id, 10)

  const { data: detailResponse, isLoading, error } = useConsultation(consultationId)
  const consultation = detailResponse?.data

  const { data: statuses } = useStatusCategories()

  const updateStatusMutation = useUpdateConsultationStatus(consultationId)
  const createNoteMutation = useCreateNote(consultationId)
  const deleteNoteMutation = useDeleteNote(consultationId)
  const updateNoteMutation = useUpdateNote(consultationId)
  const deleteNotesMutation = useDeleteNotes(consultationId)
  const clearNotesMutation = useClearNotes(consultationId)
  const createReminderMutation = useCreateReminder(consultationId)
  const deleteReminderMutation = useDeleteReminder(consultationId)
  const markReminderDoneMutation = useMarkReminderDone(consultationId)

  const [noteBody, setNoteBody] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([])
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const chatViewportRef = useRef<HTMLDivElement>(null)
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

  const noteCount = consultation?.timeline_notes?.length ?? 0

  useEffect(() => {
    const viewport = chatViewportRef.current
    if (!viewport || noteCount === 0) return

    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: noteCount > 1 ? 'smooth' : 'auto',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [noteCount])

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
  const chatNotes = [...(consultation.timeline_notes ?? [])].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  )
  const canManageAnyChat = chatNotes.some(
    (note) =>
      note.user?.id === currentUser?.id
      || Boolean(currentUser && isSuperAdmin(currentUser))
  )

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

  const submitNote = () => {
    const body = noteBody.trim()
    if (!body || createNoteMutation.isPending) return

    createNoteMutation.mutate(body, {
      onSuccess: () => {
        setNoteBody('')
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal menambahkan catatan')
      },
    })
  }

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitNote()
  }

  const handleNoteDelete = async (noteId: number) => {
    const isConfirmed = await confirm({
      title: 'Hapus pesan?',
      description: 'Pesan akan dihapus dari riwayat percakapan konsultasi.',
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })

    if (isConfirmed) {
      deleteNoteMutation.mutate(noteId, {
        onSuccess: () => {
          toast.success('Pesan berhasil dihapus')
        },
        onError: () => {
          toast.error('Gagal menghapus pesan')
        },
      })
    }
  }

  const toggleSelectedNote = (noteId: number) => {
    setSelectedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId]
    )
  }

  const closeSelectionMode = () => {
    setSelectionMode(false)
    setSelectedNoteIds([])
  }

  const handleSelectedNotesDelete = async () => {
    if (selectedNoteIds.length === 0) return

    const isConfirmed = await confirm({
      title: `Hapus ${selectedNoteIds.length} pesan?`,
      description: 'Pesan yang dipilih akan dihapus permanen dari percakapan.',
      actionLabel: 'Hapus pesan',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })
    if (!isConfirmed) return

    deleteNotesMutation.mutate(selectedNoteIds, {
      onSuccess: (response) => {
        closeSelectionMode()
        toast.success(response.message)
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal menghapus pesan yang dipilih')
      },
    })
  }

  const startEditingNote = (noteId: number, body: string) => {
    setEditingNoteId(noteId)
    setEditBody(body)
    closeSelectionMode()
  }

  const handleSelectedNoteEdit = () => {
    if (selectedNoteIds.length !== 1) return

    const note = chatNotes.find((item) => item.id === selectedNoteIds[0])
    if (!note || note.user?.id !== currentUser?.id) return
    startEditingNote(note.id, note.body)
  }

  const handleNoteUpdate = () => {
    const body = editBody.trim()
    if (!editingNoteId || !body || updateNoteMutation.isPending) return

    updateNoteMutation.mutate(
      { noteId: editingNoteId, body },
      {
        onSuccess: () => {
          setEditingNoteId(null)
          setEditBody('')
          toast.success('Pesan berhasil diperbarui')
        },
        onError: (err: any) => {
          toast.error(err.message || 'Gagal memperbarui pesan')
        },
      }
    )
  }

  const handleClearNotes = async () => {
    const clearingAll = Boolean(currentUser && isSuperAdmin(currentUser))
    const isConfirmed = await confirm({
      title: clearingAll ? 'Bersihkan seluruh chat?' : 'Hapus semua pesan Anda?',
      description: clearingAll
        ? 'Semua pesan dalam percakapan ini akan dihapus permanen.'
        : 'Hanya pesan yang Anda kirim dalam percakapan ini yang akan dihapus.',
      actionLabel: clearingAll ? 'Bersihkan chat' : 'Hapus pesan saya',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })
    if (!isConfirmed) return

    clearNotesMutation.mutate(undefined, {
      onSuccess: (response) => {
        closeSelectionMode()
        setEditingNoteId(null)
        toast.success(response.message)
      },
      onError: (err: any) => {
        toast.error(err.message || 'Gagal membersihkan percakapan')
      },
    })
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

          {/* Timeline Notes */}
          <Card className="consultation-card overflow-hidden">
              <CardHeader className="border-b border-border/55 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--primary-theme)_10%,var(--card))] text-[var(--primary-theme)]">
                    <MessageCircle className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold text-foreground/90">
                      Percakapan & Catatan
                    </CardTitle>
                    <CardDescription className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/70">
                      Koordinasi tindak lanjut untuk {consultation.client_name || 'lead ini'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full border border-border/60 bg-muted/35 px-2 py-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {chatNotes.length} pesan
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          className="size-8 rounded-lg text-muted-foreground"
                          aria-label="Buka menu percakapan"
                          title="Menu percakapan"
                        />
                      }
                    >
                      <EllipsisVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        disabled={!canManageAnyChat}
                        onClick={() => {
                          setSelectionMode(true)
                          setSelectedNoteIds([])
                          setEditingNoteId(null)
                        }}
                        className="py-2 text-xs"
                      >
                        <ListChecks className="size-4" />
                        Pilih pesan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canManageAnyChat || clearNotesMutation.isPending}
                        onClick={() => void handleClearNotes()}
                        className="py-2 text-xs"
                      >
                        <Trash2 className="size-4" />
                        {currentUser && isSuperAdmin(currentUser)
                          ? 'Bersihkan semua chat'
                          : 'Hapus semua pesan saya'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              </CardHeader>

              <CardContent className="p-0">
              {selectionMode && (
                <div className="flex min-h-12 items-center gap-2 border-b border-border/55 bg-muted/30 px-3 py-2 sm:px-4">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={closeSelectionMode}
                    className="size-8 rounded-lg"
                    title="Batal memilih"
                    aria-label="Batal memilih pesan"
                  >
                    <X className="size-4" />
                  </Button>
                  <span className="min-w-0 flex-1 text-xs font-semibold text-foreground/80">
                    {selectedNoteIds.length} pesan dipilih
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      selectedNoteIds.length !== 1
                      || chatNotes.find((note) => note.id === selectedNoteIds[0])?.user?.id !== currentUser?.id
                    }
                    onClick={handleSelectedNoteEdit}
                    className="h-8 gap-1.5 rounded-lg px-2.5 text-[11px]"
                  >
                    <Edit className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={selectedNoteIds.length === 0 || deleteNotesMutation.isPending}
                    onClick={() => void handleSelectedNotesDelete()}
                    className="h-8 gap-1.5 rounded-lg px-2.5 text-[11px]"
                  >
                    {deleteNotesMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Hapus
                  </Button>
                </div>
              )}
              <div
                ref={chatViewportRef}
                role="log"
                aria-live="polite"
                aria-label="Riwayat percakapan konsultasi"
                className="max-h-[360px] min-h-[210px] space-y-4 overflow-y-auto scroll-smooth bg-background/20 px-3 py-4 sm:max-h-[410px] sm:px-4"
              >
                {chatNotes.length > 0 ? (
                  chatNotes.map((note) => {
                    const authorName = note.user?.name?.trim() || 'Tim'
                    const isOwn = note.user?.id === currentUser?.id
                    const canDelete = isOwn || Boolean(currentUser && isSuperAdmin(currentUser))
                    const isSelected = selectedNoteIds.includes(note.id)
                    const isEditing = editingNoteId === note.id
                    const authorInitial = authorName.slice(0, 2).toUpperCase()

                    return (
                      <div
                        key={note.id}
                        className={cn(
                          'flex min-w-0 items-center gap-2.5',
                          isOwn ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {selectionMode && canDelete && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectedNote(note.id)}
                            aria-label={`Pilih pesan dari ${authorName}`}
                            className={cn(
                              'mx-1 size-5 border-border/80',
                              isSelected && 'border-[var(--primary-theme)] bg-[var(--primary-theme)]'
                            )}
                          />
                        )}
                        {!isOwn && (
                          <span
                            aria-hidden="true"
                            className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-[10px] font-black text-[var(--primary-theme)]"
                          >
                            {authorInitial}
                          </span>
                        )}

                        <div className={cn('min-w-0 max-w-[82%] sm:max-w-[72%]', isOwn && 'items-end')}>
                          <div className={cn('mb-1 flex items-center gap-2 px-1', isOwn && 'justify-end')}>
                            <span className="truncate text-[10px] font-bold text-foreground/75">
                              {isOwn ? 'Anda' : authorName}
                            </span>
                            <time className="shrink-0 text-[9px] tabular-nums text-muted-foreground/70">
                              {new Date(note.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                          </div>

                          <div className={cn('group flex items-end gap-1', isOwn && 'flex-row-reverse')}>
                            <article
                              className={cn(
                                'min-w-0 border px-3 py-2.5 text-xs leading-relaxed text-foreground/90',
                                isOwn
                                  ? 'rounded-[14px] rounded-br-[4px] border-[color-mix(in_srgb,var(--primary-theme)_24%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_13%,var(--card))]'
                                  : 'rounded-[14px] rounded-bl-[4px] border-border/55 bg-muted/55',
                                isSelected && 'border-[var(--primary-theme)] bg-[color-mix(in_srgb,var(--primary-theme)_18%,var(--card))]'
                              )}
                            >
                              {isEditing ? (
                                <div className="min-w-[min(18rem,65vw)] space-y-2">
                                  <Textarea
                                    value={editBody}
                                    maxLength={2000}
                                    rows={3}
                                    autoFocus
                                    onChange={(event) => setEditBody(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === 'Enter'
                                        && !event.shiftKey
                                        && !event.nativeEvent.isComposing
                                      ) {
                                        event.preventDefault()
                                        handleNoteUpdate()
                                      }
                                      if (event.key === 'Escape') {
                                        setEditingNoteId(null)
                                        setEditBody('')
                                      }
                                    }}
                                    className="min-h-20 resize-none bg-background/70 text-xs"
                                    aria-label="Edit isi pesan"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingNoteId(null)
                                        setEditBody('')
                                      }}
                                      className="h-7 rounded-md px-2 text-[10px]"
                                    >
                                      Batal
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={handleNoteUpdate}
                                      disabled={!editBody.trim() || updateNoteMutation.isPending}
                                      className="h-7 rounded-md px-2 text-[10px]"
                                    >
                                      {updateNoteMutation.isPending && (
                                        <Loader2 className="size-3 animate-spin" />
                                      )}
                                      Simpan
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap break-words">{note.body}</p>
                              )}
                            </article>

                            {!selectionMode && !isEditing && canDelete && (
                              <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                                {isOwn && (
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={() => startEditingNote(note.id, note.body)}
                                    className="size-7 rounded-lg text-muted-foreground/60 hover:text-foreground"
                                    title="Edit pesan"
                                    aria-label="Edit pesan"
                                  >
                                    <Edit className="size-3" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={() => handleNoteDelete(note.id)}
                                  className="size-7 rounded-lg text-muted-foreground/60 hover:bg-red-500/10 hover:text-red-500"
                                  title="Hapus pesan"
                                  aria-label={`Hapus pesan dari ${authorName}`}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex min-h-[190px] flex-col items-center justify-center px-6 text-center">
                    <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <MessageCircle className="size-5" />
                    </span>
                    <p className="mt-3 text-xs font-semibold text-foreground/80">Belum ada percakapan</p>
                    <p className="mt-1 max-w-[28ch] text-[11px] leading-relaxed text-muted-foreground">
                      Pesan pertama akan menjadi awal riwayat tindak lanjut konsumen.
                    </p>
                  </div>
                )}
              </div>

              <form
                onSubmit={handleNoteSubmit}
                className="flex items-end gap-2 border-t border-border/55 bg-card/95 p-3"
              >
                <Textarea
                  aria-label="Tulis pesan atau catatan"
                  placeholder="Tulis pesan atau catatan..."
                  value={noteBody}
                  maxLength={2000}
                  rows={1}
                  onChange={(event) => setNoteBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter'
                      && !event.shiftKey
                      && !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault()
                      submitNote()
                    }
                  }}
                  className="max-h-24 min-h-10 resize-none rounded-[10px] border-border/70 bg-background/60 px-3 py-2.5 text-xs leading-relaxed focus-visible:border-[var(--primary-theme)] focus-visible:ring-[color-mix(in_srgb,var(--primary-theme)_18%,transparent)]"
                />
                <Button
                  type="submit"
                  disabled={!noteBody.trim() || createNoteMutation.isPending}
                  className="consultation-primary-action size-10 shrink-0 rounded-[10px] p-0"
                  title="Kirim pesan"
                  aria-label="Kirim pesan"
                >
                  {createNoteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
              </CardContent>
          </Card>

        </div>

        <div className="space-y-5 lg:col-span-1 lg:self-start">
          <SurveyRequestCard
            consultation={consultation}
            isAtSurveyStage={isAtSurveyStage}
            autoOpenSignal={surveyPromptSignal}
          />

          {/* Reminders List */}
          <Card className="consultation-card overflow-hidden">
            <CardHeader className="border-b border-border/55 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground/90">Pengingat</CardTitle>
                  <CardDescription className="mt-0.5 text-[11px] text-muted-foreground/70">
                    Follow-up berikutnya untuk lead ini.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                  {consultation.reminders?.filter((rem: any) => !rem.is_read).length ?? 0} aktif
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <form onSubmit={handleReminderSubmit} className="rounded-xl border border-border/60 bg-muted/25 p-3 dark:bg-zinc-950/25">
                <div className="space-y-2">
                  <Label htmlFor="rem-msg" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Pesan Reminder</Label>
                  <Input
                    id="rem-msg"
                    placeholder="Hubungi klien untuk survey..."
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    className="text-xs"
                  />
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1 2xl:grid-cols-[1fr_auto]">
                    <Input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="submit"
                      size="xs"
                      disabled={createReminderMutation.isPending}
                      className="consultation-primary-action h-11 rounded-[10px] px-4 font-semibold sm:min-w-24"
                    >
                      {createReminderMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 mr-1" />
                      )}
                      Set
                    </Button>
                  </div>
                </div>
              </form>

              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {consultation.reminders && consultation.reminders.length > 0 ? (
                  consultation.reminders.map((rem: any) => (
                    <div
                      key={rem.id}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-xl border p-3 bg-muted/35 dark:bg-zinc-950/35",
                        rem.is_read ? "border-border/70 dark:border-zinc-800" : "border-amber-500/30 bg-amber-500/5"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground/80">{rem.message}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground/70">
                          <Clock className="h-3 w-3 shrink-0" />
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
                            <span className="text-[10px] text-muted-foreground/60">
                              (oleh {rem.creator.name})
                            </span>
                          )}
                          {rem.is_read && (
                            <span className="font-semibold text-green-600 dark:text-green-400">(Selesai)</span>
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
