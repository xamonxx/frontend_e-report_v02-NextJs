'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type AttendanceItem = {
  admin_id: number
  admin_name: string
  account_name: string
  account_description: string | null
  has_reported: boolean
  reported_at: string | null
  report_category: 'ada_wa' | 'nol_wa' | 'libur_susulan' | null
}

export type AttendanceResponse = {
  data: AttendanceItem[]
  status_counts: {
    all: number
    ada_wa: number
    nol_wa: number
    libur_susulan: number
    belum_laporan: number
  }
  date: string
  selected_status: string
}

export function useReportAttendances(filters: {
  date?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['report-attendances', 'list', filters],
    queryFn: () =>
      api.get<AttendanceResponse>('/report-attendances', filters as any),
  })
}

export function useSubmitAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { report_category: 'ada_wa' | 'nol_wa' | 'libur_susulan' }) =>
      api.post<{ message: string }>('/report-attendances', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-attendances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpsertAttendanceBySuperAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      user_id: number
      report_date: string
      report_category: 'ada_wa' | 'nol_wa' | 'libur_susulan' | null
    }) =>
      api.post<{ message: string }>('/report-attendances/upsert-by-super-admin', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-attendances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
