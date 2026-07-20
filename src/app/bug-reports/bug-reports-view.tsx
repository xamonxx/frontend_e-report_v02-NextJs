'use client'

import { useEffect, useState } from 'react'
import {
  useBugReports,
  useBugReport,
  useUpdateBugReportStatus,
  useDeleteBugReport,
  BUG_REPORT_STATUSES,
  type BugReportItem,
  type BugReportStatus,
} from '@/lib/hooks/useBugReports'
import { useAuthStore } from '@/lib/stores/authStore'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomSelect } from '@/components/ui/custom-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  MessageSquareWarning,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ExternalLink,
  ShieldAlert,
  Mail,
  Globe,
  Clock,
  User,
  Cpu,
  Hash,
  Loader2,
  Trash2,
} from 'lucide-react'

const STATUS_META: Record<string, { label: string; tone: string }> = {
  open: { label: 'Baru', tone: 'bg-amber-500/10 text-amber-500 border-amber-500/25' },
  in_progress: { label: 'Diproses', tone: 'bg-blue-500/10 text-blue-500 border-blue-500/25' },
  resolved: { label: 'Selesai', tone: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' },
  closed: { label: 'Ditutup', tone: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25' },
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, tone: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25' }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BugReportsView() {
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<BugReportItem | null>(null)

  const confirm = useConfirm()
  const deleteReport = useDeleteBugReport()

  useEffect(() => {
    setPage(1)
  }, [status])

  const handleDelete = async (report: BugReportItem) => {
    const ok = await confirm({
      title: 'Hapus laporan bug?',
      description: `Tiket ${report.ticket_code} beserta gambarnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      actionLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'destructive',
    })
    if (!ok) return
    deleteReport.mutate(report.id, {
      onSuccess: () => {
        toast.success(`Laporan ${report.ticket_code} dihapus`)
        setSelected((cur) => (cur?.id === report.id ? null : cur))
      },
      onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Gagal menghapus laporan'),
    })
  }

  const { data, isLoading, isFetching, refetch, error } = useBugReports(
    { status, page },
    isSuperAdmin,
  )

  const rows = data?.data ?? []
  const currentPage = data?.current_page ?? 1
  const lastPage = data?.last_page ?? 1
  const total = data?.total ?? 0

  // Access guard â€” the API is super_admin-only; block direct URL access too.
  if (user && !isSuperAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <ShieldAlert className="h-9 w-9 text-muted-foreground/40" />
        <p className="text-sm font-semibold text-foreground">Akses ditolak</p>
        <p className="max-w-xs text-xs">Halaman laporan bug hanya dapat diakses oleh Super Admin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-2 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 sm:h-11 sm:w-11">
            <MessageSquareWarning className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
              Super Admin
            </p>
            <h1 className="text-[1.35rem] font-bold tracking-tight text-foreground sm:text-2xl">
              Laporan Bug
            </h1>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              Laporan bug & error yang dikirim pengguna dari dalam aplikasi.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 w-fit min-w-[7rem] gap-2 rounded-xl border-border/70 bg-card text-sm font-medium text-foreground/90 transition-colors hover:border-amber-500/30 hover:text-amber-500 sm:h-10 lg:self-start dark:border-zinc-800/70"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm dark:border-zinc-800/60 dark:shadow-none">
        <CardContent className="space-y-4 p-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CustomSelect
              value={status}
              onChange={(v) => setStatus(v)}
              placeholder="Semua status"
              options={[
                { value: '', label: 'Semua status' },
                ...Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
              ]}
              className="box-border h-10 w-full rounded-xl border-border/70 bg-background/60 px-3 text-sm sm:h-9 sm:w-52 dark:border-zinc-800 dark:bg-zinc-950/60"
            />
            <p className="text-[11px] font-medium text-muted-foreground">
              {total} laporan
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed border-red-500/30 p-8 text-center">
              <p className="text-sm font-semibold text-red-500">Gagal memuat laporan bug</p>
              <p className="mt-1 text-xs text-muted-foreground">Periksa koneksi lalu coba Refresh.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center sm:p-12 dark:border-zinc-800">
              <MessageSquareWarning className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold">Belum ada laporan bug</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Laporan yang dikirim pengguna akan tampil di sini.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-border/60 lg:block dark:border-zinc-800/60">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/40">
                        <th className="px-4 py-3">Tiket</th>
                        <th className="px-4 py-3">Deskripsi</th>
                        <th className="px-4 py-3">Pelapor</th>
                        <th className="px-4 py-3 text-center">Gambar</th>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70 dark:divide-zinc-800/70">
                      {rows.map((r) => {
                        const meta = statusMeta(r.status)
                        return (
                          <tr
                            key={r.id}
                            onClick={() => setSelected(r)}
                            className="group cursor-pointer transition-colors hover:bg-amber-500/[0.05]"
                          >
                            <td className="px-4 py-3 align-top">
                              <span className="font-mono text-[11px] font-bold text-amber-500">{r.ticket_code}</span>
                            </td>
                            <td className="max-w-[360px] px-4 py-3 align-top">
                              <p className="line-clamp-2 text-foreground/85">{r.description}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-muted-foreground">
                              {r.reporter?.name || r.reporter_email || <span className="italic text-muted-foreground/50">Tamu</span>}
                            </td>
                            <td className="px-4 py-3 text-center align-top">
                              {r.images.length > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-semibold text-foreground/70 dark:bg-zinc-800/60">
                                  <ImageIcon className="h-3 w-3" />
                                  {r.images.length}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">-</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-top text-muted-foreground">
                              {formatDate(r.created_at)}
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <div className="flex items-center justify-end gap-2">
                                <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold', meta.tone)}>
                                  {meta.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(r)
                                  }}
                                  aria-label={`Hapus ${r.ticket_code}`}
                                  title="Hapus laporan"
                                  className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 lg:hidden">
                {rows.map((r) => {
                  const meta = statusMeta(r.status)
                  return (
                    <article
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="cursor-pointer rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm transition-transform active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-950/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-[11px] font-bold text-amber-500">{r.ticket_code}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold', meta.tone)}>
                            {meta.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(r)
                            }}
                            aria-label={`Hapus ${r.ticket_code}`}
                            title="Hapus laporan"
                            className="rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-3 text-[13px] text-foreground/85">{r.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {r.reporter?.name || r.reporter_email || 'Tamu'}
                        </span>
                        {r.images.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {r.images.length} gambar
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 dark:border-zinc-800/60">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Halaman {currentPage} dari {lastPage}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  disabled={currentPage <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-border"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  disabled={currentPage >= lastPage || isFetching}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className="border-border"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BugReportDetailDialog
        report={selected}
        enabled={isSuperAdmin}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
        deleting={deleteReport.isPending}
      />
    </div>
  )
}

function BugReportDetailDialog({
  report,
  enabled,
  onClose,
  onDelete,
  deleting,
}: {
  report: BugReportItem | null
  enabled: boolean
  onClose: () => void
  onDelete: (report: BugReportItem) => void
  deleting: boolean
}) {
  // Fetch the full record (adds ip_address + user_agent) while showing row data instantly.
  const { data: detailRes, isFetching } = useBugReport(report?.id ?? null, enabled && !!report)
  const detail = detailRes?.data
  const updateStatus = useUpdateBugReportStatus()

  // Local status mirror â†’ instant feedback in the drawer while the list refetches.
  const [localStatus, setLocalStatus] = useState<string | undefined>(report?.status)
  useEffect(() => {
    setLocalStatus(report?.status)
  }, [report?.id, report?.status])

  const meta = localStatus ? statusMeta(localStatus) : null

  const handleStatus = (next: BugReportStatus) => {
    if (!report || next === localStatus || updateStatus.isPending) return
    const prev = localStatus
    setLocalStatus(next) // optimistic
    updateStatus.mutate(
      { id: report.id, status: next },
      {
        onSuccess: () => toast.success(`Status diubah ke "${statusMeta(next).label}"`),
        onError: (err: unknown) => {
          setLocalStatus(prev) // rollback
          const msg = err instanceof Error ? err.message : 'Gagal memperbarui status'
          toast.error(msg)
        },
      },
    )
  }

  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!top-0 !right-0 !bottom-0 !left-auto h-dvh max-h-dvh w-full !max-w-lg !translate-x-0 !translate-y-0 overflow-y-auto rounded-none border-border/80 bg-background/95 p-4 shadow-2xl backdrop-blur-sm sm:!max-w-lg sm:p-5 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
        <DialogHeader className="pr-20">
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-amber-500">{report?.ticket_code}</span>
            {meta && (
              <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold', meta.tone)}>
                {meta.label}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>Detail laporan bug dari pengguna.</DialogDescription>
        </DialogHeader>

        {report && (
          <div className="space-y-3 text-xs">
            {/* Status control */}
            <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 dark:border-zinc-800/70">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Ubah Status</p>
                {updateStatus.isPending && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {BUG_REPORT_STATUSES.map((s) => {
                  const m = statusMeta(s)
                  const active = localStatus === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatus(s)}
                      disabled={updateStatus.isPending}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-60',
                        active
                          ? m.tone
                          : 'border-border/70 text-muted-foreground hover:border-amber-500/40 hover:text-foreground dark:border-zinc-800',
                      )}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <DetailBlock icon={MessageSquareWarning} label="Deskripsi">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{report.description}</p>
            </DetailBlock>

            {report.images.length > 0 && (
              <DetailBlock icon={ImageIcon} label={`Gambar (${report.images.length})`}>
                <div className="grid grid-cols-3 gap-2">
                  {report.images.map((src, i) => (
                    <a
                      key={i}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border/70 dark:border-zinc-800"
                      title="Buka gambar ukuran penuh"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Lampiran ${i + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </a>
                  ))}
                </div>
              </DetailBlock>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow icon={User} label="Pelapor" value={report.reporter?.name || 'Tamu (tidak login)'} />
              <DetailRow icon={Mail} label="Email">
                {report.reporter_email ? (
                  <a href={`mailto:${report.reporter_email}`} className="text-amber-500 hover:underline">
                    {report.reporter_email}
                  </a>
                ) : (
                  '-'
                )}
              </DetailRow>
              <DetailRow icon={Clock} label="Waktu" value={formatDate(report.created_at)} />
              <DetailRow icon={Hash} label="ID" value={`#${report.id}`} />
            </div>

            <DetailBlock icon={Globe} label="Halaman (URL)">
              {report.page_url ? (
                <a
                  href={report.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all text-amber-500 hover:underline"
                >
                  {report.page_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </DetailBlock>

            {/* Technical context (from the show endpoint) */}
            <DetailBlock icon={Cpu} label="Konteks Teknis">
              {isFetching && !detail ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> memuat...
                </span>
              ) : (
                <div className="space-y-1 text-muted-foreground">
                  <p><span className="font-semibold text-foreground/70">IP:</span> {detail?.ip_address || '-'}</p>
                  <p className="break-all"><span className="font-semibold text-foreground/70">User Agent:</span> {detail?.user_agent || '-'}</p>
                </div>
              )}
            </DetailBlock>

            {/* Danger zone */}
            <button
              type="button"
              onClick={() => onDelete(report)}
              disabled={deleting}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Laporan
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 dark:border-zinc-800/70">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-3 dark:border-zinc-800/70">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      </div>
      <div className="pl-[18px] font-medium text-foreground/85">{children ?? value ?? '-'}</div>
    </div>
  )
}
