'use client'

import dynamic from 'next/dynamic'
import PageSkeleton from '@/components/layout/page-skeleton'

// Lazy-load the heavy client view behind an instant skeleton so navigating
// to this route paints immediately instead of blocking on its JS bundle.
const View = dynamic(() => import('./settings-view'), {
  ssr: false,
  loading: () => <PageSkeleton />,
})

export default function SettingsPage() {
  return <View />
}
