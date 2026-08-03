'use client'

import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[75vh] w-full flex-col items-center justify-center gap-4 text-zinc-400">
      <div className="relative flex items-center justify-center">
        {/* Pulsing background ring */}
        <span className="absolute h-10 w-10 animate-ping rounded-full bg-amber-500/10 opacity-75" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-theme, #f59e0b) 10%, transparent)' }} />
        <Loader2 
          className="h-8 w-8 animate-spin text-amber-500" 
          style={{ color: 'var(--primary-theme, #f59e0b)', filter: 'drop-shadow(0 0 8px var(--primary-theme, #f59e0b))' }}
        />
      </div>
      <div className="flex animate-pulse flex-col items-center gap-1 text-center">
        <span className="text-xs font-black tracking-widest uppercase text-zinc-400 dark:text-zinc-500">
          Memuat Halaman
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-600">
          Menghubungkan ke API...
        </span>
      </div>
    </div>
  )
}
