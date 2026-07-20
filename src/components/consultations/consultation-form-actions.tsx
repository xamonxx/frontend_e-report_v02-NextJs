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
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_16px_40px_-32px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/[0.03] dark:border-white/[0.07]">
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-warning-500)_12%,transparent)] px-2.5 py-1 text-[11px] font-bold text-[color-mix(in_srgb,var(--color-warning-600)_70%,black)] dark:text-[color:var(--color-warning-500)]">
            <CircleAlert className="size-3.5" />
            Pilih minimal 1
          </span>
        )}
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_112px] xl:grid-cols-1 min-[1440px]:grid-cols-[minmax(0,1fr)_112px]">
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-xl bg-amber-500 font-bold text-[color:var(--primary-theme-foreground)] shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--primary-theme)_70%,transparent)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-amber-400 hover:shadow-[0_14px_28px_-14px_color-mix(in_srgb,var(--primary-theme)_80%,transparent)] focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-px active:bg-amber-600 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <><Loader2 className="mr-2 size-4 animate-spin" />{pendingLabel}</>
          ) : (
            <><Save className="mr-1.5 size-4" />{submitLabel}</>
          )}
        </Button>

        {/* Aksi sekunder sengaja ringan (ghost) agar CTA utama dominan. */}
        <Link
          href={cancelHref}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'h-11 w-full rounded-xl font-semibold text-muted-foreground transition-[background-color,color,transform] duration-200 hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 active:translate-y-px',
          )}
        >
          Batal
        </Link>
      </div>
    </div>
  )
}
