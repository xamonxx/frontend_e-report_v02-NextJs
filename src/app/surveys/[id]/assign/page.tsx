'use client'

import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { SurveyAssignmentForm } from '@/components/surveys/survey-assignment-form'
import { Button } from '@/components/ui/button'
import { isManagerSurveyor } from '@/lib/auth/roles'
import { useSurvey } from '@/lib/hooks/useSurveys'
import { useAuthStore } from '@/lib/stores/authStore'

export default function SurveyAssignmentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const surveyId = Number(params.id)
  const { data, isLoading, isError } = useSurvey(Number.isFinite(surveyId) ? surveyId : 0)
  const canAssign = isManagerSurveyor(user) || user?.role === 'super_admin'

  const goBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.replace('/surveys')
  }

  if (!canAssign) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 text-center shadow-sm">
          <AlertTriangle className="mx-auto size-6 text-amber-500" />
          <h1 className="mt-3 font-heading text-lg font-bold">Akses tidak tersedia</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Penjadwalan survey hanya dapat dilakukan oleh Manager Surveyor.
          </p>
          <Button onClick={goBack} className="mt-4 h-10 w-full rounded-lg">
            Kembali
          </Button>
        </div>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-cyan-600" />
          Memuat penjadwalan...
        </div>
      </main>
    )
  }

  if (isError || !data?.data) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 text-center shadow-sm">
          <AlertTriangle className="mx-auto size-6 text-rose-500" />
          <h1 className="mt-3 font-heading text-lg font-bold">Survey tidak dapat dimuat</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Muat ulang halaman atau kembali ke daftar survey.
          </p>
          <Button onClick={goBack} className="mt-4 h-10 w-full rounded-lg">
            Kembali
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="h-dvh overflow-hidden bg-background">
      <div className="mx-auto h-full w-full max-w-3xl border-x border-border bg-card dark:border-white/10">
        <SurveyAssignmentForm
          survey={data.data}
          surface="page"
          onCancel={goBack}
          onSaved={() => router.replace('/surveys')}
        />
      </div>
    </main>
  )
}
