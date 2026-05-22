'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevents hydration mismatch warning on SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl border border-border/50 bg-muted/10 shrink-0" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/60 backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all duration-300 shadow-sm shrink-0 cursor-pointer"
      title={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-transform hover:rotate-45 duration-500" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600 transition-transform hover:-rotate-12 duration-500" />
      )}
    </button>
  )
}
