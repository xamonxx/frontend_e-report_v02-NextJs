'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import type { NeedsCategory, StatusCategory, PaginatedResponse } from '@/types'

// ── Read-only selectors for dropdowns ────────────────────────────

export function useNeedsCategories() {
  return useQuery({
    queryKey: queryKeys.masterData.needsCategories,
    queryFn: async () => {
      const res = await api.get<{ data: NeedsCategory[] }>('/master-data/needs-categories')
      return res.data
    },
    staleTime: 60 * 60 * 1000, // 1 hour caching
  })
}

export function useStatusCategories() {
  return useQuery({
    queryKey: queryKeys.masterData.statusCategories,
    queryFn: async () => {
      const res = await api.get<{ data: StatusCategory[] }>('/master-data/status-categories')
      return res.data
    },
    staleTime: 60 * 60 * 1000, // 1 hour caching
  })
}

export function useProvinces() {
  return useQuery({
    queryKey: queryKeys.wilayah.provinces,
    queryFn: async () => {
      const res = await api.get<{ data: string[] }>('/wilayah/provinces')
      return res.data
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours caching
  })
}

export function useCities(province?: string) {
  return useQuery({
    queryKey: queryKeys.wilayah.cities(province),
    queryFn: async () => {
      const res = await api.get<{ data: string[] }>('/wilayah/cities', { province })
      return res.data
    },
    enabled: !!province,
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useDistricts(city?: string) {
  return useQuery({
    queryKey: queryKeys.wilayah.districts(city),
    queryFn: async () => {
      const res = await api.get<{ data: string[] }>('/wilayah/districts', { city })
      return res.data
    },
    enabled: !!city,
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export type DetailedCity = {
  city: string
  province: string
}

export type DetailedDistrict = {
  district: string
  city: string
  province: string
}

export function useAllDetailedCities() {
  return useQuery({
    queryKey: ['wilayah', 'cities', 'detailed'],
    queryFn: async () => {
      const res = await api.get<{ data: DetailedCity[] }>('/wilayah/cities', { include_details: 'true' })
      return res.data
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours caching
  })
}

export function useAllDetailedDistricts() {
  return useQuery({
    queryKey: ['wilayah', 'districts', 'detailed'],
    queryFn: async () => {
      const res = await api.get<{ data: DetailedDistrict[] }>('/wilayah/districts', { include_details: 'true' })
      return res.data
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours caching
  })
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>('/master-data/accounts')
      return res.data
    },
    staleTime: 5 * 60 * 1000, // 5 min caching
  })
}

// ── Super Admin Needs Category CRUD ─────────────────────────────

export function useCategoriesList(filters?: { page?: number; per_page?: number; search?: string }) {
  return useQuery({
    queryKey: ['master-data', 'categories', 'list', filters],
    queryFn: () =>
      api.get<PaginatedResponse<NeedsCategory>>('/master-data/categories/list', filters as any),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post<{ message: string; data: NeedsCategory }>('/master-data/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'categories'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.masterData.needsCategories })
    },
  })
}

export function useUpdateCategory(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.put<{ message: string; data: NeedsCategory }>(`/master-data/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'categories'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.masterData.needsCategories })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ message: string }>(`/master-data/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'categories'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.masterData.needsCategories })
    },
  })
}

// ── Super Admin Status Category CRUD ─────────────────────────────

export function useStatusesList(filters?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['master-data', 'statuses', 'list', filters],
    queryFn: () =>
      api.get<PaginatedResponse<StatusCategory>>('/master-data/statuses/list', filters as any),
  })
}

export function useCreateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post<{ message: string; data: StatusCategory }>('/master-data/statuses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'statuses'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.masterData.statusCategories })
    },
  })
}

export function useUpdateStatus(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.put<{ message: string; data: StatusCategory }>(`/master-data/statuses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'statuses'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.masterData.statusCategories })
    },
  })
}

export function useDeleteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ message: string }>(`/master-data/statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'statuses'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.masterData.statusCategories })
    },
  })
}

/** Persist a new pipeline-stage order produced by drag-and-drop. */
export function useReorderStatuses() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: number[]) =>
      api.patch<{ message: string; data: StatusCategory[] }>('/master-data/statuses/reorder', { order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'statuses'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.masterData.statusCategories })
    },
  })
}

// ── Super Admin Users Management CRUD ───────────────────────────

export type UserItem = {
  id: number
  name: string
  email: string
  role: 'admin' | 'super_admin' | 'surveyor' | 'manager_surveyor'
  account_id: number | null
  created_at: string
  updated_at: string
  account?: { id: number; name: string } | null
}

export function useUsersList(filters: { search?: string; page?: number }) {
  return useQuery({
    queryKey: ['master-data', 'users', 'list', filters],
    queryFn: () =>
      api.get<PaginatedResponse<UserItem>>('/master-data/users', filters as any),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.post<{ message: string; data: UserItem }>('/master-data/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateUser(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.put<{ message: string; data: UserItem }>(`/master-data/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ message: string }>(`/master-data/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, any> }) =>
      api.post<{ message: string }>(`/master-data/users/${id}/reset-password`, data),
  })
}
