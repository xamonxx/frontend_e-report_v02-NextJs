'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Mengikuti pola /analytics: view-nya client component besar (filter bar +
 * grid mingguan), jadi di-lazy-load di balik skeleton supaya rute ini langsung
 * tergambar alih-alih menunggu bundle-nya.
 */
const RekapJadwalSurveyorView = dynamic(() => import('./rekap-jadwal-surveyor-view'), {
  ssr: false,
  loading: () => <RekapJadwalSkeleton />,
})

function RekapJadwalSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  )
}

export default function RekapJadwalSurveyorPage() {
  return <RekapJadwalSurveyorView />
}
