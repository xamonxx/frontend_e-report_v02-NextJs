'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api, getXsrfToken } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import { isAdmin, isManagerSurveyor, isSuperAdmin, isSurveyor } from '@/lib/auth/roles'
import { useAuthStore } from '@/lib/stores/authStore'

type SurveyRealtimePayload = {
  surveyId?: number
  action?: string
  message?: string
}

type ConsultationNoteRealtimePayload = {
  noteId?: number
  consultationId?: number
  consultationName?: string
  authorName?: string
  body?: string
  createdAt?: string
}

type ConsultationNotesChangedPayload = {
  consultationId?: number
  action?: 'updated' | 'deleted' | 'cleared'
  noteIds?: number[]
  actorId?: number
}

type RealtimeChannel = {
  listen: (event: string, callback: (payload: any) => void) => RealtimeChannel
}

declare global {
  interface Window {
    Pusher?: unknown
  }
}

function realtimeHost(): string {
  const configured = process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost'
  if (typeof window === 'undefined') return configured
  return configured === 'localhost' || configured === '127.0.0.1'
    ? window.location.hostname
    : configured
}

export function SurveyRealtimeListener() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY
    if (!key) return

    let disposed = false
    let echo: {
      private: (channel: string) => RealtimeChannel
      leave: (channel: string) => void
      disconnect: () => void
    } | null = null
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const pendingSurveyIds = new Set<number>()
    const surveyChannels: string[] = []
    if (isManagerSurveyor(user) || isSuperAdmin(user)) {
      surveyChannels.push('survey.managers')
    }
    if (isSurveyor(user)) {
      surveyChannels.push(`survey.surveyor.${user.id}`)
    }
    if (isAdmin(user) && user.account_id) {
      surveyChannels.push(`survey.account.${user.account_id}`)
    }
    const noteChannel = isAdmin(user) || isSuperAdmin(user)
      ? `consultation-notes.user.${user.id}`
      : null

    const scheduleRefresh = (payload?: SurveyRealtimePayload) => {
      if (payload?.surveyId) pendingSurveyIds.add(payload.surveyId)
      if (refreshTimer) return

      // Satu bulk update dapat memancarkan banyak event. Satukan semuanya agar
      // query aktif hanya refetch sekali dan kartu tidak berkedip berulang.
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
        pendingSurveyIds.forEach((surveyId) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(surveyId) })
        })
        pendingSurveyIds.clear()
      }, 750)
    }

    const handleConsultationNote = (payload: ConsultationNoteRealtimePayload) => {
      if (!payload.noteId || !payload.consultationId) return

      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.consultations.detail(payload.consultationId),
      })

      const authorName = payload.authorName?.trim() || 'Tim'
      const consultationName = payload.consultationName?.trim() || 'Konsumen'
      const noteBody = payload.body?.trim() || 'Ada catatan aktivitas baru.'

      toast.info(`Catatan baru dari ${authorName}`, {
        description: `${consultationName}: ${noteBody}`,
        duration: 8000,
        action: {
          label: 'Buka',
          onClick: () => router.push(`/consultations/${payload.consultationId}`),
        },
      })
    }

    const handleConsultationNotesChanged = (payload: ConsultationNotesChangedPayload) => {
      if (!payload.consultationId) return

      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.consultations.detail(payload.consultationId),
      })
    }

    const connect = async () => {
      const [{ default: Echo }, { default: Pusher }] = await Promise.all([
        import('laravel-echo'),
        import('pusher-js'),
      ])
      if (disposed) return

      window.Pusher = Pusher
      const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080)
      const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http'
      echo = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: realtimeHost(),
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${api.baseUrl}/broadcasting/auth`,
        withCredentials: true,
        auth: {
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(getXsrfToken() ? { 'X-XSRF-TOKEN': getXsrfToken() as string } : {}),
          },
        },
        authorizer: (channel: { name: string }) => ({
          authorize: (
            socketId: string,
            callback: (error: Error | null, data: any) => void
          ) => {
            void (async () => {
              try {
                const xsrfToken = getXsrfToken()
                const response = await fetch(`${api.baseUrl}/broadcasting/auth`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
                  },
                  body: new URLSearchParams({
                    socket_id: socketId,
                    channel_name: channel.name,
                  }),
                })
                const data = await response.json()
                if (!response.ok) {
                  callback(new Error(data?.message || 'Realtime authorization failed'), null)
                  return
                }
                callback(null, data)
              } catch (error) {
                callback(error instanceof Error ? error : new Error('Realtime authorization failed'), null)
              }
            })()
          },
        }),
      })
      surveyChannels.forEach((channelName) => {
        echo?.private(channelName).listen('.survey.updated', scheduleRefresh)
      })
      if (noteChannel) {
        echo
          ?.private(noteChannel)
          .listen('.consultation-note.created', handleConsultationNote)
          .listen('.consultation-notes.changed', handleConsultationNotesChanged)
      }
    }

    void connect()

    return () => {
      disposed = true
      if (refreshTimer) clearTimeout(refreshTimer)
      surveyChannels.forEach((channelName) => echo?.leave(channelName))
      if (noteChannel) echo?.leave(noteChannel)
      echo?.disconnect()
    }
  }, [isAuthenticated, queryClient, router, user])

  return null
}
