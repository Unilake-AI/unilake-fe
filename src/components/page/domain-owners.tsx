'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, History, Plus, ShieldAlert, ShieldCheck } from 'lucide-react'

import { listDomainOwnerAuditEvents } from '@/api/admin/client'
import { getApiErrorMessage } from '@/api/http'
import {
  grantDomainOwner,
  listDomainOwnerGrants,
  revokeDomainOwner,
} from '@/api/shared/domain-owners'
import { Card, EmptyState, Tag } from '@/components/page/page-parts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const DOMAINS: Record<string, string> = {
  admissions: 'Tuyển sinh',
  academic: 'Đào tạo',
  hr: 'Nhân sự',
}

export function DomainOwners({ canManage = false }: { canManage?: boolean }) {
  const queryClient = useQueryClient()
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null)
  const [showAuditHistory, setShowAuditHistory] = useState(false)
  const [auditOffset, setAuditOffset] = useState(0)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const grantsKey = ['domain-owner-grants']
  const grants = useQuery({ queryKey: grantsKey, queryFn: listDomainOwnerGrants })

  const auditKey = ['domain-owner-audit', auditOffset]
  const auditLogs = useQuery({
    queryKey: auditKey,
    queryFn: () => listDomainOwnerAuditEvents(auditOffset, 10),
    enabled: canManage && showAuditHistory,
  })

  async function handleGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const domain = data.get('domain')
    const userId = Number(data.get('user'))
    const reason = data.get('reason')

    if (typeof domain !== 'string' || !userId || typeof reason !== 'string') {
      setError('Vui lòng điền đầy đủ lĩnh vực, mã tài khoản và lý do cấp quyền.')
      return
    }

    setPending(true)
    setError('')
    try {
      await grantDomainOwner(domain, userId, reason)
      form.reset()
      setShowGrantForm(false)
      await queryClient.invalidateQueries({ queryKey: grantsKey })
      if (showAuditHistory) {
        await queryClient.invalidateQueries({ queryKey: ['domain-owner-audit'] })
      }
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Không thể cấp quyền Domain Owner.'))
    } finally {
      setPending(false)
    }
  }

  async function handleRevoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!revokingGrantId) return
    const form = event.currentTarget
    const data = new FormData(form)
    const reason = data.get('reason')

    if (typeof reason !== 'string' || reason.trim().length < 5) {
      setError('Vui lòng nhập lý do thu hồi (tối thiểu 5 ký tự).')
      return
    }

    setPending(true)
    setError('')
    try {
      await revokeDomainOwner(revokingGrantId, reason)
      setRevokingGrantId(null)
      await queryClient.invalidateQueries({ queryKey: grantsKey })
      if (showAuditHistory) {
        await queryClient.invalidateQueries({ queryKey: ['domain-owner-audit'] })
      }
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Không thể thu hồi quyền Domain Owner.'))
    } finally {
      setPending(false)
    }
  }

  const activeGrants = grants.data ?? []

  return (
    <Card
      title="Người phụ trách lĩnh vực (Domain Owner)"
      subtitle="Quản lý ủy quyền Domain Owner cho các lĩnh vực Tuyển sinh, Đào tạo và Nhân sự"
      right={
        canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuditHistory(!showAuditHistory)}
            >
              <History className="mr-1.5 size-4" />
              {showAuditHistory ? 'Ẩn lịch sử' : 'Lịch sử cấp / thu hồi'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowGrantForm(!showGrantForm)
                setRevokingGrantId(null)
                setError('')
              }}
            >
              <Plus className="mr-1.5 size-4" />
              {showGrantForm ? 'Đóng biểu mẫu' : 'Cấp quyền Domain Owner'}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {canManage && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <p>
              <span className="font-semibold">Điều kiện cấp quyền:</span> Cấp grant yêu cầu tài
              khoản và nhân viên đang hoạt động, đúng vai trò Manager và có phân công hiện hành tại
              phòng ban của lĩnh vực tương ứng. Nội dung lý do cấp hoặc thu hồi được lưu lại vĩnh
              viễn trong nhật ký kiểm toán.
            </p>
          </div>
        )}

        {grants.isPending && (
          <p role="status" className="py-2 text-sm text-slate-500">
            Đang tải danh sách Domain Owner…
          </p>
        )}

        {grants.isError && (
          <p role="alert" className="text-sm text-rose-700">
            {getApiErrorMessage(grants.error, 'Không thể tải danh sách quyền Domain Owner.')}
          </p>
        )}

        {activeGrants.length === 0 && !grants.isPending && (
          <EmptyState
            title="Chưa có quyền Domain Owner nào được cấp"
            description="Chưa có grant nào đang hiệu lực trong hệ thống."
          />
        )}

        {activeGrants.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th scope="col" className="p-3">
                    Lĩnh vực (Domain)
                  </th>
                  <th scope="col" className="p-3">
                    Mã tài khoản (User ID)
                  </th>
                  <th scope="col" className="p-3">
                    Mã Grant
                  </th>
                  <th scope="col" className="p-3">
                    Trạng thái
                  </th>
                  {canManage && (
                    <th scope="col" className="p-3 text-right">
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeGrants.map((grant) => (
                  <tr key={grant.grant_id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900">
                      {DOMAINS[grant.domain] ?? grant.domain}
                      <span className="ml-1 text-xs text-slate-500">({grant.domain})</span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        #{grant.user_id}
                      </span>
                    </td>
                    <td className="p-3">
                      <code className="text-xs text-slate-500">
                        {grant.grant_id.slice(0, 8)}…{grant.grant_id.slice(-4)}
                      </code>
                    </td>
                    <td className="p-3">
                      <Tag tone="emerald">Đang hiệu lực</Tag>
                    </td>
                    {canManage && (
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          disabled={pending}
                          onClick={() => {
                            setRevokingGrantId(grant.grant_id)
                            setShowGrantForm(false)
                            setError('')
                          }}
                        >
                          Thu hồi
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Form Cấp quyền Domain Owner */}
        {showGrantForm && canManage && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Cấp quyền Domain Owner mới
            </h3>
            <form className="space-y-3" onSubmit={(e) => void handleGrant(e)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Lĩnh vực phụ trách</span>
                  <select
                    name="domain"
                    required
                    className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
                  >
                    {Object.entries(DOMAINS).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name} ({code})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">
                    Mã tài khoản Trưởng phòng (User ID)
                  </span>
                  <Input
                    name="user"
                    type="number"
                    required
                    min={1}
                    placeholder="vd. 3"
                    autoComplete="off"
                  />
                </label>
              </div>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-slate-700">
                  Lý do cấp quyền (Bắt buộc, tối thiểu 10 ký tự)
                </span>
                <Input
                  name="reason"
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="vd. Quyết định bổ nhiệm phụ trách dữ liệu tuyển sinh năm học 2026..."
                />
              </label>

              {error && (
                <p role="alert" className="text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Đang cấp quyền…' : 'Xác nhận cấp quyền'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setShowGrantForm(false)
                    setError('')
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Modal / Panel Thu hồi quyền */}
        {revokingGrantId && canManage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-700" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-rose-900">
                  Xác nhận thu hồi quyền Domain Owner
                </h3>
                <p className="mt-1 text-xs text-rose-700">
                  Grant ID: <code className="font-mono">{revokingGrantId}</code> · Thu hồi quyền của
                  tài khoản #{activeGrants.find((g) => g.grant_id === revokingGrantId)?.user_id}
                </p>
              </div>
            </div>

            <form className="mt-3 space-y-3" onSubmit={(e) => void handleRevoke(e)}>
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-slate-700">Lý do thu hồi quyền (Bắt buộc)</span>
                <Input
                  name="reason"
                  required
                  minLength={5}
                  maxLength={2000}
                  placeholder="vd. Hết nhiệm kỳ hoặc chuyển đổi phân công quản lý..."
                  autoFocus
                />
              </label>

              {error && (
                <p role="alert" className="text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={pending}
                  className="bg-rose-700 text-white hover:bg-rose-800"
                >
                  {pending ? 'Đang thu hồi…' : 'Xác nhận thu hồi ngay'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setRevokingGrantId(null)
                    setError('')
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Lịch sử cấp / thu hồi Domain Owner Audit */}
        {showAuditHistory && canManage && (
          <div className="mt-4 space-y-3 rounded-lg border bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Nhật ký cấp & thu hồi quyền Domain Owner
              </h3>
              <span className="text-xs text-slate-500">API: /pipeline/profiles/owners/grants/audit</span>
            </div>

            {auditLogs.isPending && (
              <p className="py-2 text-xs text-slate-500">Đang tải lịch sử…</p>
            )}

            {auditLogs.isError && (
              <p className="text-xs text-rose-700">
                {getApiErrorMessage(auditLogs.error, 'Không thể tải lịch sử kiểm toán Domain Owner.')}
              </p>
            )}

            {auditLogs.data?.length === 0 && (
              <p className="text-xs text-slate-500">Chưa có bản ghi lịch sử nào.</p>
            )}

            {auditLogs.data && auditLogs.data.length > 0 && (
              <div className="overflow-x-auto rounded border bg-white">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600">
                    <tr>
                      <th className="p-2">Thời điểm</th>
                      <th className="p-2">Người thực hiện</th>
                      <th className="p-2">Hành động</th>
                      <th className="p-2">Lĩnh vực</th>
                      <th className="p-2">Tài khoản nhận</th>
                      <th className="p-2">Mã Grant</th>
                      <th className="p-2">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.data.map((log) => (
                      <tr key={`${log.grant_id}-${log.action}-${log.occurred_at}`}>
                        <td className="p-2 text-slate-600">
                          {log.occurred_at.slice(0, 19).replace('T', ' ')}
                        </td>
                        <td className="p-2 font-medium text-slate-900">#{log.actor_id}</td>
                        <td className="p-2">
                          <Tag tone={log.action === 'GRANTED' ? 'emerald' : 'rose'}>
                            {log.action === 'GRANTED' ? 'Cấp quyền' : 'Thu hồi'}
                          </Tag>
                        </td>
                        <td className="p-2">{DOMAINS[log.domain] ?? log.domain}</td>
                        <td className="p-2 font-mono">#{log.user_id}</td>
                        <td className="p-2 font-mono text-[11px] text-slate-500">
                          {log.grant_id.slice(0, 8)}…
                        </td>
                        <td className="p-2">
                          <span className="font-semibold text-emerald-700">Thành công</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={auditOffset === 0}
                onClick={() => setAuditOffset(Math.max(0, auditOffset - 10))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(auditLogs.data?.length ?? 0) < 10}
                onClick={() => setAuditOffset(auditOffset + 10)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
