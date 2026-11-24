'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import { API_ManagerIssue } from '@/api/manager/reports'
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  formatDateTime,
} from '@/components/page/page-parts'

import { ManagerGate, label } from './report-parts'

export function ManagerIssueDetailView({ issueId }: { issueId: string }) {
  return (
    <ManagerGate>
      {(context) => <IssueDetail key={context.user_id} issueId={issueId} />}
    </ManagerGate>
  )
}

function IssueDetail({ issueId }: { issueId: string }) {
  const query = useQuery({
    queryKey: ['manager', 'issue', issueId],
    queryFn: () => API_ManagerIssue(issueId),
    refetchInterval: 15_000,
  })
  if (query.isPending) return <LoadingState />
  if (query.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(query.error, 'Không thể tải yêu cầu xử lý lỗi.')}
        onRetry={() => void query.refetch()}
      />
    )
  const issue = query.data
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản lý đơn vị', 'Yêu cầu xử lý lỗi']}
        title={issue.title}
        description={`${issue.department_name ?? 'Phòng phụ trách'} · ${label(issue.status)}`}
        actions={
          <Link href="/manager/quality-issues" className="text-sm font-semibold text-indigo-700">
            Danh sách yêu cầu
          </Link>
        }
      />
      <Card title="Nội dung yêu cầu">
        <p className="whitespace-pre-wrap text-sm">
          {issue.description || 'Không có mô tả bổ sung.'}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Người phụ trách: {issue.assignee_user_id ?? 'Chưa phân công'} · Cập nhật:{' '}
          {formatDateTime(issue.updated_at)}
        </p>
      </Card>
      <Card title="Các bản ghi cần xử lý">
        {!issue.quarantine_records.length ? (
          <EmptyState title="Chưa có bản ghi lỗi liên kết" />
        ) : (
          <div className="space-y-3">
            {issue.quarantine_records.map((record) => (
              <div key={record.record_id} className="rounded-xl border p-4 text-sm">
                <p className="font-semibold">
                  {record.source_table ?? label(record.entity)} · Vị trí {record.record_position}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Mã lỗi: {record.error_codes.join(', ') || 'Chưa có mã lỗi'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Lịch sử xử lý">
        {!issue.history.length ? (
          <EmptyState title="Chưa có lịch sử" />
        ) : (
          <ol className="space-y-3">
            {issue.history.map((event) => (
              <li key={event.event_id} className="rounded-xl border p-4">
                <p className="text-sm font-semibold">{label(event.to_status)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Người thực hiện: {event.actor_id} · {formatDateTime(event.created_at)}
                </p>
                {typeof event.details.note === 'string' && (
                  <p className="mt-2 whitespace-pre-wrap text-sm">{event.details.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}
