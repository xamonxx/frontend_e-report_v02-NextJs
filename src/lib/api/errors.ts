import type { ApiError } from '@/types'

/**
 * Pesan error yang mudah dipahami pengguna (Bahasa Indonesia).
 *
 * Sumber kebenaran tunggal untuk cara error API/network diubah jadi kalimat
 * yang bisa dibaca orang. Dipakai `client.ts` saat melempar error, dan bisa
 * dipakai call-site lewat `getErrorMessage()`.
 */

const GENERIC = 'Terjadi kesalahan. Coba lagi beberapa saat.'

/** Pesan default per status HTTP — dipakai saat backend tak mengirim pesan yang layak tampil. */
const STATUS_MESSAGES: Record<number, string> = {
  0: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.',
  400: 'Permintaan tidak dapat diproses. Periksa kembali data Anda.',
  401: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  403: 'Anda tidak punya akses untuk melakukan tindakan ini.',
  404: 'Data yang dicari tidak ditemukan.',
  408: 'Permintaan terlalu lama diproses. Coba lagi.',
  409: 'Data bentrok dengan yang sudah ada. Muat ulang halaman lalu coba lagi.',
  413: 'Berkas terlalu besar untuk diunggah.',
  419: 'Sesi keamanan kedaluwarsa. Muat ulang halaman lalu coba lagi.',
  422: 'Ada isian yang belum benar. Periksa kembali formulir Anda.',
  429: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  500: 'Server sedang bermasalah. Coba lagi beberapa saat.',
  502: 'Server tidak merespons. Coba lagi beberapa saat.',
  503: 'Layanan sedang tidak tersedia. Coba lagi nanti.',
  504: 'Server terlalu lama merespons. Coba lagi beberapa saat.',
}

/**
 * Pesan yang bocor dari framework/proxy/browser — teknis, tak layak ditampilkan
 * ke pengguna. Kalau cocok pola ini, kita ganti dengan pesan default status.
 */
function looksTechnical(message: string): boolean {
  const m = message.trim()
  if (!m) return true
  return (
    m.length > 160 ||
    /^</.test(m) || // potongan HTML (halaman error 500/502/504)
    /^(SQLSTATE|cURL error|Undefined|TypeError|SyntaxError|Fatal error|ReferenceError)/i.test(m) ||
    /Failed to fetch|Load failed|NetworkError|Unexpected token|not valid JSON|<!DOCTYPE/i.test(m) ||
    /Internal Server Error|Server Error|Whoops|Call to a member/i.test(m) ||
    /\bexception\b|::|\bstack trace\b/i.test(m)
  )
}

/**
 * Ubah status + pesan backend jadi satu kalimat yang mudah dipahami.
 * - 422 dengan detail field: pakai pesan field pertama (paling spesifik).
 * - 4xx lain: pakai pesan backend bila manusiawi, kalau tidak pakai default status.
 * - 0 / 5xx / tak dikenal: selalu pakai default (sembunyikan pesan teknis).
 */
export function friendlyApiMessage(
  status: number | undefined,
  rawMessage?: string | null,
  errors?: Record<string, string[]>,
): string {
  const code = status ?? 0

  if (code === 422 && errors) {
    const first = Object.values(errors)[0]?.[0]
    if (first && !looksTechnical(first)) return first
  }

  const backend = rawMessage?.trim()
  const isClientError = code >= 400 && code < 500
  if (isClientError && backend && !looksTechnical(backend)) return backend

  return (
    STATUS_MESSAGES[code] ??
    STATUS_MESSAGES[Math.floor(code / 100) * 100] ??
    GENERIC
  )
}

/**
 * Ambil pesan yang layak ditampilkan dari error apa pun (ApiError dari `client.ts`,
 * `Error` biasa, atau nilai tak dikenal). Aman dipakai di `onError` react-query
 * dan blok `catch`.
 */
export function getErrorMessage(err: unknown, fallback: string = GENERIC): string {
  if (err && typeof err === 'object') {
    const e = err as Partial<ApiError> & { message?: unknown }

    // ApiError dari client.ts (punya status/errors) — sudah diramahkan, tapi
    // lewatkan ulang untuk jaga-jaga bila dibuat manual di tempat lain.
    if ('status' in e || 'errors' in e) {
      return friendlyApiMessage(
        e.status,
        typeof e.message === 'string' ? e.message : undefined,
        e.errors,
      )
    }

    if (typeof e.message === 'string') {
      return looksTechnical(e.message) ? fallback : e.message
    }
  }
  return fallback
}
