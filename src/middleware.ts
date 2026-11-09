import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { extractRolesFromToken, getDefaultHomeForRoles, hasAccessToRoute } from '@/config/roles'

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
  if (userRoles.length === 0) {
    if (pathname === '/login') return NextResponse.next()
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('access_token')
    return response
  }
  const defaultHome = getDefaultHomeForRoles(userRoles)

  // Nếu truy cập /login hoặc đường dẫn gốc /, chuyển đến trang chủ theo vai trò người dùng
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(defaultHome, request.url))
  }

  // Kiểm tra quyền truy cập các tuyến theo tiền tố vai trò
  if (
    (pathname === '/viewer/ask' ||
      pathname.startsWith('/viewer/ask/') ||
      pathname === '/viewer/history' ||
      pathname.startsWith('/viewer/history/')) &&
    !userRoles.includes('ADMIN')
  ) {
    return NextResponse.redirect(new URL('/viewer', request.url))
  }
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
