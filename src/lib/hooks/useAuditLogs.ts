'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { PaginatedResponse } from '@/types'

export type AuditLogItem = {
  id: number
  user_id: number | null
  user_name: string | null
  action: 'created' | 'updated' | 'deleted' | 'retrieved'
  loggable_type: string | null
  loggable_id: number | null
  description: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  created_at: string
  ip_address: string | null
  user_agent: string | null
  user?: { id: number; name: string } | null
}

export function useAuditLogs(filters: {
  search?: string
  action?: string
  user_id?: string
  start_date?: string
  end_date?: string
  page?: number
}) {
  return useQuery({
    queryKey: [...queryKeys.auditLogs.all, filters],
    queryFn: ({ signal }) =>
      api.get<PaginatedResponse<AuditLogItem>>('/audit-logs', filters as any, signal),
  })
}
