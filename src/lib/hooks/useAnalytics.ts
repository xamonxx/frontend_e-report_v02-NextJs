'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'

export interface AnalyticsFilters {
  account?: number
  account_group?: string
  period_type: 'weekly' | 'monthly' | 'yearly' | 'custom'
  week_date?: string
  month?: number
  year: number
  start_date?: string
  end_date?: string
}

export function useAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(filters as any),
    queryFn: ({ signal }) => api.get<any>('/analytics', filters as any, signal),
    placeholderData: (previousData) => previousData,
  })
}
