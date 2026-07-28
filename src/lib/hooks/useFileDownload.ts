'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

type DownloadParams = Record<string, string | number | undefined>

/**
 * Unduh file export lewat `api.downloadFile()` — fetch dengan header
 * `Authorization`, lalu simpan dari blob.
 *
 * Menggantikan pola lama `<a href={buildExportUrl(...)}>`, yang menempelkan
 * token auth ke query string supaya `window.open` bisa lewat. URL bertoken itu
 * ikut tertulis ke DOM sebagai `href`, masuk riwayat browser saat diklik,
 * terkirim sebagai `Referer`, dan bisa disalin lewat "copy link address" —
 * padahal token Sanctum di aplikasi ini tidak punya masa berlaku. Header tidak
 * meninggalkan jejak itu.
 *
 * `path` ditulis tanpa prefix `/api/v1`; `downloadFile()` yang menambahkannya,
 * sama seperti `get()`/`post()`.
 */
export function useFileDownload() {
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const download = useCallback(
    async (path: string, params?: DownloadParams, successMessage?: string, filename?: string) => {
      // Satu unduhan pada satu waktu per key supaya klik ganda tidak menembak dua kali.
      if (pendingKey === path) return

      setPendingKey(path)
      try {
        await api.downloadFile(path, params, filename)
        if (successMessage) toast.success(successMessage)
      } catch (err: unknown) {
        const message =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message)
            : ''
        toast.error(message || 'Gagal mengunduh berkas.')
      } finally {
        setPendingKey(null)
      }
    },
    [pendingKey]
  )

  return { download, isDownloading: (path: string) => pendingKey === path, pendingKey }
}
