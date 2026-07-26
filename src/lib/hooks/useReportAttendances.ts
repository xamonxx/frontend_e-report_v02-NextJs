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

/** Satu baris mode rekap: hitungan hari sepanjang rentang, bukan status harian. */
export type AttendanceRecapItem = {
  admin_id: number
  admin_name: string
  account_name: string
  account_description: string | null
  ada_wa: number
  nol_wa: number
  libur_susulan: number
  reported_days: number
  missing_days: number
  total_days: number
  compliance_rate: number
}

export type AttendanceStatusCounts = {
  all: number
  ada_wa: number
  nol_wa: number
  libur_susulan: number
  belum_laporan: number
}

export type AttendanceResponse =
  | {
      mode: 'daily'
      data: AttendanceItem[]
      status_counts: AttendanceStatusCounts
      date: string
      selected_status: string
    }
  | {
      mode: 'recap'
      data: AttendanceRecapItem[]
      status_counts: AttendanceStatusCounts
      start_date: string
      end_date: string
      total_days: number
      admin_count: number
      range_truncated: boolean
      max_range_days: number
      selected_status: string
    }

export type AccountGroupOption = {
  value: string
  label: string
  subtitle: string
}

export function useReportAttendances(filters: {
  date?: string
  status?: string
  start_date?: string
  end_date?: string
}) {
  return useQuery({
    queryKey: ['report-attendances', 'list', filters],
    queryFn: () =>
      api.get<AttendanceResponse>('/report-attendances', filters as any),
  })
}

/**
 * Daftar grup akun dari server. Sengaja tidak di-hardcode di frontend supaya
 * grup baru cukup ditambahkan di App\Support\AccountGroup.
 */
export function useAccountGroups() {
  return useQuery({
    queryKey: ['master-data', 'account-groups'],
    queryFn: () => api.get<{ data: AccountGroupOption[] }>('/master-data/account-groups'),
    staleTime: 5 * 60 * 1000,
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
