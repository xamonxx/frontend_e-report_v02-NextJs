'use client'

/**
 * LoginBackground — Lightweight, premium background for the login page.
 * Optimized for low-end devices by removing heavy blur filters, noise mix-blend modes, and JS animations.
 */
export default function LoginBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Base Gradient Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-[#0a0f1d] dark:via-[#111827] dark:to-[#1a1625] transition-colors duration-700" />

      {/* Static Light Accents (Using CSS radial-gradients instead of heavy blur filters) */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full opacity-60 dark:opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, transparent 70%)',
        }}
      />
      
      <div
        className="absolute top-[40%] right-[10%] w-[50%] h-[50%] rounded-full opacity-50 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(252, 211, 77, 0.3) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(196, 181, 253, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Grid Overlay for Texture (Very Lightweight) */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Subtle Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.05)_100%)] dark:bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.4)_100%)]" />
    </div>
  )
}
