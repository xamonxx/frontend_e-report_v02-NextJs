'use client'

import { useEffect } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useQueryClient } from '@tanstack/react-query'
import { api, getAuthToken } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'
import { isManagerSurveyor, isSuperAdmin, isSurveyor } from '@/lib/auth/roles'
import { useAuthStore } from '@/lib/stores/authStore'

type SurveyRealtimePayload = {
  surveyId?: number
  action?: string
  message?: string
}

declare global {
  interface Window {
    Pusher?: typeof Pusher
  }
}

function realtimeHost(): string {
  const configured = process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost'
  if (typeof window === 'undefined') return configured
  return configured === 'localhost' || configured === '127.0.0.1'
    ? window.location.hostname
    : configured
}

function refreshSurveyQueries(queryClient: ReturnType<typeof useQueryClient>, payload?: SurveyRealtimePayload) {
  queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })

  if (payload?.surveyId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.surveys.detail(payload.surveyId) })
  }
}

export function SurveyRealtimeListener() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const token = getAuthToken()
    const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY
    if (!token || !key) return

    window.Pusher = Pusher

    const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080)
    const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http'
    const echo = new Echo({
      broadcaster: 'reverb',
      key,
      wsHost: realtimeHost(),
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${api.baseUrl}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    })

    const channels: string[] = []
    if (isManagerSurveyor(user) || isSuperAdmin(user)) {
      channels.push('survey.managers')
    }
    if (isSurveyor(user)) {
      channels.push(`survey.surveyor.${user.id}`)
    }

    channels.forEach((channelName) => {
      echo.private(channelName).listen('.survey.updated', (payload: SurveyRealtimePayload) => {
        refreshSurveyQueries(queryClient, payload)
      })
    })

    return () => {
      channels.forEach((channelName) => echo.leave(`private-${channelName}`))
      echo.disconnect()
    }
  }, [isAuthenticated, queryClient, user])

  return null
}
