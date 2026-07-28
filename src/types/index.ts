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

export const ACCOUNT_GROUP_LABELS = {
  PC: 'PC',
  NPP1: 'NPP 1',
  NPP2: 'NPP 2',
} as const
export type AccountGroup = keyof typeof ACCOUNT_GROUP_LABELS

export type SurveyorRecapDay = {
  date: string
  dayName: string
  dateLabel: string
  isFirstDay: boolean
  isLastDay: boolean
  surveyorNames: string[]
  count: number
}

export type SurveyorRecapSummary = {
  surveyorId: number
  surveyorName: string
  count: number
}

export type SurveyorRecapFilters = {
  week_date?: string
  account_group?: AccountGroup
  account?: number
  surveyor?: number
}

export type SurveyorRecapReport = {
  period: { type: string; start: string; end: string; label: string; anchorDate: string }
  subtitle: string
  accountGroup: AccountGroup | null
  rowCount: number
  days: SurveyorRecapDay[]
  summary: SurveyorRecapSummary[]
  total: number
  generatedAt: string
}

export type SurveyState = 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export type SurveyFilters = {
  page?: number
  per_page?: number
  state?: SurveyState | ''
  search?: string
  account?: number
  surveyor_id?: number
  start_date?: string
  end_date?: string
  sort?: 'nearest' | 'latest'
}

export type SurveyorItem = { id: number; name: string }
export type SurveyorAvailability = SurveyorItem & {
  email: string
  schedule_count: number
  schedules: string[]
}
export type SurveyActivity = {
  id: number
  action: string
  old_status?: SurveyState | null
  new_status?: SurveyState | null
  notes?: string | null
  created_at: string
  user?: { id: number; name: string; role?: UserRole } | null
}
export type SurveyStatusItem = {
  id: number
  name: string
  color?: string
  css_class?: string
  sort_order?: number
}

export type Survey = {
  id: number
  state: SurveyState
  requested_at?: string | null
  requested_date?: string | null
  requested_time?: string | null
  surveyor_id?: number | null
  assigned_by?: number | null
  assigned_at?: string | null
  scheduled_at?: string | null
  actual_start_at?: string | null
  actual_finish_at?: string | null
  location_notes?: string | null
  google_maps_url?: string | null
  requested_item?: string | null
  admin_notes?: string | null
  result_notes?: string | null
  recommendations?: string | null
  consultation?: Consultation | null
  surveyor?: SurveyorItem | null
  assigner?: SurveyorItem | null
  requester?: SurveyorItem | null
  result_status?: SurveyStatusItem | null
  activity_logs?: SurveyActivity[]
}

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
  emergency_phone: string | null
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
  account: { id: number; name: string; admins?: { id: number; name: string }[] } | null
  status_category: { id: number; name: string; css_class: string } | null
  needs_category: { id: number; name: string } | null
  needs_categories?: { id: number; name: string }[]
  /** Survey yang sedang berjalan; null bila lead belum pernah diajukan. */
  active_survey?: Survey | null
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
  /** Hanya lead tahap Request Survey yang belum diajukan ke manager. */
  pending_survey?: 1
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
  total_request_surveys?: number
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
  unread_surveys?: number
  /** Lead sudah berstatus Request Survey tapi belum diajukan ke manager. */
  pending_survey_requests?: number
  total: number
  timestamp: string
}

export type NotificationSummary = NotificationCount & {
  notes: NoteNotification[]
  reminders: ReminderNotification[]
  surveys?: SurveyNotification[]
}

export type SurveyNotification = {
  id: number
  type: string
  title: string
  message: string
  is_read: boolean
  created_human?: string
  survey_id?: number | null
  survey_url?: string | null
  state?: SurveyState | null
  client_name?: string | null
  consultation_code?: string | null
  location?: string | null
  schedule_label?: string | null
  surveyor_name?: string | null
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
