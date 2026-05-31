'use client'

import { useEffect, useState } from 'react'
import { BellRing, BellOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  isPushSupported,
  getPushPermission,
  isPushSubscribed,
  enablePush,
  disablePush,
} from '@/lib/push'
import { cn } from '@/lib/utils'

/**
 * Compact toggle to enable/disable Web Push notifications on this device.
 * Lives in the notification popover header. Hidden when the browser has no
 * push support; shows a "Diblokir" state when permission was denied.
 */
export default function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    setSupported(true)
    setDenied(getPushPermission() === 'denied')
    isPushSubscribed().then(setSubscribed)
  }, [])

  if (!supported) return null

  const toggle = async () => {
    setLoading(true)
    try {
      if (subscribed) {
        await disablePush()
        setSubscribed(false)
        toast.success('Notifikasi perangkat dimatikan.')
      } else {
        await enablePush()
        setSubscribed(true)
        setDenied(false)
        toast.success('Notifikasi perangkat aktif — Anda akan menerima notifikasi di HP.')
      }
    } catch (e) {
      if (getPushPermission() === 'denied') setDenied(true)
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah notifikasi perangkat.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || denied}
      title={denied ? 'Izin notifikasi diblokir di pengaturan browser' : 'Notifikasi ke perangkat (HP) via PWA'}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60',
        subscribed
          ? 'border-green-500/30 text-green-400 hover:bg-zinc-800'
          : 'border-zinc-700 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800'
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : subscribed ? (
        <BellRing className="h-3.5 w-3.5" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      )}
      {denied ? 'Diblokir' : subscribed ? 'Aktif' : 'Aktifkan HP'}
    </button>
  )
}
