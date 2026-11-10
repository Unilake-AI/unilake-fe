import type { ReactNode } from 'react'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { extractRolesFromToken, getRoleForWorkspace } from '@/config/roles'

import { AppShell } from './app-shell'

/** Xác định role phòng ban thực tế cho hai nhóm trang dùng chung. */
export async function DepartmentLayout({
  workspace,
  children,
}: {
  workspace: 'MANAGER' | 'STAFF'
  children: ReactNode
}) {
  const token = (await cookies()).get('access_token')?.value
  const roles = token ? extractRolesFromToken(token) : []
  const role = getRoleForWorkspace(roles, workspace)
  if (!role) redirect('/login')

  return <AppShell role={role}>{children}</AppShell>
}
