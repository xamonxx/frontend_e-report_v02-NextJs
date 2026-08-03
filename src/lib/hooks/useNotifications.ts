'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { NotificationCount, NotificationSummary } from '@/types'

/**
 * Custom hook to detect user activity and visibility state.
 * Returns true if the user is active, false if idle or tab is hidden.
 */
export function useUserActivity(idleTimeout = 60000) {
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeoutId: ReturnType<typeof setTimeout>
    let lastHandledAt = 0

    const handleActivity = () => {
      // If the document is hidden, consider user inactive
      if (document.visibilityState === 'hidden') {
        setIsActive(false)
        return
      }

      const now = Date.now()
      if (now - lastHandledAt < 5000) return
      lastHandledAt = now
      setIsActive(true)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setIsActive(false)
      }, idleTimeout)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity()
      } else {
        setIsActive(false)
      }
    }

    // Track user input events
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Trigger initially
    handleActivity()

    return () => {
      clearTimeout(timeoutId)
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [idleTimeout])

  return isActive
}

/**
 * Lightweight badge count. Safe to poll continuously.
 * Realtime events keep this fresh; polling is only a resilient fallback.
 */
export function useNotificationCount() {
  const isActive = useUserActivity()

  // Reverb memberi pembaruan langsung. Interval ini hanya fallback agar tetap
  // segar ketika websocket diblokir jaringan seluler atau proxy.
  return useQuery({
    queryKey: queryKeys.notifications.count(),
    queryFn: ({ signal }) => api.get<NotificationCount>('/notifications', undefined, signal),
    refetchInterval: isActive ? 30000 : 300000,
    refetchIntervalInBackground: false,
    // Gratis: hanya berjalan saat user kembali ke tab, tidak menambah polling
    // latar. Ini yang membuat angka terasa segar tanpa menaikkan koneksi DB.
    refetchOnWindowFocus: true,
  })
}

/**
 * Full notification detail (notes + reminders with joins).
 * Hanya polling saat dropdown dibuka — interval dilonggarkan untuk shared hosting.
 */
export function useNotificationSummary(enabled = true) {
  const isActive = useUserActivity()
  const interval = enabled && isActive ? 30000 : (enabled ? 120000 : false)

  return useQuery({
    queryKey: queryKeys.notifications.summary(),
    queryFn: ({ signal }) => api.get<NotificationSummary>('/notifications/summary', undefined, signal),
    enabled,
    refetchInterval: interval,
    refetchIntervalInBackground: false,
    // Opening the panel enables the query and starts polling; focus changes
    // must not duplicate the same request on top of that interval.
    refetchOnWindowFocus: false,
  })
}

export function useMarkNoteRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: number) =>
      api.patch<{ message: string }>(`/notifications/notes/${noteId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkReminderRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: number) =>
      api.patch<{ message: string }>(`/notifications/reminders/${reminderId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkSurveyRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: number) =>
      api.patch<{ success: boolean }>(`/notifications/surveys/${notificationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}

export function useDeleteSurveyNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: number) =>
      api.delete<{ success: boolean }>(`/notifications/surveys/${notificationId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}

export function useMarkAttendanceRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: number) =>
      api.patch<{ success: boolean }>(`/notifications/attendances/${notificationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}

export function useDeleteAttendanceNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: number) =>
      api.delete<{ success: boolean }>(`/notifications/attendances/${notificationId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}

export function useClearNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.delete<{ success: boolean; cleared: number }>('/notifications/clear'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  })
}
