'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The dashboard view is a large client component that pulls in recharts.
 * We lazy-load it (ssr:false) behind a lightweight skeleton so navigating to
 * this route paints instantly instead of blocking on the heavy chart bundle.
 */
const DashboardView = dynamic(() => import('./dashboard-view'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
})

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      {/* Filter bar */}
      <Skeleton className="h-28 rounded-2xl" />
      {/* Chart row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardView />
}
