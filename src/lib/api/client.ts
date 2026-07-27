import type { ApiError } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const TOKEN_KEY = 'e_report_auth_token'

/**
 * Get stored auth token from localStorage.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Set auth token in localStorage.
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

/**
 * Remove auth token from localStorage.
 */
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Bersihkan sesi lalu antar ke halaman login saat server menolak token.
 *
 * Sebelumnya 401 tidak ditangani di mana pun. `/auth/me` hanya dipanggil saat
 * mount, jadi sesi yang ditolak di tengah pemakaian tidak pernah dibersihkan —
 * pengguna hanya melihat permintaan gagal beruntun sampai ia memuat ulang
 * sendiri. Itu tidak terasa selama token berlaku selamanya; sejak token diberi
 * masa berlaku (`config/sanctum.php`), ini jadi jalur yang pasti dilewati.
 *
 * `/auth/login` dikecualikan: 401 di sana berarti kata sandi salah, dan itu
 * urusan form, bukan sesi kedaluwarsa.
 */
function handleUnauthorized(path: string): void {
  if (typeof window === 'undefined') return
  if (path.startsWith('/auth/login')) return

  removeAuthToken()
  localStorage.setItem('e_report_logged_in', 'false')

  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * Base API client with Sanctum token-based auth.
 * Uses Bearer token stored in localStorage for cross-domain compatibility.
 */
class ApiClient {
  private rawBaseUrl: string

  constructor(baseUrl: string) {
    this.rawBaseUrl = baseUrl
  }

  /**
   * Dynamically resolves the API base URL.
   * If in the browser, matches the hostname of the current page to prevent
   * CORS/cookie mismatch issues (localhost vs IP on same network).
   */
  get baseUrl(): string {
    let resolvedUrl = this.rawBaseUrl
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(this.rawBaseUrl)
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          resolvedUrl = `${url.protocol}//${window.location.hostname}:${url.port || '8000'}`
        }
      } catch {
        // Fallback if URL is not a valid absolute URL
      }
    }
    // Remove trailing slash if present to avoid double slashes
    return resolvedUrl.replace(/\/$/, '')
  }

  /**
   * Initialize Sanctum CSRF cookie. Kept for backward compatibility.
   */
  async getCsrfCookie(): Promise<void> {
    await fetch(`${this.baseUrl}/sanctum/csrf-cookie`, {
      credentials: 'include',
    })
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown
      params?: Record<string, string | number | undefined>
      signal?: AbortSignal
    } = {}
  ): Promise<T> {
    let url = `${this.baseUrl}/api/v1${path}`

    // Append query params
    if (options.params) {
      const searchParams = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    // Add Bearer token if available
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let fetchBody: BodyInit | undefined
    if (options.body instanceof FormData) {
      fetchBody = options.body
    } else if (options.body) {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(options.body)
    }

    const response = await fetch(url, {
      method,
      headers,
      body: fetchBody,
      credentials: 'include',
      signal: options.signal,
    })

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(path)
      }

      const error: ApiError = {
        message: data.message || 'Terjadi kesalahan.',
        errors: data.errors,
      }
      throw error
    }

    return data as T
  }

  get<T>(path: string, params?: Record<string, string | number | undefined>, signal?: AbortSignal) {
    return this.request<T>('GET', path, { params, signal })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, { body })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, { body })
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path)
  }

  postForm<T>(path: string, formData: FormData) {
    return this.request<T>('POST', path, { body: formData })
  }

  /**
   * Download a file from the API. Handles auth token and triggers browser download.
   * Used for Excel/PDF/CSV export endpoints.
   */
  async downloadFile(path: string, params?: Record<string, string | number | undefined>, filename?: string): Promise<void> {
    // Prefix /api/v1 sama seperti request(); `path` dipakai seperti get() (mis. '/master-data/users/export').
    let url = `${this.baseUrl}/api/v1${path}`

    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }

    const headers: Record<string, string> = {
      Accept: 'application/octet-stream',
    }

    // Add Bearer token
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(path)
      }

      const errorData = await response.json().catch(() => ({ message: 'Gagal mengunduh file.' }))
      throw { message: errorData.message || `Download failed: ${response.status}` }
    }

    // Extract filename from Content-Disposition header if not provided
    if (!filename) {
      const disposition = response.headers.get('Content-Disposition')
      const match = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      filename = match ? match[1].replace(/['"]/g, '') : `export_${Date.now()}`
    }

    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  }
}

export const api = new ApiClient(API_BASE)

/*
 * `buildExportUrl()` dihapus 2026-07-27.
 *
 * Fungsi itu menempelkan token auth ke query string supaya unduhan lewat
 * `window.open` / `<a href>` bisa menembus auth. Akibatnya URL bertoken tertulis
 * ke DOM sebagai `href`, ikut masuk riwayat browser saat diklik, terkirim
 * sebagai `Referer`, dan bisa disalin lewat "copy link address" — padahal token
 * Sanctum di aplikasi ini tidak punya masa berlaku.
 *
 * Semua export sekarang lewat `useFileDownload()` → `api.downloadFile()`, yang
 * mengirim token di header `Authorization` dan menyimpan hasilnya dari blob.
 * Untuk aset statis `/storage/...` cukup sambung ke `api.baseUrl` — tidak ada
 * auth di sana.
 */
