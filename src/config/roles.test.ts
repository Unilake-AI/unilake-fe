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
    ['ADMISSIONS_STAFF', 'STAFF', 'admissions', '/analyst'],
    ['ACADEMIC_STAFF', 'STAFF', 'academic', '/analyst'],
    ['HR_STAFF', 'STAFF', 'hr', '/analyst'],
  ] as const)('định tuyến %s vào đúng không gian và phân hệ', (role, workspace, domain, home) => {
    expect(getWorkspaceForRole(role)).toBe(workspace)
    expect(getDepartmentDomain(role)).toBe(domain)
    expect(getRoleForWorkspace([role], workspace)).toBe(role)
    expect(getDefaultHomeForRoles([role])).toBe(home)
    expect(hasAccessToRoute(home, [role])).toBe(true)
    expect(hasAccessToRoute(home === '/manager' ? '/analyst' : '/manager', [role])).toBe(false)
  })

  it('không cho role phòng ban vào trang quản trị hoặc Ban Giám hiệu', () => {
    expect(hasAccessToRoute('/admin', ['HR_STAFF'])).toBe(false)
    expect(hasAccessToRoute('/data', ['HR_MANAGER'])).toBe(false)
    expect(hasAccessToRoute('/viewer', ['ADMISSIONS_MANAGER'])).toBe(false)
  })
})
