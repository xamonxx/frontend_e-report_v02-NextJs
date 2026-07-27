'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api, setAuthToken, removeAuthToken, getAuthToken } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import { useAuthStore } from '@/lib/stores/authStore'
import type { AuthUser } from '@/types'

/**
 * Fetch current authenticated user. Called on app mount.
 * Only calls /auth/me if a Bearer token exists in localStorage.
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
      const hasToken = !!getAuthToken()
      if (!hasToken) {
        if (!storeIsAuthenticated) {
          localStorage.setItem('e_report_logged_in', 'false')
          clearUser()
        }
        setIsChecking(false)
        return
      }
      setShouldFetch(true)
    }
  }, [storeIsAuthenticated, clearUser])

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async ({ signal }) => {
      if (!getAuthToken()) {
        throw new Error('No auth token')
      }
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
        removeAuthToken()
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
      // Store the Bearer token FIRST
      setAuthToken(data.token)
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
 * Logout mutation. Revokes token and redirects to login.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const clearUser = useAuthStore((s) => s.clearUser)

  const cleanup = useCallback(() => {
    removeAuthToken()
    clearUser()
    localStorage.setItem('e_report_logged_in', 'false')
    queryClient.clear()
    router.push('/login')
  }, [clearUser, queryClient, router])

  return useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/logout'),
    onSuccess: cleanup,
    onError: cleanup,
  })
}
