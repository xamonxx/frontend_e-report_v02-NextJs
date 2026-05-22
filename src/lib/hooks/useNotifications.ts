'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { NotificationCount, NotificationSummary } from '@/types'

export function useNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.count(),
    queryFn: () => api.get<NotificationCount>('/notifications'),
    refetchInterval: 30000, // Poll every 30s
  })
}

export function useNotificationSummary() {
  return useQuery({
    queryKey: queryKeys.notifications.summary(),
    queryFn: () => api.get<NotificationSummary>('/notifications/summary'),
    refetchInterval: 30000, // Poll every 30s
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
