'use client'

import { useState } from 'react'
import { useDebounce } from 'use-debounce'
import { toast } from 'sonner'
import { Loader2, ArchiveRestore, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTrashedConsultations, useRestoreConsultation } from '@/lib/hooks/useConsultations'
import { getErrorMessage } from '@/lib/api/errors'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ArsipTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch] = useDebounce(searchTerm, 400)
  const [page, setPage] = useState(1)

  const { data: response, isLoading } = useTrashedConsultations({ search: debouncedSearch || undefined, page })
  const restoreMutation = useRestoreConsultation()

  const items = response?.data ?? []
  const meta = response?.meta

  const handleRestore = async (id: number, clientName: string) => {
    try {
      await restoreMutation.mutateAsync(id)
      toast.success(`Konsultasi "${clientName}" berhasil dipulihkan.`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal memulihkan data konsultasi.'))
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
        <Input
          placeholder="Cari nama klien atau ID konsul..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPage(1)
          }}
          className="h-11 rounded-xl border-border/60 bg-muted pl-10 text-sm shadow-none dark:border-zinc-800 dark:bg-zinc-900"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Belum ada data konsultasi yang diarsipkan.
          </div>
        ) : (
          <div className="divide-y divide-border/60 dark:divide-zinc-800">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.client_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.consultation_id} · {item.account?.name || '-'} · {item.phone || '-'}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground/70">
                    Konsul: {formatDate(item.consultation_date)} · Dihapus: {formatDate(item.deleted_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={restoreMutation.isPending}
                  onClick={() => handleRestore(item.id, item.client_name)}
                  className="h-8 shrink-0 gap-1.5 rounded-lg border-amber-500/40 text-[11px] font-semibold text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                >
                  <ArchiveRestore className="size-3.5" />
                  Pulihkan
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="xs"
            disabled={meta.current_page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 rounded-xl border-border bg-card disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold text-muted-foreground px-2">
            Halaman {meta.current_page} dari {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={meta.current_page >= meta.last_page}
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            className="h-8 rounded-xl border-border bg-card disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
