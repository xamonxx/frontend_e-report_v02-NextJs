'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * LoginBackground — Premium animated background for the login page.
 *
 * Features:
 *  • Floating blurred light orbs with staggered animation
 *  • Gradient mesh base
 *  • Subtle grid overlay
 *  • Noise/grain texture
 *  • Vignette (dark edges)
 *  • Mouse-reactive parallax on orbs
 *  • Separate palettes for dark & light modes
 */
export default function LoginBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      // normalize to -1…1
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      setMouse({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  /* ──────── orb definitions ──────── */
  const orbs = [
    // Large primary orb — top-left
    {
      size: 520,
      x: '-8%',
      y: '-12%',
      lightColor: 'rgba(147, 197, 253, 0.35)',   // blue-300
      darkColor: 'rgba(99, 102, 241, 0.22)',       // indigo-500
      blur: 120,
      duration: 22,
      delay: 0,
      parallaxFactor: 18,
    },
    // Large secondary orb — bottom-right
    {
      size: 580,
      x: '65%',
      y: '55%',
      lightColor: 'rgba(196, 181, 253, 0.30)',     // violet-300
      darkColor: 'rgba(139, 92, 246, 0.18)',        // violet-500
      blur: 140,
      duration: 26,
      delay: -6,
      parallaxFactor: 14,
    },
    // Medium accent orb — center-right
    {
      size: 340,
      x: '72%',
      y: '8%',
      lightColor: 'rgba(252, 211, 77, 0.22)',      // amber-300
      darkColor: 'rgba(245, 158, 11, 0.14)',        // amber-500
      blur: 90,
      duration: 20,
      delay: -10,
      parallaxFactor: 22,
    },
    // Small accent orb — bottom-left
    {
      size: 280,
      x: '5%',
      y: '68%',
      lightColor: 'rgba(251, 191, 36, 0.18)',      // amber-400
      darkColor: 'rgba(245, 158, 11, 0.12)',        // amber-500
      blur: 80,
      duration: 18,
      delay: -14,
      parallaxFactor: 26,
    },
    // Tiny pink accent — top center
    {
      size: 200,
      x: '40%',
      y: '-5%',
      lightColor: 'rgba(249, 168, 212, 0.25)',     // pink-300
      darkColor: 'rgba(236, 72, 153, 0.12)',        // pink-500
      blur: 70,
      duration: 24,
      delay: -4,
      parallaxFactor: 30,
    },
    // Extra depth orb — center
    {
      size: 260,
      x: '35%',
      y: '45%',
      lightColor: 'rgba(165, 180, 252, 0.20)',     // indigo-300
      darkColor: 'rgba(79, 70, 229, 0.10)',         // indigo-600
      blur: 100,
      duration: 28,
      delay: -18,
      parallaxFactor: 20,
    },
  ]

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">

      {/* ─── Layer 1: Gradient Mesh Base ─── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/60 to-violet-50/40 dark:from-[#070a15] dark:via-[#0a0e1a] dark:to-[#0d0a1a] transition-colors duration-700" />

      {/* ─── Layer 2: Secondary radial gradient ─── */}
      <div
        className="absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, var(--mesh-center), transparent)',
        }}
      />

      {/* ─── Layer 3: Floating Light Orbs ─── */}
      {orbs.map((orb, i) => {
        const px = mouse.x * orb.parallaxFactor
        const py = mouse.y * orb.parallaxFactor

        return (
          <motion.div
            key={i}
            className="absolute rounded-full login-orb"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              filter: `blur(${orb.blur}px)`,
              animationDuration: `${orb.duration}s`,
              animationDelay: `${orb.delay}s`,
            }}
            animate={{
              x: px,
              y: py,
            }}
            transition={{
              type: 'spring',
              stiffness: 40,
              damping: 30,
              mass: 1.2,
            }}
          >
            {/* Light mode color */}
            <div
              className="absolute inset-0 rounded-full dark:opacity-0 transition-opacity duration-700"
              style={{ backgroundColor: orb.lightColor }}
            />
            {/* Dark mode color */}
            <div
              className="absolute inset-0 rounded-full opacity-0 dark:opacity-100 transition-opacity duration-700"
              style={{ backgroundColor: orb.darkColor }}
            />
          </motion.div>
        )
      })}

      {/* ─── Layer 4: Grid Overlay ─── */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* ─── Layer 5: Noise / Grain Texture ─── */}
      <div className="absolute inset-0 login-noise opacity-[0.035] dark:opacity-[0.045] mix-blend-overlay" />

      {/* ─── Layer 6: Vignette (dark edges) ─── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.12) 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-700"
        style={{
          background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* ─── Layer 7: Scanline / subtle horizontal lines (dark only) ─── */}
      <div
        className="absolute inset-0 opacity-0 dark:opacity-[0.015]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />
    </div>
  )
}
