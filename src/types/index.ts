// ── API Response Types ───────────────────────────────────────
export type ApiResponse<T> = {
  data: T
  message?: string
}

export type ApiError = {
  message: string
  errors?: Record<string, string[]>
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// ── Auth ─────────────────────────────────────────────────────
export const UserRole = {
  Admin: 'admin',
  SuperAdmin: 'super_admin',
  Surveyor: 'surveyor',
  ManagerSurveyor: 'manager_surveyor',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export type AuthUser = {
  id: number
  name: string
  email: string
  role: UserRole
  account_id: number | null
  account: { id: number; name: string; logo: string | null } | null
  primary_color: string | null
  last_login_at: string | null
}

// ── Consultation ─────────────────────────────────────────────
export type Consultation = {
  id: number
  consultation_id: string
  client_name: string
  phone: string | null
  province: string | null
  city: string | null
  district: string | null
  address: string | null
  product_details: string | null
  notes: string | null
  consultation_date: string | null
  created_at: string
  updated_at: string
  account_id?: number
  status_category_id?: number
  account: { id: number; name: string } | null
  status_category: { id: number; name: string; css_class: string } | null
  needs_category: { id: number; name: string } | null
  needs_categories?: { id: number; name: string }[]
  creator: { id: number; name: string } | null
  timeline_notes?: { id: number; body: string; created_at: string; user?: { id: number; name: string } }[]
  reminders?: { id: number; message: string; remind_at: string; is_read: boolean; user?: { id: number; name: string } }[]
}

export type ConsultationFilters = {
  search?: string
  status?: string
  account?: string | number
  start_date?: string
  end_date?: string
  month?: string | number
  year?: string | number
  sort?: string
  dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

// ── Dashboard ────────────────────────────────────────────────
export type DashboardStats = {
  total_leads: number
  pending_leads: number
  completed_this_month: number
  cancelled_leads: number
  conversion_rate?: number
  pending_surveys?: number
  total_accounts?: number
  active_accounts?: number
  avg_conversion?: number
  growth_percent?: number
}

export type DashboardData = {
  stats: DashboardStats
  recent_consultations: Consultation[]
  upcoming: Consultation[]
  status_distribution: DistributionItem[]
  needs_distribution: DistributionItem[]
  accounts?: AccountRanking[]
  admin_attendances?: AdminAttendance[]
  top_admin?: { id: number; name: string; deal_count: number } | null
  account?: { id: number; name: string } | null
}

export type DistributionItem = {
  id: number
  name: string
  count: number
  css_class?: string | null
}

export type AccountRanking = {
  id: number
  name: string
  total_leads: number
  deals: number
  conversion_rate: number
  admins: { id: number; name: string }[]
}

export type AdminAttendance = {
  id: number
  name: string
  account_name: string | null
  has_reported: boolean
  reported_at: string | null
  report_category: string | null
}

// ── Master Data ──────────────────────────────────────────────
export type NeedsCategory = { id: number; name: string }
export type StatusCategory = {
  id: number
  name: string
  css_class: string | null
  color: string | null
  sort_order: number
}

// ── Notifications ────────────────────────────────────────────
export type NotificationCount = {
  unread_notes: number
  upcoming_reminders: number
  total: number
  timestamp: string
}

export type NotificationSummary = NotificationCount & {
  notes: NoteNotification[]
  reminders: ReminderNotification[]
}

export type NoteNotification = {
  id: number
  author_name: string
  author_initial: string
  body: string
  consultation_name: string
  consultation_url: string | null
  created_human: string
}

export type ReminderNotification = {
  id: number
  message: string
  consultation_name: string
  consultation_url: string
  owner_name: string | null
  overdue: boolean
  remind_human: string
  remind_label: string
}
