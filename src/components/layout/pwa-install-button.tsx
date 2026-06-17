'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, Download, Share, Plus, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          'relative flex h-9 w-9 items-center justify-center rounded-xl border bg-card/60 backdrop-blur-md shadow-sm shrink-0 cursor-pointer transition-all duration-300',
          isInstalledSuccessfully
            ? 'border-emerald-500/40 text-emerald-500'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/80'
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

      {/* Manual Installation Guide Modal / Dialog */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">
                  Instal Aplikasi E-Report
                </h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Nikmati pengalaman akses aplikasi E-Report yang lebih cepat, stabil, dan responsif langsung dari Home Screen Anda.
                </p>
              </div>

              {/* iOS Specific Instructions */}
              {isIOS ? (
                <div className="mt-5 rounded-xl bg-amber-500/5 p-4 border border-amber-500/10">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                    <Share className="h-4 w-4" /> Panduan Pengguna iOS (Safari):
                  </p>
                  <ol className="list-decimal list-inside text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1.5 leading-normal">
                    <li>
                      Ketuk tombol **Bagikan (Share)** <Share className="inline h-3.5 w-3.5 mx-0.5" /> di menu navigasi bawah.
                    </li>
                    <li>
                      Gulir ke bawah dan ketuk opsi **Tambahkan ke Layar Utama (Add to Home Screen)** <Plus className="inline h-3.5 w-3.5 mx-0.5 border border-zinc-400/30 rounded" />.
                    </li>
                    <li>
                      Ketuk **Tambah (Add)** di sudut kanan atas untuk mengonfirmasi.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-normal">
                    Browser Anda belum mendukung instalasi otomatis satu ketuk. Ikuti petunjuk berikut:
                  </p>
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3.5 text-[11px] text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/40">
                    Buka menu pengaturan browser Anda (titik tiga di kanan atas) dan pilih opsi **&quot;Instal aplikasi&quot;** atau **&quot;Tambahkan ke Layar Utama&quot;**.
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--primary-theme)',
                    color: '#000000'
                  }}
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
