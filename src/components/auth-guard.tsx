'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentUser } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/stores/authStore'
import { Loader2 } from 'lucide-react'

const SUPER_ADMIN_ONLY_PATHS = ['/accounts', '/master-data', '/audit-logs']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSuccess, data, isChecking } = useCurrentUser()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated) || (isSuccess && !!data)
  const user = useAuthStore((s) => s.user) || (isSuccess ? data : null)
  const requiresSuperAdmin = SUPER_ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path))

  useEffect(() => {
    // Only run redirection checks when not actively checking the session
    if (!isChecking) {
      if (!isAuthenticated && pathname !== '/login') {
        router.push('/login')
      } else if (isAuthenticated && pathname === '/login') {
        router.push('/dashboard')
      } else if (isAuthenticated && requiresSuperAdmin && user?.role !== 'super_admin') {
        router.push('/dashboard')
      }
    }
  }, [isChecking, isAuthenticated, pathname, requiresSuperAdmin, router, user?.role])

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

  if (isAuthenticated && requiresSuperAdmin && user?.role !== 'super_admin') {
    return null
  }

  return <>{children}</>
}
