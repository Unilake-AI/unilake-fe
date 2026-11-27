'use client'

import Link from 'next/link'

import { CircleUser, Shield } from 'lucide-react'

import { Card, ErrorState, LoadingState, PageHeader } from '@/components/page/page-parts'
import {
  ROLE_DEFINITIONS,
  ROLE_PRIORITY,
  ROLE_ROUTE_PREFIXES,
  getWorkspaceForRole,
} from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import type { RoleCode } from '@/types/roles'
import { SessionsPanel } from '@/views/admin/sessions-panel'
import { StaffProfileView } from '@/views/staff/staff-profile-view'

export function ProfileView({ role, roles }: { role: RoleCode; roles: RoleCode[] }) {
  const switchableRoles = ROLE_PRIORITY.filter((item) => roles.includes(item))
  return (
    <div className="space-y-5">
      {getWorkspaceForRole(role) === 'STAFF' ? (
        <StaffProfileView />
      ) : (
        <AccountProfile role={role} />
      )}
      {switchableRoles.length > 1 && (
        <Card title="Chuyển không gian làm việc">
          <ul className="space-y-1">
            {switchableRoles.map((item) => (
              <li key={item}>
                <Link
                  href={ROLE_ROUTE_PREFIXES[item]}
                  className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"
                >
                  <Shield className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{ROLE_DEFINITIONS[item].name}</span>
                  {item === role && <span className="text-xs text-muted-foreground">Đang mở</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function AccountProfile({ role }: { role: RoleCode }) {
  const { user, isLoading } = useAuth()

  return (
    <>
      <PageHeader
        icon={<CircleUser />}
        title="Hồ sơ cá nhân và phiên đăng nhập"
        description="Xem thông tin tài khoản và quản lý các phiên đăng nhập đang hoạt động."
      />
      {isLoading ? (
        <LoadingState label="Đang tải hồ sơ cá nhân…" />
      ) : user ? (
        <Card title="Thông tin tài khoản">
          <dl className="space-y-3 break-words text-sm">
            <div>
              <dt className="text-muted-foreground">Tên đăng nhập</dt>
              <dd className="font-medium">{user.username}</dd>
            </div>
            {user.fullName && (
              <div>
                <dt className="text-muted-foreground">Họ và tên</dt>
                <dd className="font-medium">{user.fullName}</dd>
              </div>
            )}
            {user.email && (
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Vai trò</dt>
              <dd className="font-medium">{ROLE_DEFINITIONS[role].name}</dd>
            </div>
          </dl>
        </Card>
      ) : (
        <ErrorState message="Không tải được thông tin tài khoản." />
      )}
      <SessionsPanel />
    </>
  )
}
