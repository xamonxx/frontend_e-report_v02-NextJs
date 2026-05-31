'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The analytics view is a large client component that pulls in recharts.
 * We lazy-load it (ssr:false) behind a lightweight skeleton so navigating to
 * this route paints instantly instead of blocking on the heavy chart bundle.
 */
const AnalyticsView = dynamic(() => import('./analytics-view'), {
  ssr: false,
  loading: () => <AnalyticsSkeleton />,
})

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter / header bar */}
      <Skeleton className="h-28 rounded-2xl" />
      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {/* Charts grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return <AnalyticsView />
}
