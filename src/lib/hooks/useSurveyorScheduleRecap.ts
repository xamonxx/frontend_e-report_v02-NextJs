'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { ApiResponse, SurveyorRecapFilters, SurveyorRecapReport } from '@/types'

/**
 * Rekap jadwal surveyor satu minggu Seninâ€“Minggu.
 *
 * Tanpa staleTime: halaman ini menampilkan jadwal berjalan, dan API-nya juga
 * sengaja tidak di-cache. Data basi di sini terbaca sebagai bug oleh manager
 * yang baru saja menugaskan surveyor.
 */
export function useSurveyorScheduleRecap(filters: SurveyorRecapFilters) {
  return useQuery({
    queryKey: queryKeys.surveys.recap(filters),
    queryFn: ({ signal }) => api.get<ApiResponse<SurveyorRecapReport>>('/surveys/recap', filters, signal),
    // Pertahankan data lama saat filter berganti supaya grid tidak berkedip.
    placeholderData: (previousData) => previousData,
  })
}
