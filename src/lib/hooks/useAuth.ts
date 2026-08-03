'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import { disablePush } from '@/lib/push'
import { useAuthStore } from '@/lib/stores/authStore'
import type { ApiError, AuthUser } from '@/types'

/**
 * Fetch current authenticated user. Called on app mount.
 * The server validates the HttpOnly session cookie.
 */
export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser)
  const clearUser = useAuthStore((s) => s.clearUser)
  const storeIsAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [shouldFetch, setShouldFetch] = useState(false)
  // Skip loading spinner when zustand already has an authenticated session (e.g. post-login navigation)
  const [isChecking, setIsChecking] = useState(!storeIsAuthenticated)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShouldFetch(true)
    }
  }, [storeIsAuthenticated, clearUser])

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async ({ signal }) => {
      const res = await api.get<{ user: AuthUser }>('/auth/me', undefined, signal)
      return res.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: shouldFetch,
  })

  const { data, isSuccess, isError, isFetched } = query

  useEffect(() => {
    if (shouldFetch && isFetched) {
      setIsChecking(false)
    }
  }, [shouldFetch, isFetched])

  useEffect(() => {
    if (isSuccess && data) {
      setUser(data)
      localStorage.setItem('e_report_logged_in', 'true')
    } else if (isError) {
      // Only clear auth on genuine API errors (4xx/5xx), not network/CORS failures
      const isNetworkError = query.error instanceof TypeError
      if (!isNetworkError) {
        clearUser()
        localStorage.setItem('e_report_logged_in', 'false')
      }
    }
  }, [data, isSuccess, isError, setUser, clearUser, query.error])

  return {
    ...query,
    isChecking,
  }
}

/**
 * Login mutation. Laravel stores the session in an HttpOnly cookie.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string; remember?: boolean }) => {
      await api.getCsrfCookie()
      try {
        return await api.post<{ user: AuthUser; message: string }>('/auth/login', credentials)
      } catch (error) {
        if ((error as ApiError)?.status !== 419) throw error

        // Cookie lama setelah pergantian host/config dipulihkan otomatis.
        await api.getCsrfCookie(true)
        return api.post<{ user: AuthUser; message: string }>('/auth/login', credentials)
      }
    },
    onSuccess: (data) => {
      // Set user in zustand store
      setUser(data.user)
      localStorage.setItem('e_report_logged_in', 'true')
      // Set query data directly instead of invalidating (avoids unnecessary re-fetch)
      queryClient.setQueryData(queryKeys.auth.me, data.user)
      // Navigate to dashboard
      router.push('/dashboard')
    },
  })
}

/**
 * Logout mutation. Invalidates the server-side session.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const clearUser = useAuthStore((s) => s.clearUser)

  const finishLogout = () => {
    clearUser()
    localStorage.setItem('e_report_logged_in', 'false')
    queryClient.clear()
    window.location.replace('/login')
  }

  return useMutation({
    mutationFn: async () => {
      // Prevent an in-flight /auth/me response from restoring the old user
      // while the server-side session is being invalidated.
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.me })

      try {
        // Langganan push membawa isi notifikasi akun. Cabut sebelum sesi
        // berakhir agar perangkat bersama tidak menerima pesan setelah logout.
        await disablePush().catch(() => {})
        return await api.post<{ message: string }>('/auth/logout')
      } catch (error) {
        const status = (error as ApiError)?.status

        // A stale CSRF cookie must not turn logout into a client-only action.
        if (status === 419) {
          await api.getCsrfCookie(true)
          return api.post<{ message: string }>('/auth/logout')
        }

        // An absent session already represents the desired logout state.
        if (status === 401) {
          return { message: 'Logout berhasil.' }
        }

        throw error
      }
    },
    onSuccess: finishLogout,
    onError: () => {
      toast.error('Gagal keluar dari akun. Periksa koneksi lalu coba lagi.')
    },
  })
}
