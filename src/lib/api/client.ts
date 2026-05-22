import type { ApiError } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Base API client with Sanctum SPA cookie auth.
 * All requests include credentials (cookies) for session-based auth.
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
    if (typeof window !== 'undefined') {
      return `http://${window.location.hostname}:8000`
    }
    return this.rawBaseUrl
  }

  /**
   * Initialize Sanctum CSRF cookie. Must be called before login.
   */
  async getCsrfCookie(): Promise<void> {
    await fetch(`${this.baseUrl}/sanctum/csrf-cookie`, {
      credentials: 'include',
    })
  }

  /**
   * Get XSRF-TOKEN from cookies for X-XSRF-TOKEN header.
   */
  private getXsrfToken(): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown
      params?: Record<string, string | number | undefined>
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

    const xsrf = this.getXsrfToken()
    if (xsrf) {
      headers['X-XSRF-TOKEN'] = xsrf
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
    })

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    const data = await response.json()

    if (!response.ok) {
      const error: ApiError = {
        message: data.message || 'Terjadi kesalahan.',
        errors: data.errors,
      }
      throw error
    }

    return data as T
  }

  get<T>(path: string, params?: Record<string, string | number | undefined>) {
    return this.request<T>('GET', path, { params })
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
   * Download a file from the API. Handles auth cookies and triggers browser download.
   * Used for Excel/PDF/CSV export endpoints.
   */
  async downloadFile(path: string, params?: Record<string, string | number | undefined>, filename?: string): Promise<void> {
    let url = `${this.baseUrl}${path}`

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

    const xsrf = this.getXsrfToken()
    if (xsrf) {
      headers['X-XSRF-TOKEN'] = xsrf
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
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

/**
 * Build export URL for direct window.open downloads (uses session cookie auth).
 * Suitable for Laravel web routes that return streamed file responses.
 */
export function buildExportUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000`
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  let url = `${base}${path}`

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

  return url
}
