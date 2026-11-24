import { describe, expect, it } from 'vitest'

import {
  ROLE_PRIORITY,
  extractRolesFromToken,
  getDefaultHomeForRoles,
  getDepartmentDomain,
  getRoleForWorkspace,
  getWorkspaceForRole,
  hasAccessToRoute,
  toRoleCode,
} from './roles'

function tokenWithRoles(roles: string[]): string {
  return `header.${btoa(JSON.stringify({ roles }))}.signature`
}

describe('role theo backend seed', () => {
  it('từ chối token đăng nhập mẫu từ bản cũ', () => {
    const token = `header.${btoa(JSON.stringify({ roles: ['ADMIN'] }))}.demo_signature`
    expect(extractRolesFromToken(token)).toEqual([])
  })

  it('nhận đúng chín role và không coi role cũ là VIEWER', () => {
    expect(ROLE_PRIORITY).toHaveLength(9)
    expect(extractRolesFromToken(tokenWithRoles(['HR_STAFF', 'ANALYST']))).toEqual(['HR_STAFF'])
    expect(toRoleCode('MANAGER')).toBeNull()
    expect(toRoleCode('ANALYST')).toBeNull()
    expect(getDefaultHomeForRoles([])).toBe('/login')
  })

  it.each([
    ['ADMISSIONS_MANAGER', 'MANAGER', 'admissions', '/manager'],
    ['ACADEMIC_MANAGER', 'MANAGER', 'academic', '/manager'],
    ['HR_MANAGER', 'MANAGER', 'hr', '/manager'],
    ['ADMISSIONS_STAFF', 'STAFF', 'admissions', '/staff'],
    ['ACADEMIC_STAFF', 'STAFF', 'academic', '/staff'],
    ['HR_STAFF', 'STAFF', 'hr', '/staff'],
  ] as const)('định tuyến %s vào đúng không gian và phân hệ', (role, workspace, domain, home) => {
    expect(getWorkspaceForRole(role)).toBe(workspace)
    expect(getDepartmentDomain(role)).toBe(domain)
    expect(getRoleForWorkspace([role], workspace)).toBe(role)
    expect(getDefaultHomeForRoles([role])).toBe(home)
    expect(hasAccessToRoute(home, [role])).toBe(true)
    expect(hasAccessToRoute(home === '/manager' ? '/staff' : '/manager', [role])).toBe(false)
  })

  it('chỉ mở workspace theo các vai trò được gán', () => {
    expect(hasAccessToRoute('/admin', ['ADMIN'])).toBe(true)
    expect(hasAccessToRoute('/data/cleaning', ['ADMIN'])).toBe(false)
    expect(hasAccessToRoute('/manager', ['ADMIN'])).toBe(false)
    expect(hasAccessToRoute('/staff', ['ADMIN'])).toBe(false)
    expect(hasAccessToRoute('/viewer', ['ADMIN'])).toBe(false)
    expect(hasAccessToRoute('/admin', ['DATA_ADMIN'])).toBe(false)
    expect(hasAccessToRoute('/data/cleaning', ['ADMIN', 'DATA_ADMIN'])).toBe(true)
    expect(getRoleForWorkspace(['ADMIN'], 'DATA_ADMIN')).toBeNull()
    expect(getRoleForWorkspace(['ADMIN', 'DATA_ADMIN'], 'DATA_ADMIN')).toBe('DATA_ADMIN')
  })

  it('không cho role phòng ban vào trang quản trị hoặc Ban Giám hiệu', () => {
    expect(hasAccessToRoute('/admin', ['HR_STAFF'])).toBe(false)
    expect(hasAccessToRoute('/data', ['HR_MANAGER'])).toBe(false)
    expect(hasAccessToRoute('/viewer', ['ADMISSIONS_MANAGER'])).toBe(false)
  })
})
