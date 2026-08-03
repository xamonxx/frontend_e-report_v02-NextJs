'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import { useAuthStore } from '@/lib/stores/authStore'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (data: {
      name: string
      email: string
      current_password?: string
      password?: string
      password_confirmation?: string
    }) => api.post<{ message: string; user: any }>('/settings/profile', data),
    onSuccess: (response) => {
      // Update local store state with the new user details
      if (response.user) {
        setUser(response.user)
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (formData: FormData) =>
      api.postForm<{ message: string; avatar: string | null }>('/settings/avatar', formData),
    onSuccess: (response) => {
      if (user) {
        setUser({ ...user, avatar: response.avatar })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useUpdateTheme() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (primaryColor: string) =>
      api.post<{ message: string; primary_color: string }>('/settings/theme', {
        primary_color: primaryColor,
      }),
    onSuccess: (response) => {
      if (user && response.primary_color) {
        setUser({ ...user, primary_color: response.primary_color })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}
