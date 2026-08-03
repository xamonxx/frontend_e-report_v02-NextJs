'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Smartphone, Download, Share, Plus, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HEADER_ACTION_CLASS } from './header-action'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isInstalledSuccessfully, setIsInstalledSuccessfully] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Check if running as PWA (standalone)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches
      const isStandaloneNavigator = (window.navigator as any).standalone === true
      setIsStandalone(isStandaloneMedia || isStandaloneNavigator)
    }

    checkStandalone()

    // Detect iOS
    const detectIOS = () => {
      const userAgent = window.navigator.userAgent
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
      setIsIOS(isIOSDevice)
    }
    
    detectIOS()

    // Handle beforeinstallprompt event for Chromium browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      // NOTE: intentionally NOT calling e.preventDefault() here. Calling it makes
      // Chrome log "Banner not shown: beforeinstallpromptevent.preventDefault()
      // called..." on every page. We still capture the event so the custom FAB
      // can trigger the install via deferredPrompt.prompt() on click.
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Listen to appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalledSuccessfully(true)
      setTimeout(() => {
        setIsInstalledSuccessfully(false)
        setIsStandalone(true)
      }, 3000)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowModal(true)
      return
    }

    if (!deferredPrompt) {
      // Fallback: Show manual/instructions modal for other browsers if event not fired yet
      setShowModal(true)
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  // Do not render anything during SSR or if already installed/standalone
  if (!isMounted || isStandalone) {
    return null
  }

  // Always show the button so the icon is visible and accessible (with manual fallback modal if prompt is not ready)
  const canShowButton = true

  if (!canShowButton && !isInstalledSuccessfully) {
    return null
  }

  return (
    <>
      {/* Header icon button (sits next to the theme toggle) */}
      <button
        type="button"
        onClick={handleInstallClick}
        title="Instal aplikasi E-Report"
        aria-label="Instal aplikasi E-Report"
        className={cn(
          HEADER_ACTION_CLASS,
          'bg-card/60',
          isInstalledSuccessfully
            ? 'border-emerald-500/40 text-emerald-500'
            : 'border-border text-muted-foreground hover:bg-accent/80 hover:text-foreground'
        )}
      >
        {isInstalledSuccessfully ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <>
            <Smartphone className="h-4 w-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            {/* Download micro-badge */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
              <Download className="h-2 w-2" />
            </span>
          </>
        )}
      </button>

      {/* Manual Installation Guide Modal / Dialog — portaled to body so it
          escapes the header's z-20 backdrop-blur stacking context. */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto px-4 py-4 duration-200 animate-in fade-in">
            {/* Backdrop */}
            <div
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Box */}
            <div
              className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl duration-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-1"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                aria-label="Tutup"
                className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/15">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Instal Aplikasi E-Report
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Akses lebih cepat, stabil, dan responsif langsung dari Home Screen Anda.
                </p>
              </div>

              {/* iOS Specific Instructions */}
              {isIOS ? (
                <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Share className="h-4 w-4" /> Panduan iOS (Safari)
                  </p>
                  <ol className="list-decimal space-y-2 pl-4 text-[11px] leading-relaxed text-muted-foreground marker:text-amber-500/70 marker:font-bold">
                    <li>
                      Ketuk tombol <strong className="font-semibold text-foreground">Bagikan</strong>
                      <Share className="mx-0.5 inline h-3.5 w-3.5 align-text-bottom" /> di menu bawah.
                    </li>
                    <li>
                      Pilih <strong className="font-semibold text-foreground">Tambahkan ke Layar Utama</strong>
                      <Plus className="mx-0.5 inline h-3.5 w-3.5 rounded border border-border align-text-bottom" />.
                    </li>
                    <li>
                      Ketuk <strong className="font-semibold text-foreground">Tambah</strong> di kanan atas untuk mengonfirmasi.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    Browser Anda belum mendukung instalasi satu ketuk. Ikuti langkah berikut:
                  </p>
                  <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
                    Buka menu browser (ikon titik tiga di kanan atas), lalu pilih{' '}
                    <strong className="font-semibold text-foreground">&quot;Instal aplikasi&quot;</strong> atau{' '}
                    <strong className="font-semibold text-foreground">&quot;Tambahkan ke Layar Utama&quot;</strong>.
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="mt-6 w-full rounded-xl px-4 py-2.5 text-xs font-bold transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--primary-theme)', color: '#0b0f19' }}
              >
                Selesai
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
