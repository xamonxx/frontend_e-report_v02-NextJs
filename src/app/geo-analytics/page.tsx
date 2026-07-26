'use client'

import dynamic from 'next/dynamic'
import PageSkeleton from '@/components/layout/page-skeleton'

// Lazy-load view + peta SVG di klien; jangan blok bundle awal.
const View = dynamic(() => import('./geo-analytics-view'), {
  ssr: false,
  loading: () => <PageSkeleton />,
})

export default function GeoAnalyticsPage() {
  return <View />
}
