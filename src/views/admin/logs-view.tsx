'use client'

import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { listAuditEvents, listDomainOwnerAuditEvents } from '@/api/admin/client'
import { getApiErrorMessage } from '@/api/http'
import { filterControlClassName } from '@/components/page/filter-bar'
import { Card, EmptyState, PageHeader } from '@/components/page/page-parts'
import { Button } from '@/components/ui/button'

const ACTIONS: Record<string, string> = {
  LOGIN: 'Đăng nhập',
  ACCOUNT_CREATED: 'Tạo tài khoản',
  ACCOUNT_LOCKED: 'Khóa tài khoản',
  ACCOUNT_UNLOCKED: 'Mở khóa tài khoản',
  ROLES_UPDATED: 'Đổi vai trò',
  ACCOUNT_ACCESS_UPDATED: 'Cập nhật quyền truy cập',
  GRANTED: 'Cấp quyền Domain Owner',
  REVOKED: 'Thu hồi quyền Domain Owner',
  EMPLOYEE_LINKED: 'Liên kết hồ sơ nhân viên',
  ASSIGNMENT_CREATED: 'Thêm phân công',
}

export function LogsView() {
  const [offset, setOffset] = useState(0)
  const [domainOwners, setDomainOwners] = useState(false)
  const events = useQuery({
    queryKey: ['admin', 'audit', domainOwners, offset],
    queryFn: async () =>
      domainOwners
        ? (await listDomainOwnerAuditEvents(offset)).map((event) => ({
            key: `${event.action}-${event.grant_id}`,
            occurred_at: event.occurred_at,
            username: `#${event.actor_id}`,
            action: event.action,
            target_id: event.user_id,
            outcome: event.outcome,
            changes: { domain: event.domain, grant_id: event.grant_id },
            error_code: null,
          }))
        : (await listAuditEvents(offset)).map((event) => ({
            ...event,
            key: `${event.action}-${event.event_id}`,
          })),
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Nhật ký hệ thống" breadcrumb={['Quản trị hệ thống', 'Nhật ký hệ thống']} />
      <label>
        <span className="sr-only">Nhật ký</span>
        <select
          className={filterControlClassName}
          value={domainOwners ? 'owners' : 'accounts'}
          onChange={(event) => {
            setDomainOwners(event.target.value === 'owners')
            setOffset(0)
          }}
        >
          <option value="accounts">Tài khoản và tổ chức</option>
          <option value="owners">Domain Owner</option>
        </select>
      </label>
      <Card title="Sự kiện xác thực và phân quyền">
        {events.isPending && <p role="status">Đang tải nhật ký…</p>}
        {events.isError && (
          <p role="alert" className="text-sm text-rose-700">
            {getApiErrorMessage(events.error, 'Không thể tải nhật ký.')}
          </p>
        )}
        {events.data?.length === 0 && <EmptyState title="Chưa có sự kiện" />}
        {events.data && events.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr>
                  {[
                    'Thời gian',
                    'Người thực hiện',
                    'Hoạt động',
                    'Mã đối tượng',
                    'Kết quả',
                    'Thay đổi',
                  ].map((heading) => (
                    <th key={heading} scope="col" className="p-2">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.data.map((event) => (
                  <tr key={event.key}>
                    <td className="p-2">
                      <time dateTime={event.occurred_at}>
                        {event.occurred_at.slice(0, 19).replace('T', ' ')}
                      </time>
                    </td>
                    <td className="p-2">{event.username}</td>
                    <td className="p-2">{ACTIONS[event.action] ?? event.action}</td>
                    <td className="p-2">{event.target_id ?? '—'}</td>
                    <td className="p-2">
                      {event.outcome === 'REJECTED' ? 'Bị từ chối' : 'Thành công'}
                      {event.error_code && (
                        <code className="block text-xs">{event.error_code}</code>
                      )}
                    </td>
                    <td className="p-2">
                      {event.changes ? (
                        <details>
                          <summary className="cursor-pointer">Xem thay đổi</summary>
                          <pre className="max-w-xs overflow-auto text-xs">
                            {JSON.stringify(event.changes, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(offset - 20)}
          >
            Trang trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={events.data?.length !== 20}
            onClick={() => setOffset(offset + 20)}
          >
            Trang sau
          </Button>
        </div>
      </Card>
    </div>
  )
}
