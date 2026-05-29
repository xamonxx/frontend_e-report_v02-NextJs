'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api, setAuthToken, removeAuthToken, getAuthToken } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import { useAuthStore } from '@/lib/stores/authStore'
import type { AuthUser } from '@/types'

/**
 * Fetch current authenticated user. Called on app mount.
 * Optimized with localStorage hint to prevent 401 console logs when logged out.
 */
export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser)
  const clearUser = useAuthStore((s) => s.clearUser)
  const [shouldFetch, setShouldFetch] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Strictly gate on token existence — no token = no /auth/me request
      const hasToken = !!getAuthToken()
      if (!hasToken) {
        // Clear stale flags when no token exists
        localStorage.setItem('e_report_logged_in', 'false')
        clearUser()
        setIsChecking(false)
        return
      }
      setShouldFetch(true)
    }
  }, [clearUser])

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      // Double-check token before fetching
      if (!getAuthToken()) {
        throw new Error('No auth token')
      }
      const res = await api.get<{ user: AuthUser }>('/auth/me')
      return res.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      clearUser()
      removeAuthToken()
      localStorage.setItem('e_report_logged_in', 'false')
    }
  }, [data, isSuccess, isError, setUser, clearUser])

  return {
    ...query,
    isChecking,
  }
}

/**
 * Login mutation. Authenticates and stores Bearer token.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string; remember?: boolean }) => {
      const res = await api.post<{ user: AuthUser; token: string; message: string }>('/auth/login', credentials)
      return res
    },
    onSuccess: (data) => {
      // Store the Bearer token
      setAuthToken(data.token)
      setUser(data.user)
      localStorage.setItem('e_report_logged_in', 'true')
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      router.push('/dashboard')
    },
  })
}

/**
 * Logout mutation. Revokes token and redirects to login.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const clearUser = useAuthStore((s) => s.clearUser)

  return useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/logout'),
    onSuccess: () => {
      removeAuthToken()
      clearUser()
      localStorage.setItem('e_report_logged_in', 'false')
      queryClient.clear()
      router.push('/login')
    },
    onError: () => {
      // Even if logout API fails, clear local state
      removeAuthToken()
      clearUser()
      localStorage.setItem('e_report_logged_in', 'false')
      queryClient.clear()
      router.push('/login')
    },
  })
}
