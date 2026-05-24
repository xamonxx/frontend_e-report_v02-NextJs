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
    queryFn: () => api.get<OnlineUsersResponse>('/online-users'),
    refetchInterval: 30_000,
    staleTime: 25_000,
  })
}
