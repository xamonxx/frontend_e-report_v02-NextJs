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

    let timeoutId: NodeJS.Timeout

    const handleActivity = () => {
      // If the document is hidden, consider user inactive
      if (document.visibilityState === 'hidden') {
        setIsActive(false)
        return
      }

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
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
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
 * Polling is adjusted dynamically: 3s if active, 30s if idle, paused if hidden.
 */
export function useNotificationCount() {
  const isActive = useUserActivity()

  return useQuery({
    queryKey: queryKeys.notifications.count(),
    queryFn: () => api.get<NotificationCount>('/notifications'),
    refetchInterval: isActive ? 3000 : 30000, // 3s active, 30s idle
  })
}

/**
 * Full notification detail (notes + reminders with joins).
 * Polling is active only when dropdown is open: 3s if active, 30s if idle, disabled if closed.
 */
export function useNotificationSummary(enabled = true) {
  const isActive = useUserActivity()
  const interval = enabled && isActive ? 3000 : (enabled ? 30000 : false)

  return useQuery({
    queryKey: queryKeys.notifications.summary(),
    queryFn: () => api.get<NotificationSummary>('/notifications/summary'),
    enabled,
    refetchInterval: interval,
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
