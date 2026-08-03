'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bug, X, ImagePlus, Loader2, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useReportBug } from '@/lib/hooks/useReportBug'
import type { ApiError } from '@/types'

// Keep these in lockstep with the backend BugReportRequest rules.
const MAX_IMAGES = 3
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MIN_DESC = 10
const MAX_DESC = 2000

type Preview = { file: File; url: string }

export default function BugReportWidget() {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [previews, setPreviews] = useState<Preview[]>([])
  const [descError, setDescError] = useState<string | null>(null)
  // Honeypot — must stay empty. Real users never see this field.
  const honeypotRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reportBug = useReportBug()

  // Revoke object URLs to avoid memory leaks.
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url))
  }, [previews])

  const resetForm = useCallback(() => {
    setDescription('')
    setEmail('')
    setDescError(null)
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return []
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    resetForm()
  }, [resetForm])

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const incoming = Array.from(fileList)
    const accepted: Preview[] = []

    for (const file of incoming) {
      if (previews.length + accepted.length >= MAX_IMAGES) {
        toast.error(`Maksimal ${MAX_IMAGES} gambar.`)
        break
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" bukan format yang didukung (JPG, PNG, WEBP).`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" melebihi 2MB.`)
        continue
      }
      accepted.push({ file, url: URL.createObjectURL(file) })
    }

    if (accepted.length) setPreviews((prev) => [...prev, ...accepted])
    // Allow re-selecting the same file after removal.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setPreviews((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return next
    })
  }

  const validate = (): boolean => {
    const trimmed = description.trim()
    if (trimmed.length < MIN_DESC) {
      setDescError(`Penjelasan terlalu singkat (minimal ${MIN_DESC} karakter).`)
      return false
    }
    if (trimmed.length > MAX_DESC) {
      setDescError(`Penjelasan terlalu panjang (maksimal ${MAX_DESC} karakter).`)
      return false
    }
    setDescError(null)
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Honeypot tripped → silently pretend success (don't tip off bots).
    if (honeypotRef.current?.value) {
      close()
      return
    }
    if (!validate()) return

    const fd = new FormData()
    fd.append('description', description.trim())
    if (email.trim()) fd.append('reporter_email', email.trim())
    fd.append('page_url', typeof window !== 'undefined' ? window.location.href : '')
    previews.forEach((p) => fd.append('images[]', p.file))

    reportBug.mutate(fd, {
      onSuccess: (res) => {
        toast.success(res.message, { description: `Tiket: ${res.ticket_code}` })
        close()
      },
      onError: (err) => {
        const apiErr = err as ApiError
        const firstFieldError = apiErr.errors
          ? Object.values(apiErr.errors)[0]?.[0]
          : undefined
        toast.error(firstFieldError || apiErr.message || 'Gagal mengirim laporan.')
      },
    })
  }

  const descLen = description.trim().length
  const isSubmitting = reportBug.isPending

  return (
    <>
      {/* ─── Floating trigger ─── */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Laporkan bug"
          className={cn(
            'group flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-[color,transform] duration-200 hover:scale-[1.04] active:scale-95 cursor-pointer',
            'border-zinc-200 bg-white/90 text-zinc-600 hover:text-amber-600 shadow-black/5',
            'dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:text-amber-400 dark:shadow-black/40'
          )}
        >
          <Bug className="h-4 w-4 text-amber-500 transition-transform group-hover:rotate-12" />
          <span className="hidden sm:inline">Laporkan Bug</span>
        </button>
      </div>

      {/* ─── Modal ─── */}
      {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 duration-200 animate-in fade-in">
            <div className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm" onClick={close} />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="bug-title"
              className="relative w-full max-w-[460px] max-h-[90vh] overflow-y-auto rounded-[24px] border border-zinc-200 bg-white shadow-2xl shadow-black/20 duration-300 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-[#12121a] dark:shadow-black/70"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent dark:via-amber-500/50" />

              <button
                type="button"
                onClick={close}
                aria-label="Tutup"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-7 pt-8 pb-7">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/25 blur-xl dark:bg-amber-500/30" />
                    <div className="relative flex h-[46px] w-[46px] items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/18 to-amber-600/8 dark:border-amber-500/20 dark:from-amber-500/15 dark:to-amber-600/5">
                      <Bug className="h-5 w-5 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.55)]" />
                    </div>
                  </div>
                  <div>
                    <h2 id="bug-title" className="text-[16px] font-bold text-zinc-800 dark:text-zinc-100">
                      Laporkan Bug / Error
                    </h2>
                    <p className="mt-0.5 text-[12px] leading-snug text-zinc-500 dark:text-zinc-500">
                      Jelaskan di mana bug-nya & lampirkan tangkapan layar bila ada.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Honeypot (hidden from humans) */}
                  <input
                    ref={honeypotRef}
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute left-[-9999px] h-0 w-0 opacity-0"
                  />

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      <span>Penjelasan Bug</span>
                      <span className={cn('font-medium normal-case tracking-normal', descLen > MAX_DESC ? 'text-red-500' : 'text-zinc-400/70')}>
                        {descLen}/{MAX_DESC}
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={MAX_DESC + 100}
                      placeholder="Contoh: Saat klik tombol 'Masuk', muncul layar putih dan tidak terjadi apa-apa…"
                      className={cn(
                        'w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200',
                        'bg-white/60 text-zinc-800 placeholder:text-zinc-400',
                        'dark:bg-white/[0.045] dark:text-zinc-100 dark:placeholder:text-zinc-600',
                        descError
                          ? 'border-red-400/60 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/5'
                          : [
                              'border-zinc-200/80 hover:border-zinc-300',
                              'focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                              'dark:border-white/[0.08] dark:hover:border-white/[0.13]',
                              'dark:focus:border-amber-500/55 dark:focus:shadow-[0_0_0_3px_rgba(245,158,11,0.09)]',
                            ]
                      )}
                    />
                    {descError && <p className="pl-1 text-[11px] text-red-500 dark:text-red-400">{descError}</p>}
                  </div>

                  {/* Optional email */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Email <span className="font-medium normal-case tracking-normal text-zinc-400/70">(opsional, untuk dihubungi)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="nama@email.com"
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200',
                        'bg-white/60 text-zinc-800 placeholder:text-zinc-400 border-zinc-200/80 hover:border-zinc-300',
                        'focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]',
                        'dark:bg-white/[0.045] dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:border-white/[0.08] dark:hover:border-white/[0.13]',
                        'dark:focus:border-amber-500/55 dark:focus:shadow-[0_0_0_3px_rgba(245,158,11,0.09)]'
                      )}
                    />
                  </div>

                  {/* Images */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Gambar <span className="font-medium normal-case tracking-normal text-zinc-400/70">(opsional, maks {MAX_IMAGES})</span>
                    </label>

                    {previews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2.5">
                        {previews.map((p, i) => (
                          <div
                            key={p.url}
                            className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                          >
                            <img src={p.url} alt={`Lampiran ${i + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              aria-label="Hapus gambar"
                              className="absolute inset-0 flex items-center justify-center bg-zinc-950/0 text-transparent transition-all hover:bg-zinc-950/55 hover:text-white"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {previews.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-xs font-medium text-zinc-500 transition-colors hover:border-amber-400 hover:text-amber-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-amber-500/50 dark:hover:text-amber-400 cursor-pointer"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Tambah gambar ({previews.length}/{MAX_IMAGES})
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => addFiles(e.target.files)}
                      className="hidden"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={close}
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/[0.05] cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        'relative flex flex-[1.4] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm font-bold text-zinc-950 cursor-pointer',
                        'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600',
                        'shadow-md shadow-amber-500/20 transition-all duration-250 hover:shadow-lg hover:shadow-amber-500/30',
                        'enabled:hover:scale-[1.015] enabled:active:scale-[0.985]',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Mengirim…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Kirim Laporan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
      )}
    </>
  )
}
