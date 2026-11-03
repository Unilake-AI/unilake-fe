import type { DomainCode } from '@/config/domains'
import type { RoleCode, RoleDefinition, RoleWorkspace } from '@/types/auth'

/** Mã role do backend seed và trả trong JWT. */
export const ROLE_CODES: Record<RoleCode, RoleCode> = {
  ADMIN: 'ADMIN',
  DATA_ADMIN: 'DATA_ADMIN',
  VIEWER: 'VIEWER',
  ADMISSIONS_MANAGER: 'ADMISSIONS_MANAGER',
  ADMISSIONS_STAFF: 'ADMISSIONS_STAFF',
  ACADEMIC_MANAGER: 'ACADEMIC_MANAGER',
  ACADEMIC_STAFF: 'ACADEMIC_STAFF',
  HR_MANAGER: 'HR_MANAGER',
  HR_STAFF: 'HR_STAFF',
}

export const ROLE_DEFINITIONS: Record<RoleCode, RoleDefinition> = {
  ADMIN: {
    code: 'ADMIN',
    name: 'Quản trị Hệ thống',
    homePath: '/admin',
    description: 'Toàn quyền cấu hình, phân quyền và quản trị hệ thống',
    badgeVariant: 'destructive',
  },
  DATA_ADMIN: {
    code: 'DATA_ADMIN',
    name: 'Quản trị Dữ liệu',
    homePath: '/data',
    description: 'Quản lý nguồn dữ liệu, ingestion, catalog, chất lượng và lineage',
    badgeVariant: 'default',
  },
  VIEWER: {
    code: 'VIEWER',
    name: 'Ban Giám hiệu',
    homePath: '/viewer',
    description: 'Xem tổng quan điều hành và dashboard',
    badgeVariant: 'outline',
  },
  ADMISSIONS_MANAGER: {
    code: 'ADMISSIONS_MANAGER',
    name: 'Trưởng phòng Tuyển sinh',
    homePath: '/manager',
    description: 'Theo dõi và phân tích dữ liệu Tuyển sinh',
    badgeVariant: 'secondary',
  },
  ADMISSIONS_STAFF: {
    code: 'ADMISSIONS_STAFF',
    name: 'Nhân viên Tuyển sinh',
    homePath: '/analyst',
    description: 'Khai thác dữ liệu Tuyển sinh',
    badgeVariant: 'default',
  },
  ACADEMIC_MANAGER: {
    code: 'ACADEMIC_MANAGER',
    name: 'Trưởng phòng Đào tạo',
    homePath: '/manager',
    description: 'Theo dõi và phân tích dữ liệu Đào tạo',
    badgeVariant: 'secondary',
  },
  ACADEMIC_STAFF: {
    code: 'ACADEMIC_STAFF',
    name: 'Nhân viên Đào tạo',
    homePath: '/analyst',
    description: 'Khai thác dữ liệu Đào tạo',
    badgeVariant: 'default',
  },
  HR_MANAGER: {
    code: 'HR_MANAGER',
    name: 'Trưởng phòng Nhân sự',
    homePath: '/manager',
    description: 'Theo dõi và phân tích dữ liệu Nhân sự',
    badgeVariant: 'secondary',
  },
  HR_STAFF: {
    code: 'HR_STAFF',
    name: 'Nhân viên Nhân sự',
    homePath: '/analyst',
    description: 'Khai thác dữ liệu Nhân sự',
    badgeVariant: 'default',
  },
}

export const ROLE_PRIORITY: RoleCode[] = [
  'ADMIN',
  'DATA_ADMIN',
  'VIEWER',
  'ADMISSIONS_MANAGER',
  'ADMISSIONS_STAFF',
  'ACADEMIC_MANAGER',
  'ACADEMIC_STAFF',
  'HR_MANAGER',
  'HR_STAFF',
]

const ROLE_SET = new Set<RoleCode>(ROLE_PRIORITY)

export const ROLE_ROUTE_PREFIXES: Record<RoleCode, string> = Object.fromEntries(
  ROLE_PRIORITY.map((role) => [role, ROLE_DEFINITIONS[role].homePath])
) as Record<RoleCode, string>

const DEPARTMENT_DOMAINS: Partial<Record<RoleCode, Exclude<DomainCode, 'all'>>> = {
  ADMISSIONS_MANAGER: 'admissions',
  ADMISSIONS_STAFF: 'admissions',
  ACADEMIC_MANAGER: 'academic',
  ACADEMIC_STAFF: 'academic',
  HR_MANAGER: 'hr',
  HR_STAFF: 'hr',
}

export function toRoleCode(value: unknown): RoleCode | null {
  if (typeof value !== 'string') return null
  const code = value.toUpperCase() as RoleCode
  return ROLE_SET.has(code) ? code : null
}

/** Đọc claim role để điều hướng giao diện; backend vẫn là nơi xác minh JWT và phân quyền API. */
export function extractRolesFromToken(token: string): RoleCode[] {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return []
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>
    const raw = Array.isArray(payload.roles) ? payload.roles : payload.role ? [payload.role] : []
    return raw.map(toRoleCode).filter((role): role is RoleCode => role !== null)
  } catch {
    return []
  }
}

export function getWorkspaceForRole(role: RoleCode): RoleWorkspace {
  if (role.endsWith('_MANAGER')) return 'MANAGER'
  if (role.endsWith('_STAFF')) return 'STAFF'
  return role as RoleWorkspace
}

export function getDepartmentDomain(role: RoleCode): Exclude<DomainCode, 'all'> | null {
  return DEPARTMENT_DOMAINS[role] ?? null
}

export function getDefaultHomeForRoles(roles: RoleCode[]): string {
  const role = ROLE_PRIORITY.find((item) => roles.includes(item))
  return role ? ROLE_DEFINITIONS[role].homePath : '/login'
}

export function getWorkspaceFromPrefix(pathname: string): RoleWorkspace | null {
  if (pathname === '/data' || pathname.startsWith('/data/')) return 'DATA_ADMIN'
  if (pathname === '/analyst' || pathname.startsWith('/analyst/')) return 'STAFF'
  if (pathname === '/manager' || pathname.startsWith('/manager/')) return 'MANAGER'
  if (pathname === '/viewer' || pathname.startsWith('/viewer/')) return 'VIEWER'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'ADMIN'
  return null
}

export function getRoleForWorkspace(roles: RoleCode[], workspace: RoleWorkspace): RoleCode | null {
  return (
    ROLE_PRIORITY.find((role) => roles.includes(role) && getWorkspaceForRole(role) === workspace) ??
    (roles.includes('ADMIN') ? 'ADMIN' : null)
  )
}

export function hasAccessToRoute(pathname: string, userRoles: RoleCode[]): boolean {
  if (userRoles.includes('ADMIN')) return true
  const workspace = getWorkspaceFromPrefix(pathname)
  if (!workspace) return true
  return userRoles.some((role) => getWorkspaceForRole(role) === workspace)
}
