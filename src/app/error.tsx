'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

/**
 * Route-segment error boundary. Renders when a page (or its data) throws at
 * runtime while the app shell is still alive. `reset()` re-renders the segment
 * without a full reload. For fatal errors in the root layout itself, see
 * global-error.tsx; for server-down/maintenance, the host serves
 * /maintenance.html (static).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error for debugging; replace with your logger if needed.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold text-foreground">Terjadi Kesalahan</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Maaf, halaman ini gagal dimuat. Anda dapat mencoba memuatnya kembali.
      </p>

      {error?.digest && (
        <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          Ref: {error.digest}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-zinc-950 transition-opacity hover:opacity-90 active:scale-95 cursor-pointer"
          style={{ backgroundColor: 'var(--primary-theme)' }}
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
        <a
          href="/dashboard"
          className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
        >
          Ke Dashboard
        </a>
      </div>
    </div>
  )
}
