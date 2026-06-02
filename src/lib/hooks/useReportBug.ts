'use client'

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type BugReportResponse = {
  message: string
  ticket_code: string
}

/**
 * Submit a bug report (publicly available, e.g. from the login screen).
 * Sends multipart/form-data so optional screenshots can be attached.
 */
export function useReportBug() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.postForm<BugReportResponse>('/bug-reports', formData),
  })
}
