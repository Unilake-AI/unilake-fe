import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getDefaultHomeForRoles, hasAccessToRoute } from '@/config/roles'
import type { RoleCode } from '@/types/auth'

const VALID_ROLES: RoleCode[] = ['ADMIN', 'DATA_ADMIN', 'ANALYST', 'MANAGER', 'VIEWER']

function extractRolesFromToken(token: string): RoleCode[] {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return ['VIEWER']

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonStr =
      typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8')

    const payload = JSON.parse(jsonStr) as Record<string, unknown>
    const rawRoles = (payload.roles as unknown[]) ?? (payload.role ? [payload.role] : [])

    const roles: RoleCode[] = Array.isArray(rawRoles)
      ? rawRoles
          .map((r) => String(r).toUpperCase())
          .filter((r): r is RoleCode => VALID_ROLES.includes(r as RoleCode))
      : []

    return roles.length > 0 ? roles : ['VIEWER']
  } catch {
    return ['VIEWER']
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value

  // Không chặn hoặc chuyển hướng tài nguyên nội bộ Next.js hay tuyến API
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // 1. Người dùng chưa xác thực
  if (!token) {
    if (pathname === '/login') {
      return NextResponse.next()
    }
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Người dùng đã xác thực: lấy vai trò
  const userRoles = extractRolesFromToken(token)
  const defaultHome = getDefaultHomeForRoles(userRoles)

  // Nếu truy cập /login hoặc đường dẫn gốc /, chuyển đến trang chủ theo vai trò người dùng
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(defaultHome, request.url))
  }

  // Kiểm tra quyền truy cập các tuyến theo tiền tố vai trò
  if (!hasAccessToRoute(pathname, userRoles)) {
    return NextResponse.redirect(new URL(defaultHome, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Khớp mọi đường dẫn yêu cầu trừ các đường dẫn bắt đầu bằng:
     * - _next/static (tệp tĩnh)
     * - _next/image (tệp tối ưu hình ảnh)
     * - favicon.ico (tệp biểu tượng trang)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
