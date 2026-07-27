'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { queryKeys } from '@/lib/api/queryKeys'

export type OnlineUser = {
  id: number
  name: string
  role: string
  role_label: string
  last_seen_at: string
}

export type OnlineUsersResponse = {
  data: OnlineUser[]
  count: number
}

export function useOnlineUsers() {
  return useQuery({
    queryKey: queryKeys.onlineUsers.all,
    queryFn: ({ signal }) => api.get<OnlineUsersResponse>('/online-users', undefined, signal),
    // Shared hosting MySQL: longgar dari 30s -> 2m supaya tidak menjebol
    // limit max_connections_per_hour (500/jam) yang menyebabkan 500 error.
    refetchInterval: 120_000,
    staleTime: 90_000,
  })
}
