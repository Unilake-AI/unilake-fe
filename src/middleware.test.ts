import { NextRequest } from 'next/server'

import { describe, expect, it } from 'vitest'

import { middleware } from './middleware'

function request(path: string, roles: string[]): NextRequest {
  const payload = btoa(JSON.stringify({ roles }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { cookie: `access_token=header.${payload}.signature` },
  })
}

describe('middleware phân quyền theo 9 role backend', () => {
  it.each([
    ['ADMISSIONS_MANAGER', '/manager'],
    ['ACADEMIC_MANAGER', '/manager'],
    ['HR_MANAGER', '/manager'],
    ['ADMISSIONS_STAFF', '/analyst'],
    ['ACADEMIC_STAFF', '/analyst'],
    ['HR_STAFF', '/analyst'],
  ])('đưa %s vào trang chủ đúng và chặn không gian khác', (role, home) => {
    expect(middleware(request('/', [role])).headers.get('location')).toBe(
      `http://localhost:3000${home}`
    )
    expect(middleware(request(home, [role])).status).toBe(200)
    expect(middleware(request('/data', [role])).headers.get('location')).toBe(
      `http://localhost:3000${home}`
    )
  })

  it('không chấp nhận role cũ và không cho VIEWER mở Hỏi AI', () => {
    expect(middleware(request('/manager', ['MANAGER'])).headers.get('location')).toBe(
      'http://localhost:3000/login'
    )
    expect(middleware(request('/viewer/ask', ['VIEWER'])).headers.get('location')).toBe(
      'http://localhost:3000/viewer'
    )
  })
})
