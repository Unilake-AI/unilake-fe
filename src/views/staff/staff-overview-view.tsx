'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Database,
  History,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_GetIngestionStats, API_ListIngestionJobs } from '@/api/shared/ingestion'
import { API_GetQualityIssueStats, API_ListQualityIssues } from '@/api/shared/quality-issues'
import { CountChart } from '@/components/charts/count-chart'
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
import { TableSkeleton } from '@/components/ui/table-skeleton'
import type { StaffContext } from '@/types/staff-context'

import { DepartmentAssignmentBanner, StaffContextGate } from './staff-context-gate'
import { domainLabel } from './staff-helpers'

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
  const refreshAll = () => {
    void jobStats.refetch()
    void recentJobs.refetch()
    void issueStats.refetch()
    void myIssues.refetch()
  }
  return (
    <div className="space-y-5">
      <PageHeader
        dashboard
        breadcrumb={['Không gian nhân viên', 'Tổng quan']}
        title="Tổng quan vận hành dữ liệu"
        description="Theo dõi lần nạp và các yêu cầu xử lý dữ liệu lỗi của đơn vị."
        actions={
          <Button
            onClick={refreshAll}
            reading={isRefreshing}
            icon={<RefreshCw className="size-4" aria-hidden="true" />}
          >
            Làm mới
          </Button>
        }
      />

      {context.needs_department_assignment && <DepartmentAssignmentBanner note={context.note} />}

      {jobStats.isPending ? (
        <LoadingState label="Đang tải thống kê nạp dữ liệu…" />
      ) : jobStats.isError ? (
        <ErrorState
          message={getApiErrorMessage(jobStats.error, 'Không tải được thống kê nạp dữ liệu.')}
          retrying={jobStats.isFetching}
          onRetry={() => void jobStats.refetch()}
        />
      ) : (
        <section
          aria-label="Thống kê nạp dữ liệu"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4"
        >
          <KpiCard dashboard label="Tổng số lần nạp" value={formatNumber(jobStats.data.total)} />
          <KpiCard
            dashboard
            label="Nạp thành công"
            value={formatNumber(jobStats.data.success)}
            tone="emerald"
          />
          <KpiCard
            dashboard
            label="Đang chờ hoặc xử lý"
            value={formatNumber(
              jobStats.data.queued + jobStats.data.running + (jobStats.data.retry_wait ?? 0)
            )}
            tone="amber"
          />
          <KpiCard
            dashboard
            label="Nạp thất bại"
            value={formatNumber(jobStats.data.failed)}
            tone="rose"
          />
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title={
            <span className="flex items-center gap-2">
              <Layers3 className="size-5 text-[#b91830]" />
              Tình hình yêu cầu xử lý dữ liệu lỗi
            </span>
          }
          right={
            <Link
              href="/staff/quality-issues"
              className="flex items-center gap-1 text-xs font-semibold text-[#b91830]"
            >
              Quản lý yêu cầu <ArrowRight className="size-4" />
            </Link>
          }
        >
          {issueStats.isPending ? (
            <LoadingState />
          ) : issueStats.isError ? (
            <ErrorState
              message={getApiErrorMessage(issueStats.error, 'Không tải được thống kê yêu cầu.')}
              retrying={issueStats.isFetching}
              onRetry={() => void issueStats.refetch()}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tổng yêu cầu{' '}
                <strong className="font-semibold text-foreground">
                  {formatNumber(issueStats.data.total)}
                </strong>
              </p>
              <CountChart
                unit="yêu cầu"
                data={[
                  { label: 'Cần xử lý', count: issueStats.data.assigned, tone: 'warning' },
                  { label: 'Chờ xác minh', count: issueStats.data.pending_verification },
                  { label: 'Đã xác minh', count: issueStats.data.verified, tone: 'success' },
                ]}
              />
            </div>
          )}
        </Card>
        <Card
          title={
            <span className="flex items-center gap-2">
              <History className="size-5 text-[#b91830]" />
              Hoạt động nạp dữ liệu gần đây
            </span>
          }
          right={
            <Link
              href="/staff/ingestion"
              className="flex items-center gap-1 text-xs font-semibold text-[#b91830]"
            >
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          }
        >
          {recentJobs.isPending ? (
            <LoadingState />
          ) : recentJobs.isError ? (
            <ErrorState
              message={getApiErrorMessage(recentJobs.error, 'Không tải được lịch sử nạp dữ liệu.')}
              retrying={recentJobs.isFetching}
              onRetry={() => void recentJobs.refetch()}
            />
          ) : recentJobs.data.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <Database className="size-5 text-slate-500" aria-hidden="true" />
              <h3 className="mt-3 text-base font-bold">Chưa có lần nạp dữ liệu nào</h3>
              <p className="mt-1 text-sm text-[#65718d]">
                Hãy bắt đầu nạp dữ liệu để theo dõi tình trạng tại đây.
              </p>
              {context.can_upload && (
                <Link
                  href="/staff/upload"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#b91830] px-4 py-2 text-sm font-semibold text-white"
                >
                  <Upload className="size-4" />
                  Nạp dữ liệu ngay
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.data.map((job) => (
                <Link
                  key={job.ingestion_job_id}
                  href={`/staff/ingestion?jobId=${job.ingestion_job_id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e9f3] px-3 py-2 text-xs hover:bg-[#f7f8fc]"
                >
                  <span className="min-w-0 truncate font-semibold">
                    #{job.ingestion_job_id} · {job.source_table ?? 'Tệp dữ liệu'}
                  </span>
                  <span className="shrink-0 text-[#65718d]">{formatDateTime(job.created_at)}</span>
                  <Tag tone={statusTone(job.status)}>{statusLabel(job.status)}</Tag>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#b91830]" />
            Yêu cầu xử lý dữ liệu lỗi được giao
          </span>
        }
        subtitle="Các yêu cầu gần nhất đang gán cho tài khoản của bạn"
        right={
          <Link
            href="/staff/quality-issues"
            className="flex items-center gap-1 text-xs font-semibold text-[#b91830]"
          >
            Xem tất cả <ArrowRight className="size-4" />
          </Link>
        }
        bodyClassName="p-0"
      >
        {myIssues.isPending ? (
          <TableSkeleton columns={5} />
        ) : myIssues.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(
                myIssues.error,
                'Không tải được danh sách yêu cầu xử lý dữ liệu lỗi.'
              )}
              retrying={myIssues.isFetching}
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
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr>
                  {['Yêu cầu', 'Lĩnh vực', 'Trạng thái', 'Cập nhật'].map((head) => (
                    <th key={head} scope="col" className="px-4 py-2.5 text-xs font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myIssues.data.map((issue) => (
                  <tr key={issue.issue_id} className="hover:bg-[#f7f8fc]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/quality-issues/${issue.issue_id}`}
                        className="font-semibold text-[#b91830] hover:underline"
                      >
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#596884]">
                      {domainLabel(issue.domain, context.domains)}
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Tag>
                    </td>
                    <td className="px-4 py-3 text-[#65718d]">{formatDateTime(issue.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export function StaffOverviewView() {
  return (
    <StaffContextGate showAssignmentBanner={false}>
      {(context) => <OverviewContent context={context} />}
    </StaffContextGate>
  )
}
