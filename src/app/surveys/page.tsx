'use client'

import dynamic from 'next/dynamic'
import PageSkeleton from '@/components/layout/page-skeleton'

// Lazy-load the client view behind an instant skeleton (matches other routes).
const View = dynamic(() => import('./surveys-view'), {
  ssr: false,
  loading: () => <PageSkeleton />,
})

export default function SurveysPage() {
  return <View />
}
