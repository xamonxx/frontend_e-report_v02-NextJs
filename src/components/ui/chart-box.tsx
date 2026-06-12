'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'

/**
 * Measures its own box and only mounts the recharts <ResponsiveContainer>
 * once real (> 0) pixel dimensions are known.
 *
 * Why: a percentage-sized ResponsiveContainer (width/height="100%") starts at
 * width(-1)/height(-1) on its first measurement frame, which makes recharts v3
 * log "The width(-1) and height(-1) of chart should be greater than 0..." and
 * triggers an extra render pass. By passing already-measured numeric dimensions
 * we skip that initial invalid state entirely. Stays responsive via ResizeObserver.
 */
export function ChartBox({ children }: { children: ReactElement }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="h-full w-full">
      {size.w > 0 && size.h > 0 ? (
        <ResponsiveContainer width={size.w} height={size.h}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
