import { api } from '@/lib/api/client'

/** Convert a base64url VAPID key to the Uint8Array applicationServerKey expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Back the array with a concrete ArrayBuffer so it satisfies BufferSource.
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** Whether the browser supports Web Push at all. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Current Notification permission ('default' | 'granted' | 'denied'). */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/** True if this device already has an active push subscription. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}

/**
 * Enable push on this device: request permission, subscribe with the backend's
 * VAPID key, and store the subscription server-side. Throws a friendly Error on
 * failure (denied permission, no service worker, etc.).
 */
export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Browser ini tidak mendukung notifikasi push.')
  }

  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) {
    throw new Error(
      'Service worker belum aktif. Notifikasi HP hanya bekerja pada versi produksi (atau PWA yang sudah di-install).'
    )
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak.')
  }

  const { publicKey } = await api.get<{ publicKey: string }>('/push/public-key')
  if (!publicKey) {
    throw new Error('VAPID key belum dikonfigurasi di server.')
  }

  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  const contentEncoding =
    (typeof PushManager !== 'undefined' &&
      (PushManager as unknown as { supportedContentEncodings?: string[] }).supportedContentEncodings?.[0]) ||
    'aes128gcm'

  await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    contentEncoding,
  })
}

/** Disable push on this device: unsubscribe and remove the server record. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return

  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  await api.post('/push/unsubscribe', { endpoint }).catch(() => {})
}
