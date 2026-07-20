'use client'

import dynamic from 'next/dynamic'
import PageSkeleton from '@/components/layout/page-skeleton'

const View = dynamic(() => import('./survey-consumers-view'), {
  ssr: false,
  loading: () => <PageSkeleton />,
})

export default function SurveyConsumersPage() {
  return <View />
}
