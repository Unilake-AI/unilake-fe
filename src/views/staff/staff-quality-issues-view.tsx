'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_ListDatasets } from '@/api/shared/datasets'
import { API_ListQualityIssues } from '@/api/shared/quality-issues'
import { filterControlClassName } from '@/components/page/filter-bar'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Tag,
  formatDateTime,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import type { StaffQualityIssueStatusFilter } from '@/types/quality-issues'
import type { StaffContext } from '@/types/staff-context'

import { StaffContextGate } from './staff-context-gate'
import { domainLabel } from './staff-helpers'

const PAGE_SIZE = 20

const ISSUE_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'ASSIGNED', label: 'Cần xử lý' },
  { value: 'PENDING_VERIFICATION', label: 'Chờ xác minh' },
  { value: 'VERIFIED', label: 'Đã xác minh' },
] as const

function QualityIssuesContent({ context }: { context: StaffContext }) {
  const [statusFilter, setStatusFilter] = useState<string>('ASSIGNED')
  const [offset, setOffset] = useState(0)

  const filterParams = {
    status: (statusFilter as StaffQualityIssueStatusFilter) || undefined,
    mine_only: true,
  }

  const issuesQuery = useQuery({
    queryKey: ['quality-issues', 'list', { ...filterParams, limit: PAGE_SIZE, offset }],
    queryFn: () =>
      API_ListQualityIssues({
        ...filterParams,
        limit: PAGE_SIZE,
        offset,
      }),
    refetchInterval: 15_000,
  })

  const datasetsQuery = useQuery({
    queryKey: ['datasets', { limit: 100, offset: 0 }],
    queryFn: () => API_ListDatasets({ limit: 100, offset: 0 }),
  })

  const datasetNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const ds of datasetsQuery.data ?? []) {
      map.set(ds.dataset_id, ds.dataset_name)
    }
    return map
  }, [datasetsQuery.data])

  const departmentNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const dept of context.departments) {
      map.set(dept.department_id, dept.department_name)
    }
    return map
  }, [context.departments])

  const issues = issuesQuery.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<ShieldCheck />}
        breadcrumb={['Không gian nhân viên', 'Yêu cầu xử lý dữ liệu lỗi']}
        title="Yêu cầu xử lý dữ liệu lỗi"
        description="Xem danh sách các vấn đề chất lượng dữ liệu trong phạm vi đơn vị, tải tệp đã sửa và gửi báo cáo xác minh."
      />

      <div className="min-w-0">
        <label htmlFor="filter-issue-status" className="sr-only">
          Trạng thái yêu cầu
        </label>
        <select
          id="filter-issue-status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setOffset(0)
          }}
          className={filterControlClassName}
        >
          {ISSUE_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Danh sách yêu cầu */}
      <Card title="Danh sách yêu cầu xử lý" bodyClassName="p-0">
        {issuesQuery.isPending ? (
          <TableSkeleton columns={7} label="Đang tải danh sách yêu cầu xử lý…" />
        ) : issuesQuery.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(
                issuesQuery.error,
                'Không tải được danh sách yêu cầu xử lý dữ liệu lỗi.'
              )}
              retrying={issuesQuery.isFetching}
              onRetry={() => void issuesQuery.refetch()}
            />
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            title="Không có yêu cầu xử lý dữ liệu lỗi nào"
            description={
              context.needs_department_assignment
                ? context.note
                : 'Thử chọn trạng thái khác để xem yêu cầu được giao.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {[
                      'Tiêu đề yêu cầu',
                      'Trạng thái',
                      'Bộ dữ liệu',
                      'Lĩnh vực',
                      'Đơn vị',
                      'Người phụ trách',
                      'Ngày tạo',
                      'Cập nhật',
                      '',
                    ].map((heading, idx) => (
                      <th key={idx} scope="col" className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issues.map((issue) => {
                    const dsName = datasetNameMap.get(issue.dataset_id)
                    const deptName = departmentNameMap.get(issue.department_id)
                    const isMine = issue.assignee_user_id === context.user_id

                    return (
                      <tr key={issue.issue_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/staff/quality-issues/${issue.issue_id}`}
                            className="font-semibold text-[#b91830] hover:underline"
                          >
                            {issue.title}
                          </Link>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                            {issue.description}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <Tag tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Tag>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {dsName ?? `#${issue.dataset_id}`}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {domainLabel(issue.domain, context.domains)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {deptName ?? `Đơn vị #${issue.department_id}`}
                        </td>
                        <td className="px-3 py-2.5">
                          {issue.assignee_user_id == null ? (
                            <span className="text-slate-400">Chưa phân công</span>
                          ) : isMine ? (
                            <Tag tone="indigo">Tôi (#{issue.assignee_user_id})</Tag>
                          ) : (
                            <span className="font-mono text-slate-700">
                              #{issue.assignee_user_id}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {formatDateTime(issue.created_at)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {formatDateTime(issue.updated_at)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link
                            href={`/staff/quality-issues/${issue.issue_id}`}
                            className="inline-flex items-center gap-1 font-semibold text-[#b91830] hover:underline"
                          >
                            Chi tiết
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Hiển thị {issues.length} yêu cầu (từ vị trí {offset + 1})
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  disabled={offset === 0 || issuesQuery.isFetching}
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                >
                  Trang trước
                </Button>
                <Button
                  disabled={issues.length < PAGE_SIZE || issuesQuery.isFetching}
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export function StaffQualityIssuesView() {
  return (
    <StaffContextGate>{(context) => <QualityIssuesContent context={context} />}</StaffContextGate>
  )
}
