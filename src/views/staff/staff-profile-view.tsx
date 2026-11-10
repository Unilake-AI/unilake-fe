'use client'

import type { StaffContext } from '@/api/shared/staff'
import { Card, PageHeader, Tag, formatNumber } from '@/components/page/page-parts'
import { ROLE_DEFINITIONS, toRoleCode } from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import { SessionsPanel } from '@/views/admin/sessions-panel'

import { StaffContextGate } from './staff-context-gate'
import { formatBytes } from './staff-helpers'

function ProfileContent({ context }: { context: StaffContext }) {
  const { user } = useAuth()

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Không gian nhân viên', 'Hồ sơ cá nhân & Phiên đăng nhập']}
        title="Hồ sơ cá nhân và phiên đăng nhập"
        description="Thông tin tài khoản, phạm vi lĩnh vực, phân công đơn vị và quản lý các phiên đăng nhập đang hoạt động."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Thông tin tài khoản và phân công">
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Tên đăng nhập</dt>
              <dd className="font-mono font-semibold text-slate-900">{context.username}</dd>
            </div>
            {user?.fullName && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Họ và tên</dt>
                <dd className="font-medium text-slate-900">{user.fullName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Vai trò hiện hành</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {context.roles.map((r) => {
                  const code = toRoleCode(r)
                  return (
                    <Tag key={r} tone="indigo">
                      {code ? ROLE_DEFINITIONS[code].name : r}
                    </Tag>
                  )
                })}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Lĩnh vực được phép</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {context.domains.map((d) => (
                  <Tag key={d.domain} tone="slate">
                    {d.name}
                  </Tag>
                ))}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Đơn vị công tác</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {context.departments.length > 0 ? (
                  context.departments.map((dept) => (
                    <Tag key={dept.department_id} tone="emerald">
                      {dept.department_name} ({dept.department_code})
                    </Tag>
                  ))
                ) : (
                  <span className="text-amber-700">Chưa có phân công</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Quyền thao tác và giới hạn tiếp nhận">
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Quyền tải tệp lên Bronze</dt>
              <dd>
                <Tag tone={context.can_upload ? 'emerald' : 'rose'}>
                  {context.can_upload ? 'Được phép' : 'Không được phép'}
                </Tag>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Quyền nhận và nộp bản sửa lỗi</dt>
              <dd>
                <Tag tone={context.can_resolve_issues ? 'emerald' : 'amber'}>
                  {context.can_resolve_issues ? 'Được phép (khi được giao)' : 'Chưa đủ điều kiện'}
                </Tag>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Định dạng tệp hỗ trợ</dt>
              <dd className="font-mono text-slate-900">{context.accepted_extensions.join(', ')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Dung lượng tệp tối đa</dt>
              <dd className="font-mono text-slate-900">{formatBytes(context.max_file_bytes)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Số dòng tối đa mỗi tệp</dt>
              <dd className="font-mono text-slate-900">{formatNumber(context.max_records)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <SessionsPanel />
    </div>
  )
}

export function StaffProfileView() {
  return <StaffContextGate>{(context) => <ProfileContent context={context} />}</StaffContextGate>
}
