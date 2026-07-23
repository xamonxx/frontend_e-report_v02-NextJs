'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { PaginatedResponse } from '@/types'

export type AccountItem = {
  id: number
  name: string
  description: string | null
  target_leads: number | null
  logo_path: string | null
  logo_url?: string | null
  created_at: string
  updated_at: string
  consultations_count?: number
  deals_count?: number
  admins?: { id: number; name: string }[]
}

export function useAccountsList(filters: {
  search?: string
  category?: string
  page?: number
  per_page?: number
}) {
  return useQuery({
    queryKey: [...queryKeys.accounts.all, 'list', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AccountItem>>('/accounts', filters as any),
  })
}

/**
 * Daftar grup akun unik (kolom `description`) untuk dropdown filter.
 * Nama endpoint/hook masih "categories" mengikuti API; di UI istilahnya "Grup".
 */
export function useAccountCategories() {
  return useQuery({
    queryKey: [...queryKeys.accounts.all, 'categories'],
    queryFn: async () => {
      const res = await api.get<{ data: string[] }>('/accounts/categories')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: [...queryKeys.accounts.all, 'detail', id],
    queryFn: () => api.get<{ data: AccountItem }>(`/accounts/${id}`),
    enabled: !!id,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) =>
      api.postForm<{ message: string; data: AccountItem }>('/accounts', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useUpdateAccount(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => {
      // Use POST method with _method override to support file uploading in Laravel multipart/form-data
      formData.append('_method', 'PUT')
      return api.postForm<{ message: string; data: AccountItem }>(`/accounts/${id}`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ message: string }>(`/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}
