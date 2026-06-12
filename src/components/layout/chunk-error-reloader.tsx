'use client'

import { useEffect } from 'react'

/**
 * Recovers users from a stale deploy.
 *
 * After a new deploy, hashed JS chunks change and the old ones are deleted. A
 * browser/CDN/service-worker that still holds the OLD HTML will request a chunk
 * that no longer exists -> 404 -> "ChunkLoadError" -> Next.js "Application error".
 *
 * When that happens we clear the stale service worker + caches and hard-reload
 * with a cache-busting query so the user fetches fresh, self-consistent HTML.
 * A 15s guard (per tab) prevents reload loops if the origin itself is broken.
 */
export default function ChunkErrorReloader() {
  useEffect(() => {
    const GUARD_KEY = '__chunk_reload_at'

    const isChunkError = (value: unknown): boolean => {
      const msg =
        typeof value === 'string'
          ? value
          : ((value as { message?: string; name?: string })?.message ??
             (value as { name?: string })?.name ??
             '')
      return /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
        String(msg)
      )
    }

    let recovering = false
    const recover = async () => {
      if (recovering) return
      const last = Number(sessionStorage.getItem(GUARD_KEY) || 0)
      if (Date.now() - last < 15000) return // already tried in the last 15s -> avoid loop
      recovering = true
      sessionStorage.setItem(GUARD_KEY, String(Date.now()))

      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map((r) => r.unregister()))
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((k) => caches.delete(k)))
        }
      } catch {
        // best-effort cleanup
      }

      const url = new URL(window.location.href)
      url.searchParams.set('_r', Date.now().toString(36))
      window.location.replace(url.toString())
    }

    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.message) || isChunkError(e.error)) void recover()
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) void recover()
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
