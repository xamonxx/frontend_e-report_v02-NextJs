/**
 * Centralized TanStack Query key registry.
 * Every query key is defined here — prevents key collisions and enables targeted invalidation.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    data: () => [...queryKeys.dashboard.all, 'data'] as const,
  },
  consultations: {
    all: ['consultations'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.consultations.all, 'list', filters] as const,
    detail: (id: number) =>
      [...queryKeys.consultations.all, 'detail', id] as const,
    previewId: (accountId?: number) =>
      [...queryKeys.consultations.all, 'preview-id', accountId] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: (filters: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'summary', filters] as const,
  },
  surveys: {
    all: ['surveys'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.surveys.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.surveys.all, 'detail', id] as const,
    recap: (filters: Record<string, unknown>) =>
      [...queryKeys.surveys.all, 'recap', filters] as const,
  },
  bugReports: {
    all: ['bug-reports'] as const,
    detail: (id: number) => [...queryKeys.bugReports.all, 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    count: () => [...queryKeys.notifications.all, 'count'] as const,
    summary: () => [...queryKeys.notifications.all, 'summary'] as const,
  },
  masterData: {
    needsCategories: ['master-data', 'needs-categories'] as const,
    statusCategories: ['master-data', 'status-categories'] as const,
    surveyors: ['master-data', 'surveyors'] as const,
    surveyStatuses: ['master-data', 'survey-statuses'] as const,
  },
  wilayah: {
    provinces: ['wilayah', 'provinces'] as const,
    cities: (province?: string) =>
      ['wilayah', 'cities', province] as const,
    districts: (city?: string) =>
      ['wilayah', 'districts', city] as const,
  },
  accounts: {
    all: ['accounts'] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
  },
  onlineUsers: {
    all: ['online-users'] as const,
  },
  debug: {
    all: ['debug'] as const,
    stats: () => [...queryKeys.debug.all, 'stats'] as const,
  },
} as const
