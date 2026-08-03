import type { ApiError } from '@/types'
import { friendlyApiMessage } from './errors'

// Production can proxy private API traffic through the frontend origin. Keep
// direct API mode as the local/development-compatible default.
const API_BASE =
  process.env.NEXT_PUBLIC_SAME_ORIGIN_API === 'true'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')

/**
 * Read Laravel's non-sensitive CSRF cookie. The authentication session itself
 * lives in an HttpOnly cookie and is intentionally inaccessible to JavaScript.
 */
export function getXsrfToken(): string | null {
  if (typeof window === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
  return match ? decodeURIComponent(match.slice('XSRF-TOKEN='.length)) : null
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
  if (path.startsWith('/auth/login') || path.startsWith('/auth/logout')) return

  localStorage.setItem('e_report_logged_in', 'false')

  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * Base API client with Sanctum cookie-based SPA authentication.
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
   * Initialize Sanctum's CSRF cookie before login.
   */
  async getCsrfCookie(reset = false): Promise<void> {
    if (reset && typeof document !== 'undefined') {
      // Hapus token JS lama. Session HttpOnly memakai nama development baru,
      // sehingga pasangan cookie lama tidak dapat ikut dipilih browser.
      document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/; SameSite=Lax'
      document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/; Domain=localhost; SameSite=Lax'
    }

    const response = await fetch(`${this.baseUrl}/sanctum/csrf-cookie`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Gagal menyiapkan sesi keamanan. Coba lagi.')
    }
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

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const xsrfToken = getXsrfToken()
      if (xsrfToken) {
        headers['X-XSRF-TOKEN'] = xsrfToken
      }
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    let fetchBody: BodyInit | undefined
    if (options.body instanceof FormData) {
      fetchBody = options.body
    } else if (options.body) {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(options.body)
    }

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: fetchBody,
        credentials: 'include',
        signal: options.signal,
      })
    } catch (networkError) {
      // Pembatalan react-query — teruskan apa adanya, bukan error yang tampil ke pengguna.
      if (networkError instanceof DOMException && networkError.name === 'AbortError') {
        throw networkError
      }
      // Server tak terjangkau / koneksi putus. `status: 0` memicu pesan koneksi.
      const error: ApiError = { message: friendlyApiMessage(0), status: 0 }
      throw error
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    // Body mungkin bukan JSON (mis. halaman error 500/502 dari proxy). Jangan
    // biarkan SyntaxError "Unexpected token '<'" bocor jadi pesan ke pengguna.
    let data: { message?: string; errors?: Record<string, string[]> } | null = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(path)
      }

      const error: ApiError = {
        message: friendlyApiMessage(response.status, data?.message, data?.errors),
        errors: data?.errors,
        status: response.status,
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

  delete<T>(path: string, body?: unknown) {
    return this.request<T>('DELETE', path, { body })
  }

  postForm<T>(path: string, formData: FormData) {
    return this.request<T>('POST', path, { body: formData })
  }

  /**
   * Download a file using the HttpOnly session cookie.
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

    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      })
    } catch {
      const error: ApiError = { message: friendlyApiMessage(0), status: 0 }
      throw error
    }

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(path)
      }

      const errorData = await response.json().catch(() => null)
      const error: ApiError = {
        message: friendlyApiMessage(response.status, errorData?.message),
        status: response.status,
      }
      throw error
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
