'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

// ─── Particle network constants ────────────────────────────────────────────────
const PARTICLE_COUNT = 78
const MAX_LINK_DIST = 130      // px — connect particles within this distance
const MOUSE_RADIUS = 190       // px — mouse attraction field
const MOUSE_FORCE = 0.011      // strength of mouse pull per frame
const MAX_SPEED = 0.30         // px per frame cap
const BASE_SPEED = 0.20        // initial velocity magnitude

// Per-theme color palettes  [R, G, B]
type RGB = readonly [number, number, number]

const DARK_PALETTE: RGB[] = [
  [245, 158, 11],   // amber-500
  [99,  102, 241],  // indigo-500
  [168, 85,  247],  // purple-500
]

const LIGHT_PALETTE: RGB[] = [
  [217, 119, 6],    // amber-600
  [59,  130, 246],  // blue-500
  [139, 92,  246],  // violet-500
]

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number        // radius
  ci: number       // color index
  ao: number       // base alpha offset (0-1)
}

function buildParticles(w: number, h: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = BASE_SPEED * (0.5 + Math.random())
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * 1.5 + 0.7,
      ci: Math.floor(Math.random() * 3),
      ao: Math.random() * 0.35 + 0.55,
    }
  })
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef<number | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'

  // ── Canvas particle effect ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particlesRef.current = buildParticles(canvas.width, canvas.height)
    }

    const render = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const pts = particlesRef.current

      // ── Update positions ──────────────────────────────────────────────────
      for (const p of pts) {
        // Mouse attraction
        const ddx = mx - p.x
        const ddy = my - p.y
        const md2 = ddx * ddx + ddy * ddy
        if (md2 < MOUSE_RADIUS * MOUSE_RADIUS && md2 > 0) {
          const md = Math.sqrt(md2)
          const f = (1 - md / MOUSE_RADIUS) * MOUSE_FORCE
          p.vx += (ddx / md) * f
          p.vy += (ddy / md) * f
        }

        // Speed cap
        const spd2 = p.vx * p.vx + p.vy * p.vy
        if (spd2 > MAX_SPEED * MAX_SPEED) {
          const inv = MAX_SPEED / Math.sqrt(spd2)
          p.vx *= inv
          p.vy *= inv
        }

        p.x += p.vx
        p.y += p.vy

        // Wrap edges with padding
        if (p.x < -12) p.x = w + 12
        if (p.x > w + 12) p.x = -12
        if (p.y < -12) p.y = h + 12
        if (p.y > h + 12) p.y = -12
      }

      // ── Draw connection lines ─────────────────────────────────────────────
      ctx.lineWidth = 0.6
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i]
          const b = pts[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < MAX_LINK_DIST * MAX_LINK_DIST) {
            const t = 1 - Math.sqrt(d2) / MAX_LINK_DIST
            const [r, g, bl] = palette[a.ci]
            // Quadratic falloff so connections fade gracefully
            ctx.strokeStyle = `rgba(${r},${g},${bl},${t * t * (isDark ? 0.28 : 0.14)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // ── Draw particles ────────────────────────────────────────────────────
      for (const p of pts) {
        const [r, g, b] = palette[p.ci]
        const alpha = p.ao * (isDark ? 0.88 : 0.6)

        if (isDark) {
          ctx.shadowBlur = 10
          ctx.shadowColor = `rgba(${r},${g},${b},0.55)`
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.fill()
        ctx.shadowBlur = 0
      }

      rafRef.current = requestAnimationFrame(render)
    }

    resize()
    render()

    const onResize = () => resize()
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 }
    }

    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [isDark])

  // Vignette + noise opacity adapts to theme
  const vignetteStop = isDark ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.07)'
  const noiseOpacity = isDark ? 0.042 : 0.028

  return (
    <>
      {/* ── Gradient color blobs ──────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Amber — top-left */}
        <div
          className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full blur-[115px] animate-blob"
          style={{ background: 'rgb(245,158,11)', opacity: isDark ? 0.07 : 0.09 }}
        />
        {/* Indigo — bottom-right */}
        <div
          className="absolute -bottom-32 -right-16 h-[680px] w-[680px] rounded-full blur-[130px] animate-blob"
          style={{ background: 'rgb(99,102,241)', opacity: isDark ? 0.055 : 0.06, animationDelay: '-8s' }}
        />
        {/* Purple — mid-right */}
        <div
          className="absolute top-[30%] right-[8%] h-[380px] w-[380px] rounded-full blur-[100px] animate-blob"
          style={{ background: 'rgb(168,85,247)', opacity: isDark ? 0.04 : 0.045, animationDelay: '-16s' }}
        />
        {/* Blue — lower-left accent */}
        <div
          className="absolute bottom-[15%] left-[5%] h-[280px] w-[280px] rounded-full blur-[85px] animate-blob"
          style={{ background: 'rgb(59,130,246)', opacity: isDark ? 0.035 : 0.04, animationDelay: '-24s' }}
        />
      </div>

      {/* ── Canvas — particle network ─────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* ── SVG noise grain texture ───────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ zIndex: 2, opacity: noiseOpacity }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="bg-noise-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.68"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-noise-grain)" />
      </svg>

      {/* ── Vignette — dark edges ─────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background: `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 35%, ${vignetteStop} 100%)`,
        }}
      />
    </>
  )
}
