import Link from 'next/link'
import { CheckCircle2, CircleAlert, Loader2, Save } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConsultationFormActionsProps = {
  cancelHref: string
  isPending: boolean
  pendingLabel: string
  selectedCount: number
  submitLabel: string
}

/**
 * Kartu aksi form konsultasi: strip status kategori + tombol simpan/batal.
 * Warna status memakai token semantik dari design-tokens.css; teks pill di
 * light mode digelapkan lewat color-mix karena success/warning-600 tidak
 * cukup kontras di atas permukaan terang (< 3:1).
 */
export function ConsultationFormActions({
  cancelHref,
  isPending,
  pendingLabel,
  selectedCount,
  submitLabel,
}: ConsultationFormActionsProps) {
  const ready = selectedCount > 0

  return (
    <div className="consultation-card overflow-hidden bg-card">
      {/* Strip status: berubah warna begitu minimal satu kategori dicentang. */}
      <div
        aria-live="polite"
        className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5 dark:border-white/[0.05]"
      >
        <span className="text-[11px] font-semibold text-foreground/70">Kategori dipilih</span>
        {ready ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-success-500)_12%,transparent)] px-2.5 py-1 text-[11px] font-bold text-[color-mix(in_srgb,var(--color-success-600)_70%,black)] dark:text-[color:var(--color-success-500)]">
            <CheckCircle2 className="size-3.5" />
            {selectedCount} kategori
          </span>
        ) : (
          // Kategori tidak lagi wajib: backend mengisinya "Tidak konfirmasi".
          // Strip ini sekadar memberi tahu, bukan menuntut.
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <CircleAlert className="size-3.5" />
            Kosong &rarr; Tidak konfirmasi
          </span>
        )}
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_112px] xl:grid-cols-1 min-[1440px]:grid-cols-[minmax(0,1fr)_112px]">
        <Button
          type="submit"
          disabled={isPending}
          className="consultation-primary-action h-11 w-full rounded-[10px] font-bold transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[0_14px_28px_-14px_color-mix(in_srgb,var(--primary-theme)_80%,transparent)] focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-px disabled:cursor-not-allowed"
        >
          {isPending ? (
            <><Loader2 className="mr-2 size-4 animate-spin" />{pendingLabel}</>
          ) : (
            <><Save className="mr-1.5 size-4" />{submitLabel}</>
          )}
        </Button>

        <Link
          href={cancelHref}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'consultation-secondary-action h-11 w-full rounded-[10px] font-semibold transition-[border-color,background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-px',
          )}
        >
          Batal
        </Link>
      </div>
    </div>
  )
}
