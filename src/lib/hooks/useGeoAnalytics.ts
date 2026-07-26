'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface GeoAnalyticsFilters {
  period_type: 'weekly' | 'monthly' | 'yearly' | 'custom'
  week_date?: string
  month?: number
  year: number
  start_date?: string
  end_date?: string
  account?: number
  account_group?: string
  status?: number
  needs_category?: number
  province?: string
}

export interface GeoRegion {
  region_id: string
  name: string
  total: number
  surveys: number
  deals: number
  closing_rate: number
  share: number
}

export interface GeoCity {
  region_id: string
  name: string
  province: string | null
  total: number
  surveys: number
  deals: number
  closing_rate: number
}

export interface GeoAccount {
  id: number
  name: string
  total: number
  surveys: number
  deals: number
  closing_rate: number
}

export interface GeoStatus {
  id: number
  name: string
  color: string | null
  count: number
}

export interface GeoAnalyticsData {
  period: { type: string; start: string; end: string; label: string }
  kpi: {
    total_consultations: number
    total_customers: number
    total_surveys: number
    total_deals: number
    closing_rate: number
    survey_rate: number
    active_regions: number
    unlocated: number
  }
  statusBreakdown: GeoStatus[]
  provinces: GeoRegion[]
  unlocatedProvince: number
  unmatchedRegions: { name: string; total: number }[]
  cities: GeoCity[]
  accountRanking: GeoAccount[]
  productByRegion: { region_id: string; name: string; top_product: string; total: number }[]
}

export function useGeoAnalytics(filters: GeoAnalyticsFilters) {
  return useQuery({
    queryKey: ['geo-analytics', filters],
    queryFn: () =>
      api.get<{ data: GeoAnalyticsData }>('/geo-analytics', filters as any),
    placeholderData: (previous) => previous,
  })
}

export interface RegionFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id: string
    properties: { region_id: string; name: string; province?: string; province_id?: string | null }
    geometry: unknown
  }>
}
export type ProvinceFeatureCollection = RegionFeatureCollection

/**
 * GeoJSON batas wilayah statis di /public, di-fetch sekali dan di-cache lama.
 * Tidak ikut bundle JS.
 */
function useGeoJson(key: string, path: string) {
  return useQuery({
    queryKey: ['geojson', key],
    queryFn: async () => {
      const res = await fetch(path)
      if (!res.ok) throw new Error('Gagal memuat peta wilayah')
      return res.json() as Promise<RegionFeatureCollection>
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export const useProvinceGeoJson = () => useGeoJson('idn-provinces', '/geo/idn-provinces.geojson')
export const useKabkotaGeoJson = () => useGeoJson('idn-kabkota', '/geo/idn-kabkota.geojson')
