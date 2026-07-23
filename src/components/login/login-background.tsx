'use client'

/**
 * LoginBackground — Lightweight, premium background for the login page.
 * Optimized for low-end devices by removing heavy blur filters, noise mix-blend modes, and JS animations.
 */
export default function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[#edf1f6] dark:bg-[#080d16]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.12)_0%,transparent_28%,transparent_70%,rgba(15,23,42,0.05)_100%)] dark:bg-[linear-gradient(135deg,rgba(245,158,11,0.10)_0%,transparent_30%,transparent_72%,rgba(255,255,255,0.025)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in srgb, var(--primary-theme) 45%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--primary-theme) 45%, transparent) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  )
}
