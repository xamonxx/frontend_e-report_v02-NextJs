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
        'flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border px-2.5 text-[10px] font-semibold transition-[border-color,background-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-55',
        subscribed
          ? 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-600 hover:bg-emerald-500/[0.12] dark:text-emerald-400'
          : 'border-[color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-muted/45 text-muted-foreground hover:border-[color-mix(in_srgb,var(--primary-theme)_38%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-theme)_7%,var(--card))] hover:text-[var(--primary-theme)]'
      )}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : subscribed ? (
        <BellRing className="size-3.5" />
      ) : (
        <BellOff className="size-3.5" />
      )}
      {denied ? 'Diblokir' : subscribed ? 'Aktif' : 'Aktifkan HP'}
    </button>
  )
}
