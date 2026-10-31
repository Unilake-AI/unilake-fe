import type { RoleCode, RoleDefinition } from '@/types/auth'

export const ROLE_CODES: Record<RoleCode, RoleCode> = {
  ADMIN: 'ADMIN',
  DATA_ADMIN: 'DATA_ADMIN',
  ANALYST: 'ANALYST',
  MANAGER: 'MANAGER',
  VIEWER: 'VIEWER',
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
  ANALYST: {
    code: 'ANALYST',
    name: 'Chuyên viên Phân tích',
    homePath: '/analyst',
    description: 'Truy vấn NLQ AI, báo cáo phân tích và trực quan hóa dữ liệu',
    badgeVariant: 'default',
  },
  MANAGER: {
    code: 'MANAGER',
    name: 'Trưởng đơn vị',
    homePath: '/manager',
    description: 'Theo dõi dashboard và phân tích phân hệ được giao',
    badgeVariant: 'secondary',
  },
  VIEWER: {
    code: 'VIEWER',
    name: 'Ban Giám hiệu',
    homePath: '/viewer',
    description: 'Xem tổng quan điều hành và dashboard ba phân hệ',
    badgeVariant: 'outline',
  },
}

/** Thứ tự ưu tiên để xác định trang chủ mặc định cho người dùng có nhiều vai trò */
export const ROLE_PRIORITY: RoleCode[] = ['ADMIN', 'DATA_ADMIN', 'ANALYST', 'MANAGER', 'VIEWER']

export const ROLE_ROUTE_PREFIXES: Record<RoleCode, string> = {
  ADMIN: '/admin',
  DATA_ADMIN: '/data',
  ANALYST: '/analyst',
  MANAGER: '/manager',
  VIEWER: '/viewer',
}

export function getDefaultHomeForRoles(roles: RoleCode[]): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return ROLE_DEFINITIONS[role].homePath
    }
  }
  return '/viewer'
}

export function getRoleFromPrefix(pathname: string): RoleCode | null {
  if (
    pathname === '/data' ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/engineering') ||
    pathname.startsWith('/governance')
  ) {
    return 'DATA_ADMIN'
  }
  if (
    pathname === '/analyst' ||
    pathname.startsWith('/analyst/') ||
    pathname.startsWith('/analytics')
  ) {
    return 'ANALYST'
  }
  if (
    pathname === '/manager' ||
    pathname.startsWith('/manager/') ||
    pathname.startsWith('/academic')
  ) {
    return 'MANAGER'
  }
  if (pathname === '/viewer' || pathname.startsWith('/viewer/') || pathname.startsWith('/home')) {
    return 'VIEWER'
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'ADMIN'
  }
  return null
}

export function hasAccessToRoute(pathname: string, userRoles: RoleCode[]): boolean {
  if (userRoles.includes('ADMIN')) {
    return true
  }
  const requiredRole = getRoleFromPrefix(pathname)
  if (!requiredRole) {
    return true
  }
  return userRoles.includes(requiredRole)
}
