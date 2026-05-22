'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { DashboardData } from '@/types'

/**
 * Hook to retrieve dashboard stats and charts.
 * Leverages React Query cache for instant page-switching.
 */
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.data(),
    queryFn: async () => {
      const res = await api.get<DashboardData>('/dashboard')
      return res
    },
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    refetchOnWindowFocus: false,
  })
}
