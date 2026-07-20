'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentUser } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/stores/authStore'
import { Loader2 } from 'lucide-react'
import { canAccessPath, isSurveyTeam } from '@/lib/auth/roles'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSuccess, data, isChecking } = useCurrentUser()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated) || (isSuccess && !!data)
  const user = useAuthStore((s) => s.user) || (isSuccess ? data : null)
  const fallbackPath = isSurveyTeam(user) ? '/surveys' : '/dashboard'
  const canAccessCurrentPath = !user || canAccessPath(user, pathname)

  useEffect(() => {
    // Only run redirection checks when not actively checking the session
    if (!isChecking) {
      if (!isAuthenticated && pathname !== '/login') {
        router.push('/login')
      } else if (isAuthenticated && pathname === '/login') {
        router.push(fallbackPath)
      } else if (isAuthenticated && !canAccessCurrentPath) {
        router.push(fallbackPath)
      }
    }
  }, [isChecking, isAuthenticated, pathname, canAccessCurrentPath, fallbackPath, router])

  if (isChecking) {
    // Allow immediate rendering on login page without flashing spinner
    if (pathname === '/login') {
      return <>{children}</>
    }
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-sm font-medium tracking-wide text-zinc-400">
            Memuat dashboard interior...
          </p>
        </div>
      </div>
    )
  }

  // Allow login page to render even if unauthenticated
  if (!isAuthenticated && pathname !== '/login') {
    return null
  }

  if (isAuthenticated && !canAccessCurrentPath) {
    return null
  }

  return <>{children}</>
}
