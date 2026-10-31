import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { AuthUser, RoleCode } from '@/types/auth'

const VALID_ROLE_CODES: RoleCode[] = ['ADMIN', 'DATA_ADMIN', 'ANALYST', 'MANAGER', 'VIEWER']

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = Buffer.from(base64, 'base64').toString('utf-8')
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
  }

  const payload = parseJwtPayload(token)
  if (!payload) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
  }

  const rawRoles = (payload.roles as unknown[]) ?? (payload.role ? [payload.role] : [])
  const roles: RoleCode[] = Array.isArray(rawRoles)
    ? rawRoles
        .map((r) => String(r).toUpperCase())
        .filter((r): r is RoleCode => VALID_ROLE_CODES.includes(r as RoleCode))
    : []

  if (roles.length === 0) {
    roles.push('VIEWER')
  }

  const sub = typeof payload.sub === 'string' ? payload.sub : undefined
  const username = typeof payload.username === 'string' ? payload.username : undefined

  // Backend đặt `sub` là mã số người dùng, tên đăng nhập nằm ở claim `username`.
  const user: AuthUser = {
    id: sub,
    username: username ?? sub ?? 'user',
    email: typeof payload.email === 'string' ? payload.email : undefined,
    fullName: typeof payload.full_name === 'string' ? payload.full_name : undefined,
    roles,
  }

  return NextResponse.json({ authenticated: true, user })
}
