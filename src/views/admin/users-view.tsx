'use client'

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  API_ListAccounts,
  API_FindEmployees,
  API_Organization,
  API_EmployeeAssignments,
  API_LinkEmployee,
  API_AddAssignment,
} from '@/api/admin/users'
import type { AccountItem } from '@/api/admin/users'
import { getApiErrorMessage } from '@/api/http'
import { Button, Card, PageHeader, ErrorState, LoadingState } from '@/components/page/page-parts'

import { SessionsPanel } from './sessions-panel'

const input = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm'

function AccountConfiguration({ account, close }: { account: AccountItem; close: () => void }) {
  const client = useQueryClient()
  const [employeeId, setEmployeeId] = useState(
    account.employee_id ? String(account.employee_id) : ''
  )
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [primary, setPrimary] = useState(false)
  const employees = useQuery({
    queryKey: ['account-employees', search, offset],
    queryFn: () => API_FindEmployees(search, offset),
  })
  const organization = useQuery({ queryKey: ['account-organization'], queryFn: API_Organization })
  const assignments = useQuery({
    queryKey: ['account-assignments', employeeId],
    queryFn: () => API_EmployeeAssignments(Number(employeeId)),
    enabled: !!employeeId,
  })
  const link = useMutation({
    mutationFn: () => API_LinkEmployee(account.user_id, Number(employeeId), account.employee_id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Đã lưu liên kết nhân viên')
      close()
    },
  })
  const assign = useMutation({
    mutationFn: () =>
      API_AddAssignment({
        employee_id: Number(employeeId),
        department_id: Number(department),
        position_id: Number(position),
        start_date: start,
        end_date: end || null,
        is_primary: primary,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['account-assignments'] })
      await client.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Đã lưu phân công')
    },
  })
  const busy = link.isPending || assign.isPending
  return (
    <Card title={`Cấu hình ${account.username}`} right={<Button onClick={close}>Đóng</Button>}>
      <p className="mb-4 text-sm text-slate-600">
        Chọn hồ sơ nhân viên thật. Phân công đang hiệu lực quyết định phạm vi phòng ban; vai trò
        hiện tại: {account.roles.join(', ')}.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm">
            Tìm nhân viên theo mã hoặc họ tên
            <input
              className={input}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOffset(0)
                setEmployeeId('')
              }}
            />
          </label>
          {employees.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                employees.error,
                'Không thể hoàn tất thao tác. Vui lòng thử lại.'
              )}
              onRetry={() => void employees.refetch()}
            />
          ) : (
            <>
              <label className="block text-sm">
                Nhân viên
                <select
                  className={input}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  <option value="">Chọn nhân viên</option>
                  {account.employee_id &&
                    !employees.data?.some((e) => e.employee_id === account.employee_id) && (
                      <option value={account.employee_id}>
                        {account.full_name} (đang liên kết)
                      </option>
                    )}
                  {employees.data?.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.employee_code} — {e.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button
                  disabled={!offset || employees.isFetching}
                  onClick={() => {
                    setOffset(Math.max(0, offset - 20))
                    setEmployeeId('')
                  }}
                >
                  Trước
                </Button>
                <Button
                  disabled={(employees.data?.length ?? 0) < 20 || employees.isFetching}
                  onClick={() => {
                    setOffset(offset + 20)
                    setEmployeeId('')
                  }}
                >
                  Sau
                </Button>
              </div>
            </>
          )}
          <Button
            disabled={busy || !employeeId || Number(employeeId) === account.employee_id}
            onClick={() => link.mutate()}
          >
            Lưu liên kết tài khoản
          </Button>
          {link.isError && (
            <p role="alert" className="text-sm text-red-700">
              {getApiErrorMessage(link.error, 'Không thể hoàn tất thao tác. Vui lòng thử lại.')}
            </p>
          )}
          <p className="text-sm text-slate-500">
            Nếu chưa có hồ sơ, cần nạp hồ sơ nhân sự chính xác trước khi liên kết.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Phân công của nhân viên đã chọn</h3>
          {assignments.isLoading && <LoadingState />}
          {assignments.isError && (
            <ErrorState
              message={getApiErrorMessage(
                assignments.error,
                'Không thể hoàn tất thao tác. Vui lòng thử lại.'
              )}
              onRetry={() => void assignments.refetch()}
            />
          )}
          {employeeId && assignments.data?.length === 0 && (
            <p className="text-sm text-slate-500">Chưa có phân công.</p>
          )}
          {assignments.data?.map((a) => (
            <p key={a.assignment_id} className="text-sm">
              {a.department_name} · {a.position_name} · {a.start_date} →{' '}
              {a.end_date ?? 'Không thời hạn'} · {a.status}
              {a.is_primary ? ' · Chính' : ''}
            </p>
          ))}
          {organization.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                organization.error,
                'Không thể hoàn tất thao tác. Vui lòng thử lại.'
              )}
              onRetry={() => void organization.refetch()}
            />
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                assign.mutate()
              }}
            >
              <label className="block text-sm">
                Phòng ban
                <select
                  required
                  className={input}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">Chọn phòng ban</option>
                  {organization.data?.departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_code} — {d.department_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Chức vụ
                <select
                  required
                  className={input}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="">Chọn chức vụ</option>
                  {organization.data?.positions.map((p) => (
                    <option key={p.position_id} value={p.position_id}>
                      {p.position_name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3">
                <label className="text-sm">
                  Từ ngày
                  <input
                    required
                    type="date"
                    className={input}
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Đến ngày (tùy chọn)
                  <input
                    type="date"
                    min={start}
                    className={input}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <input
                  type="checkbox"
                  checked={primary}
                  onChange={(e) => setPrimary(e.target.checked)}
                />{' '}
                Phân công chính
              </label>
              <Button type="submit" disabled={busy || !employeeId || !organization.data}>
                Thêm phân công
              </Button>
              {assign.isError && (
                <p role="alert" className="text-sm text-red-700">
                  {getApiErrorMessage(
                    assign.error,
                    'Không thể hoàn tất thao tác. Vui lòng thử lại.'
                  )}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </Card>
  )
}

export function UsersView() {
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<AccountItem | null>(null)
  const accounts = useQuery({
    queryKey: ['accounts', search, offset],
    queryFn: () => API_ListAccounts(search, offset),
  })
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị hệ thống', 'Người dùng & Phân quyền']}
        title="Người dùng & Phân quyền"
        description="Tài khoản thực tế, liên kết nhân viên và phân công phòng ban theo ngày hiệu lực."
      />
      {selected && (
        <AccountConfiguration
          key={selected.user_id}
          account={selected}
          close={() => setSelected(null)}
        />
      )}
      <Card title="Tài khoản">
        <label className="block text-sm">
          Tìm tài khoản
          <input
            className={input}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setOffset(0)
            }}
          />
        </label>
        {accounts.isLoading ? (
          <LoadingState />
        ) : accounts.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              accounts.error,
              'Không thể hoàn tất thao tác. Vui lòng thử lại.'
            )}
            onRetry={() => void accounts.refetch()}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      'Tài khoản',
                      'Nhân viên',
                      'Vai trò',
                      'Phòng đang hiệu lực',
                      'Trạng thái',
                      'Cấu hình',
                    ].map((h) => (
                      <th className="p-3" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.data?.map((a) => (
                    <tr key={a.user_id} className="border-t">
                      <td className="p-3">{a.username}</td>
                      <td className="p-3">{a.full_name ?? 'Chưa liên kết'}</td>
                      <td className="p-3">{a.roles.join(', ')}</td>
                      <td className="p-3">
                        {a.departments.map((d) => d.department_name).join(', ') ||
                          'Chưa có phân công hiệu lực'}
                      </td>
                      <td className="p-3">{a.is_active ? 'Hoạt động' : 'Đã khóa'}</td>
                      <td className="p-3">
                        <Button onClick={() => setSelected(a)}>Cấu hình</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!accounts.data?.length && <p className="p-3 text-sm">Không tìm thấy tài khoản.</p>}
            <div className="mt-3 flex gap-2">
              <Button
                disabled={!offset || accounts.isFetching}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Trước
              </Button>
              <Button
                disabled={(accounts.data?.length ?? 0) < 20 || accounts.isFetching}
                onClick={() => setOffset(offset + 20)}
              >
                Sau
              </Button>
            </div>
          </>
        )}
      </Card>
      <SessionsPanel />
    </div>
  )
}
