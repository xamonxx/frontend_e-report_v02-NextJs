import type { QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'

/**
 * Warm the React Query cache for a route's primary data the moment the user
 * hovers/focuses its sidebar link, so the data is already there on click.
 *
 * The query keys + fetchers below MUST match each page's initial useQuery call
 * exactly, otherwise the page would request a different key and the prefetch is
 * wasted. `prefetchQuery` respects staleTime, so repeated hovers don't refetch.
 */
export function prefetchRoute(qc: QueryClient, href: string): void {
  const staleTime = 5 * 60 * 1000

  switch (href) {
    case '/dashboard':
      qc.prefetchQuery({
        queryKey: queryKeys.dashboard.data(),
        queryFn: () => api.get('/dashboard'),
        staleTime,
      })
      break

    case '/analytics': {
      const now = new Date()
      // Mirrors AnalyticsView's initial filters (monthly, current month/year).
      const filters = {
        period_type: 'monthly' as const,
        account: undefined,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        week_date: undefined,
      }
      qc.prefetchQuery({
        queryKey: queryKeys.analytics.summary(filters as Record<string, unknown>),
        queryFn: () => api.get('/analytics', filters as Record<string, string | number | undefined>),
        staleTime,
      })
      break
    }

    case '/consultations': {
      // Mirrors ConsultationsView's initial (unfiltered) first page.
      const filters = {
        search: '',
        status: '',
        account: '',
        month: '',
        year: '',
        start_date: '',
        end_date: '',
        page: 1,
        per_page: 10,
      }
      qc.prefetchQuery({
        queryKey: queryKeys.consultations.list(filters),
        queryFn: () => api.get('/consultations', filters as Record<string, string | number | undefined>),
        staleTime,
      })
      break
    }
  }
}
