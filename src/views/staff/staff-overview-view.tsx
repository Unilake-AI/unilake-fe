'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, History, RefreshCw, ShieldCheck, Upload } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_GetIngestionStats, API_ListIngestionJobs } from '@/api/shared/ingestion'
import { API_GetQualityIssueStats, API_ListQualityIssues } from '@/api/shared/quality-issues'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  Tag,
  formatDateTime,
  formatNumber,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import type { StaffContext } from '@/types/staff-context'

import { StaffContextGate } from './staff-context-gate'
import { domainLabel, jobTypeLabel } from './staff-helpers'

function OverviewContent({ context }: { context: StaffContext }) {
  const jobStats = useQuery({
    queryKey: ['ingestion-jobs', 'stats'],
    queryFn: API_GetIngestionStats,
  })

  const recentJobs = useQuery({
    queryKey: ['ingestion-jobs', 'recent'],
    queryFn: () => API_ListIngestionJobs({ limit: 5, offset: 0 }),
  })

  const issueStats = useQuery({
    queryKey: ['quality-issues', 'stats', 'mine'],
    queryFn: () => API_GetQualityIssueStats({ mine_only: true }),
  })

  const myIssues = useQuery({
    queryKey: ['quality-issues', 'recent', 'mine'],
    queryFn: () => API_ListQualityIssues({ mine_only: true, limit: 5, offset: 0 }),
  })

  const isRefreshing =
    jobStats.isFetching || recentJobs.isFetching || issueStats.isFetching || myIssues.isFetching

  function refreshAll() {
    void jobStats.refetch()
    void recentJobs.refetch()
    void issueStats.refetch()
    void myIssues.refetch()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Không gian nhân viên', 'Tổng quan']}
        title="Tổng quan vận hành dữ liệu"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              Theo dõi tình trạng nạp dữ liệu vào Bronze và các yêu cầu xử lý dữ liệu lỗi được phân
              công.
            </span>
          </span>
        }
        actions={
          <>
            <Button
              onClick={refreshAll}
              disabled={isRefreshing}
              icon={
                <RefreshCw
                  className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              }
            >
              Làm mới
            </Button>
            <Link
              href="/staff/quality-issues"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Yêu cầu dữ liệu lỗi
            </Link>
            {context.can_upload && (
              <Link
                href="/staff/upload"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                Nạp dữ liệu
              </Link>
            )}
          </>
        }
      />

      {/* Ngữ cảnh quyền hạn hiện tại */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500">Tài khoản:</span>
            <span className="font-mono font-semibold text-slate-900">{context.username}</span>
            <span className="text-slate-300">·</span>
            <span className="font-medium text-slate-500">Lĩnh vực được cấp:</span>
            {context.domains.map((item) => (
              <Tag key={item.domain} tone="indigo">
                {item.name}
              </Tag>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500">Đơn vị công tác:</span>
            {context.departments.length > 0 ? (
              context.departments.map((dept) => (
                <Tag key={dept.department_id} tone="slate">
                  {dept.department_name}
                </Tag>
              ))
            ) : (
              <span className="text-amber-700">Chưa có phân công</span>
            )}
          </div>
        </div>
      </Card>

      {/* Thống kê Nạp dữ liệu */}
      <section aria-labelledby="ingestion-stats-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="ingestion-stats-heading" className="text-sm font-semibold text-slate-900">
            Thống kê nạp dữ liệu
          </h2>
          <Link
            href="/staff/ingestion"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Xem toàn bộ lịch sử
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {jobStats.isPending ? (
          <LoadingState label="Đang tải thống kê nạp dữ liệu…" />
        ) : jobStats.isError ? (
          <ErrorState
            message={getApiErrorMessage(jobStats.error, 'Không tải được thống kê nạp dữ liệu.')}
            onRetry={() => void jobStats.refetch()}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Tổng số lần nạp" value={formatNumber(jobStats.data.total)} />
            <KpiCard
              label="Đang chờ (QUEUED)"
              value={formatNumber(jobStats.data.queued)}
              tone="amber"
            />
            <KpiCard
              label="Đang chạy (RUNNING)"
              value={formatNumber(jobStats.data.running)}
              tone="amber"
            />
            <KpiCard
              label="Chờ thử lại (RETRY_WAIT)"
              value={formatNumber(jobStats.data.retry_wait ?? 0)}
              tone="amber"
            />
            <KpiCard
              label="Thành công (SUCCESS)"
              value={formatNumber(jobStats.data.success)}
              tone="emerald"
            />
            <KpiCard
              label="Thất bại (FAILED)"
              value={formatNumber(jobStats.data.failed)}
              tone="rose"
            />
          </div>
        )}
      </section>

      {/* Thống kê Yêu cầu xử lý dữ liệu lỗi */}
      <section aria-labelledby="issues-stats-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="issues-stats-heading" className="text-sm font-semibold text-slate-900">
            Yêu cầu xử lý dữ liệu lỗi của tôi
          </h2>
          <Link
            href="/staff/quality-issues"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Quản lý yêu cầu
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {issueStats.isPending ? (
          <LoadingState label="Đang tải thống kê yêu cầu lỗi…" />
        ) : issueStats.isError ? (
          <ErrorState
            message={getApiErrorMessage(issueStats.error, 'Không tải được thống kê yêu cầu lỗi.')}
            onRetry={() => void issueStats.refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Tổng yêu cầu được giao" value={formatNumber(issueStats.data.total)} />
            <KpiCard
              label="Cần xử lý"
              value={formatNumber(issueStats.data.assigned)}
              hint="Đang chờ tải bản sửa và nộp báo cáo"
              tone="amber"
            />
            <KpiCard
              label="Chờ xác minh"
              value={formatNumber(issueStats.data.pending_verification)}
              hint="Đã nộp, chờ quản trị dữ liệu kiểm tra"
              tone="sky"
            />
            <KpiCard
              label="Đã xác minh"
              value={formatNumber(issueStats.data.verified)}
              hint="Đã hoàn tất xác minh"
              tone="emerald"
            />
          </div>
        )}
      </section>

      {/* Hai bảng hoạt động gần đây */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Hoạt động nạp dữ liệu gần đây"
          subtitle="5 lần nạp mới nhất trong phạm vi lĩnh vực"
          right={
            <Link
              href="/staff/ingestion"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <History className="size-3.5" aria-hidden="true" />
              Chi tiết
            </Link>
          }
          bodyClassName="p-0"
        >
          {recentJobs.isPending ? (
            <LoadingState />
          ) : recentJobs.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(
                  recentJobs.error,
                  'Không tải được danh sách lần nạp gần đây.'
                )}
                onRetry={() => void recentJobs.refetch()}
              />
            </div>
          ) : recentJobs.data.length === 0 ? (
            <EmptyState
              title="Chưa có lần nạp dữ liệu nào"
              description="Hãy bắt đầu bằng việc tải lên tệp CSV hoặc Excel tại mục Nạp dữ liệu."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Job
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Tệp nguồn
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Loại
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Thời gian tạo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentJobs.data.map((job) => (
                    <tr key={job.ingestion_job_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-semibold text-indigo-600">
                        <Link
                          href={`/staff/ingestion?jobId=${job.ingestion_job_id}`}
                          className="hover:underline"
                        >
                          #{job.ingestion_job_id}
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2.5 font-mono text-slate-800">
                        {job.source_table ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{jobTypeLabel(job.job_type)}</td>
                      <td className="px-3 py-2.5">
                        <Tag tone={statusTone(job.status)}>{statusLabel(job.status)}</Tag>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {formatDateTime(job.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Yêu cầu xử lý dữ liệu lỗi được giao"
          subtitle="Các yêu cầu gần nhất đang gán cho tài khoản của bạn"
          right={
            <Link
              href="/staff/quality-issues"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Xem tất cả
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {myIssues.isPending ? (
            <LoadingState />
          ) : myIssues.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(
                  myIssues.error,
                  'Không tải được danh sách yêu cầu xử lý dữ liệu lỗi.'
                )}
                onRetry={() => void myIssues.refetch()}
              />
            </div>
          ) : myIssues.data.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu xử lý nào được giao"
              description={
                context.needs_department_assignment
                  ? context.note
                  : 'Khi quản trị dữ liệu giao yêu cầu sửa dữ liệu lỗi, yêu cầu sẽ hiển thị tại đây.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Yêu cầu
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Lĩnh vực
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Cập nhật
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myIssues.data.map((issue) => (
                    <tr key={issue.issue_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/staff/quality-issues/${issue.issue_id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {issue.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {domainLabel(issue.domain, context.domains)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Tag>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {formatDateTime(issue.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export function StaffOverviewView() {
  return <StaffContextGate>{(context) => <OverviewContent context={context} />}</StaffContextGate>
}
