'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type {
  Survey,
  SurveyFilters,
  SurveyStatusItem,
  SurveyorItem,
  SurveyorAvailability,
  SurveyActivity,
  PaginatedResponse,
  ApiResponse,
} from '@/types'

/**
 * Daftar survey (manager: semua, surveyor: miliknya). Server-side filter + paginasi.
 */
export function useSurveys(filters: SurveyFilters) {
  return useQuery({
    queryKey: queryKeys.surveys.list(filters),
    queryFn: ({ signal }) => api.get<PaginatedResponse<Survey>>('/surveys', filters as any, signal),
    placeholderData: (previousData) => previousData,
  })
}

export function useSurvey(id: number) {
  return useQuery({
    queryKey: queryKeys.surveys.detail(id),
    queryFn: ({ signal }) => api.get<ApiResponse<Survey>>(`/surveys/${id}`, undefined, signal),
    enabled: !!id,
  })
}

export function useSurveyHistory(id: number) {
  return useQuery({
    queryKey: [...queryKeys.surveys.detail(id), 'history'],
    queryFn: ({ signal }) => api.get<ApiResponse<SurveyActivity[]>>(`/surveys/${id}/history`, undefined, signal),
    enabled: id > 0,
  })
}

export function useSurveyorAvailability(date?: string) {
  return useQuery({
    queryKey: [...queryKeys.surveys.all, 'availability', date],
    queryFn: ({ signal }) => api.get<ApiResponse<SurveyorAvailability[]>>('/surveys/availability', { date }, signal),
    enabled: Boolean(date),
  })
}

/**
 * Daftar user surveyor untuk dropdown penugasan (manager/super_admin).
 */
export function useSurveyors() {
  return useQuery({
    queryKey: queryKeys.masterData.surveyors,
    queryFn: ({ signal }) => api.get<ApiResponse<SurveyorItem[]>>('/master-data/surveyors', undefined, signal),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Daftar status hasil survey (dropdown surveyor saat isi hasil).
 */
export function useSurveyStatuses() {
  return useQuery({
    queryKey: queryKeys.masterData.surveyStatuses,
    queryFn: ({ signal }) => api.get<ApiResponse<SurveyStatusItem[]>>('/master-data/survey-statuses', undefined, signal),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Admin/sales mengajukan survey untuk sebuah lead.
 */
export type RequestSurveyPayload = {
  requested_date: string
  requested_time?: string
  requested_item?: string
  google_maps_url?: string
  admin_notes?: string
}

export function useRequestSurvey(consultationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RequestSurveyPayload) =>
      api.post<ApiResponse<Survey>>(`/consultations/${consultationId}/survey`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.detail(consultationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      // Badge "lead belum diajukan" ikut berubah begitu pengajuan masuk.
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

/**
 * Manager menugaskan surveyor + jadwal â†’ state scheduled.
 */
export function useAssignSurvey(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { surveyor_id: number; scheduled_at: string; location_notes?: string }) =>
      api.patch<ApiResponse<Survey>>(`/surveys/${id}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

/**
 * Admin mengubah jadwal survey yang diajukan (reschedule) â†’ notif ke manager.
 */
export function useRescheduleSurvey(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { requested_date: string; requested_time?: string; admin_notes?: string }) =>
      api.patch<ApiResponse<Survey>>(`/surveys/${id}/reschedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

/** Manager mengubah jadwal final atau surveyor yang sudah ditugaskan. */
export function useRescheduleAssignment(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { surveyor_id: number; scheduled_at: string; location_notes?: string; manager_notes?: string }) =>
      api.patch<ApiResponse<Survey>>(`/surveys/${id}/reschedule-assignment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

/** Surveyor memulai kunjungan; backend mencatat waktu aktual mulai. */
export function useStartSurvey(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch<ApiResponse<Survey>>(`/surveys/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

/**
 * Surveyor mengisi hasil survey â†’ state completed.
 */
export function useSubmitSurveyResult(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { result_status_id: number; result_notes?: string }) =>
      api.patch<ApiResponse<Survey>>(`/surveys/${id}/result`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

/**
 * Batalkan survey (manager/super_admin).
 */
export function useCancelSurvey(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch<ApiResponse<Survey>>(`/surveys/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}
