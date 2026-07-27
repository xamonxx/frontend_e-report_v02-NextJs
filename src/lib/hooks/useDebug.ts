'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'

export interface DebugStats {
  latency_ms: number
  total_leads: number
  dummy_leads: number
  real_leads: number
  duplicate_leads: number
  monthly_distribution: {
    label: string
    month: number
    year: number
    count: number
  }[]
  status_breakdown: {
    name: string
    color: string
    count: number
  }[]
}

/**
 * Hook to retrieve debug stats (latency, counts, distributions).
 */
export function useDebugStats() {
  return useQuery({
    queryKey: queryKeys.debug.stats(),
    queryFn: ({ signal }) => api.get<DebugStats>('/debug/stats', undefined, signal),
  })
}

/**
 * Hook to trigger generation of dummy leads.
 */
export function useGenerateDummy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (count: number) =>
      api.post<{ message: string; generated_count: number }>('/debug/generate-dummy', { count }),
    onSuccess: () => {
      // Invalidate all related queries to refresh lists and dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.debug.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },
  })
}

/**
 * Hook to clear dummy leads.
 */
export function useClearDummy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ message: string; cleared_count: number }>('/debug/clear-dummy'),
    onSuccess: () => {
      // Invalidate all related queries to refresh lists and dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.debug.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
    },
  })
}

/**
 * Hook to clear system logs (app file logs + database audit logs).
 */
export function useClearLogs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ message: string; cleared_audit_count: number; cleared_app_logs_count: number }>('/debug/clear-logs'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debug.all })
      // Audit logs queries should also be invalidated if they exist
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })
}
