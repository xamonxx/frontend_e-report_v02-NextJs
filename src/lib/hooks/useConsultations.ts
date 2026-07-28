'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { Consultation, ConsultationFilters, PaginatedResponse, ApiResponse } from '@/types'

function invalidateConsultationDependents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
}

/**
 * Hook to fetch paginated and filtered consultations list.
 */
export function useConsultations(filters: ConsultationFilters) {
  return useQuery({
    queryKey: queryKeys.consultations.list(filters),
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<Consultation>>('/consultations', filters as any, signal),
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook to retrieve a single consultation detail.
 */
export function useConsultation(id: number) {
  return useQuery({
    queryKey: queryKeys.consultations.detail(id),
    queryFn: ({ signal }) => api.get<ApiResponse<Consultation>>(`/consultations/${id}`, undefined, signal),
    enabled: !!id,
  })
}

/**
 * Hook to pre-generate a customized consultation ID block.
 */
export function usePreviewConsultationId(accountId?: number) {
  return useQuery({
    queryKey: queryKeys.consultations.previewId(accountId),
    queryFn: ({ signal }) =>
      api.get<{ id: string; consultation_id: string }>('/consultations/id-preview', {
        account_id: accountId,
      }, signal),
  })
}

/**
 * Hook to register a new consultation lead.
 */
export function useCreateConsultation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Consultation, 'id' | 'consultation_id' | 'created_at' | 'updated_at' | 'account' | 'status_category' | 'needs_category' | 'creator'> & { account_id?: number; status_category_id?: number; needs_category_ids?: number[] }) =>
      api.post<ApiResponse<Consultation>>('/consultations', data),
    onSuccess: () => {
      invalidateConsultationDependents(queryClient)
    },
  })
}

/**
 * Hook to update an existing consultation details.
 */
export function useUpdateConsultation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Omit<Consultation, 'id' | 'consultation_id' | 'created_at' | 'updated_at' | 'account' | 'status_category' | 'needs_category' | 'creator'>> & { account_id?: number; status_category_id?: number; needs_category_ids?: number[] }) =>
      api.put<ApiResponse<Consultation>>(`/consultations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(id) })
      invalidateConsultationDependents(queryClient)
    },
  })
}

/**
 * Hook to quickly transition a lead's pipeline status stage.
 */
export function useUpdateConsultationStatus(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (statusCategoryId: number) =>
      api.patch<{ message: string; consultation: Consultation }>(
        `/consultations/${id}/status`,
        { status_category_id: statusCategoryId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(id) })
      invalidateConsultationDependents(queryClient)
    },
  })
}

/**
 * Hook to delete a consultation record.
 */
export function useDeleteConsultation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/consultations/${id}`),
    onSuccess: () => {
      invalidateConsultationDependents(queryClient)
    },
  })
}

/**
 * Hook to dispatch background CSV import queue parsing.
 */
export function useImportConsultations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.postForm<{ message: string }>('/consultations/import', formData),
    onSuccess: () => {
      invalidateConsultationDependents(queryClient)
    },
  })
}

/**
 * Hook to create a consultation timeline note.
 */
export function useCreateNote(consultationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      api.post<ApiResponse<any>>(`/consultations/${consultationId}/notes`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(consultationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

/**
 * Hook to delete a consultation timeline note.
 */
export function useDeleteNote(consultationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: number) =>
      api.delete<{ message: string }>(`/consultations/${consultationId}/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(consultationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

/**
 * Hook to create a consultation reminder.
 */
export function useCreateReminder(consultationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { message: string; remind_at: string }) =>
      api.post<ApiResponse<any>>(`/consultations/${consultationId}/reminders`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(consultationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

/**
 * Hook to delete a consultation reminder.
 */
export function useDeleteReminder(consultationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: number) =>
      api.delete<{ message: string }>(`/consultations/${consultationId}/reminders/${reminderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(consultationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

/**
 * Hook to mark a consultation reminder as completed/read.
 */
export function useMarkReminderDone(consultationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: number) =>
      api.patch<{ message: string }>(`/notifications/reminders/${reminderId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(consultationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}
