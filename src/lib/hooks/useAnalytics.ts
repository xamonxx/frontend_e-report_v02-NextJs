'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'

export interface AnalyticsFilters {
  account?: number
  period_type: 'weekly' | 'monthly' | 'yearly'
  week_date?: string
  month?: number
  year: number
}

export function useAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(filters as any),
    queryFn: () => api.get<any>('/analytics', filters as any),
    placeholderData: (previousData) => previousData,
  })
}
