'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FileImage, FileDown } from 'lucide-react'
import { saveCardAsPng, saveCardAsPdf } from '@/lib/export-card'
import { cn } from '@/lib/utils'

const BTN_CLASS =
  'shrink-0 h-8 gap-1.5 rounded-xl border-border/80 bg-card text-foreground/80 hover:bg-muted hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 text-[11px] font-semibold transition-all duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/45 dark:text-zinc-300 dark:hover:bg-zinc-800/60'

/**
 * "Save PNG / Save PDF" buttons for a card. Drop this anywhere inside a
 * <Card> header — it locates its enclosing card via `closest('[data-slot="card"]')`
 * at click time, so no per-card ref wiring is needed. The wrapper carries
 * `print:hidden` so the buttons are excluded from the exported image/PDF.
 *
 * @param filename Base name for the downloaded file (without extension) and the
 *                 PDF document title.
 * @param compact  When true, render icon-only buttons (for tight card headers).
 */
export function CardExportButtons({ filename, compact = false }: { filename: string; compact?: boolean }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const getCard = () => (anchorRef.current?.closest('[data-slot="card"]') as HTMLElement | null)

  return (
    <div ref={anchorRef} className="flex items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={() => saveCardAsPng(getCard(), filename)}
        className={cn(BTN_CLASS, 'px-2 sm:px-3')}
        title="Simpan kartu ini sebagai gambar PNG"
        aria-label="Save PNG"
      >
        <FileImage className="h-3.5 w-3.5" />
        {!compact && <span className="hidden sm:inline">Save PNG</span>}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => saveCardAsPdf(getCard(), filename)}
        className={cn(BTN_CLASS, 'px-2 sm:px-3')}
        title="Simpan kartu ini sebagai PDF"
        aria-label="Save PDF"
      >
        <FileDown className="h-3.5 w-3.5" />
        {!compact && <span className="hidden sm:inline">Save PDF</span>}
      </Button>
    </div>
  )
}
