import type { AuthUser, UserRole } from '@/types'

/**
 * Role helpers â€” satu-satunya sumber logika role di frontend.
 * Menggantikan pengecekan biner `user?.role === 'super_admin'` yang tersebar.
 */

export const isSuperAdmin = (u?: AuthUser | null) => u?.role === 'super_admin'
export const isAdmin = (u?: AuthUser | null) => u?.role === 'admin'
export const isManagerSurveyor = (u?: AuthUser | null) => u?.role === 'manager_surveyor'
export const isSurveyor = (u?: AuthUser | null) => u?.role === 'surveyor'
export const isSurveyTeam = (u?: AuthUser | null) => isManagerSurveyor(u) || isSurveyor(u)

/** Label ramah untuk role (dipakai di header & profil). */
export function roleLabel(u?: AuthUser | null): string {
  switch (u?.role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    case 'manager_surveyor':
      return 'Manager Surveyor'
    case 'surveyor':
      return 'Surveyor'
    default:
      return '-'
  }
}

/**
 * Apakah user boleh melihat/akses sesuatu yang dibatasi ke `roles`.
 * - super_admin selalu boleh (bypass).
 * - roles kosong/undefined = boleh untuk semua user terautentikasi.
 */
export function canAccess(u: AuthUser | null | undefined, roles?: UserRole[]): boolean {
  if (!u) return false
  if (u.role === 'super_admin') return true
  if (!roles || roles.length === 0) return true
  return roles.includes(u.role)
}

/**
 * Peta akses route â†’ daftar role yang diizinkan (super_admin implisit).
 * Prefix yang tidak terdaftar = boleh untuk semua user terautentikasi.
 */
export const ROUTE_ROLES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/dashboard', roles: ['admin'] },
  { prefix: '/accounts', roles: ['super_admin'] },
  { prefix: '/master-data', roles: ['super_admin'] },
  { prefix: '/audit-logs', roles: ['super_admin'] },
  { prefix: '/debug', roles: ['super_admin'] },
  // Prefix tersendiri, bukan di bawah /surveys: canAccessPath memakai
  // startsWith dengan first-match-wins, jadi '/surveys/rekap' akan mewarisi
  // role /surveys dan meloloskan surveyor biasa.
  { prefix: '/rekap-jadwal-surveyor', roles: ['manager_surveyor'] },
  { prefix: '/survey-consumers', roles: ['admin', 'manager_surveyor', 'surveyor'] },
  { prefix: '/surveys', roles: ['admin', 'manager_surveyor', 'surveyor'] },
  { prefix: '/consultations', roles: ['admin'] },
  { prefix: '/analytics', roles: ['admin'] },
  { prefix: '/geo-analytics', roles: ['super_admin'] },
  { prefix: '/report-attendances', roles: ['admin'] },
]

/** Cek apakah user boleh mengakses sebuah pathname berdasarkan ROUTE_ROLES. */
export function canAccessPath(u: AuthUser | null | undefined, pathname: string): boolean {
  const match = ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix))
  return canAccess(u, match?.roles)
}
