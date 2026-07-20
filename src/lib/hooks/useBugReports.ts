'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'

export const BUG_REPORT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number]

export type BugReportItem = {
  id: number
  ticket_code: string
  description: string
  page_url: string | null
  reporter_email: string | null
  images: string[]
  status: string
  reporter: { id: number; name: string } | null
  created_at: string | null
}

export type BugReportDetail = BugReportItem & {
  ip_address: string | null
  user_agent: string | null
}

/**
 * The index endpoint returns a raw Laravel paginator (pagination fields live at
 * the top level, NOT under `meta`), so we type it directly instead of reusing
 * PaginatedResponse<T>.
 */
export type BugReportListResponse = {
  data: BugReportItem[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

/** GET /api/v1/bug-reports (super_admin only). */
export function useBugReports(
  filters: { status?: string; page?: number },
  enabled = true,
) {
  return useQuery({
    enabled,
    queryKey: [...queryKeys.bugReports.all, filters],
    queryFn: () =>
      api.get<BugReportListResponse>('/bug-reports', {
        status: filters.status || undefined,
        page: filters.page,
      }),
  })
}

/** GET /api/v1/bug-reports/{id} â€” adds ip_address + user_agent to the row data. */
export function useBugReport(id: number | null, enabled = true) {
  return useQuery({
    enabled: enabled && id != null,
    queryKey: queryKeys.bugReports.detail(id ?? 0),
    queryFn: () => api.get<{ data: BugReportDetail }>(`/bug-reports/${id}`),
  })
}

/** DELETE /api/v1/bug-reports/{id} â€” permanently remove a report (super_admin). */
export function useDeleteBugReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/bug-reports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bugReports.all })
    },
  })
}

/** PATCH /api/v1/bug-reports/{id} â€” update workflow status (super_admin). */
export function useUpdateBugReportStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: BugReportStatus }) =>
      api.patch<{ message: string; data: { id: number; status: string } }>(
        `/bug-reports/${id}`,
        { status },
      ),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.bugReports.all })
      qc.invalidateQueries({ queryKey: queryKeys.bugReports.detail(id) })
    },
  })
}
