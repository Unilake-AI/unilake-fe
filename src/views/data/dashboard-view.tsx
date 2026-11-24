'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'

import { API_ListCleaningRuns } from '@/api/admindata/cleaning'
import { API_ListIngestionWorkers } from '@/api/admindata/ingestion'
import { getApiErrorMessage } from '@/api/http'
import {
  API_GetIngestionMetrics,
  API_GetIngestionStats,
  API_ListIngestionJobs,
} from '@/api/shared/ingestion'
import { API_GetQualityIssueStats } from '@/api/shared/quality-issues'
import { CountChart } from '@/components/charts/count-chart'
import {
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
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/ui/table-skeleton'

import { domainLabel, formatSeconds, jobTypeLabel } from './data-helpers'

const ingestionStatsGrid =
  'grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-6'
const ingestionStatPadding = 'px-3 py-2.5 sm:px-4 sm:py-3'

export function DataDashboardView() {
  const statsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'stats'],
    queryFn: API_GetIngestionStats,
  })
  const metricsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'metrics'],
    queryFn: API_GetIngestionMetrics,
  })
  const jobsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'dashboard-recent'],
    queryFn: () => API_ListIngestionJobs({ limit: 5, offset: 0 }),
  })
  const workersQuery = useQuery({
    queryKey: ['ingestion-workers'],
    queryFn: API_ListIngestionWorkers,
  })
  const issueStatsQuery = useQuery({
    queryKey: ['quality-issues', 'stats', 'admin-dashboard'],
    queryFn: () => API_GetQualityIssueStats(),
  })
  const cleaningQuery = useQuery({
    queryKey: ['cleaning-runs', 'dashboard-recent'],
    queryFn: () => API_ListCleaningRuns({ limit: 5, offset: 0 }),
  })

  const workers = workersQuery.data ?? []
  const healthyWorkers = workers.filter((w) => w.status.toUpperCase() === 'HEALTHY')
  const offlineWorkers = workers.filter((w) => w.status.toUpperCase() !== 'HEALTHY')
  const busyWorkers = healthyWorkers.filter((w) => w.current_job_id != null)

  return (
    <div className="space-y-4">
      <PageHeader
        dashboard
        breadcrumb={['Quản trị dữ liệu', 'Tổng quan']}
        title="Bảng điều khiển vận hành Data Lake"
        description="Theo dõi lượt nạp Bronze, tiến độ làm sạch và tình trạng vận hành."
        actions={
          <Link
            href="/data/ingestion"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#b91830] px-3 text-xs font-semibold text-white hover:bg-[#9e1429]"
          >
            Quản lý Ingestion
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {/* Thống kê Ingestion toàn hệ thống */}
      <section aria-labelledby="dash-ingestion-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="dash-ingestion-heading" className="text-sm font-semibold text-slate-900">
            Tổng quan nạp dữ liệu
          </h2>
          <Link
            href="/data/ingestion"
            className="text-xs font-medium text-[#b91830] hover:underline"
          >
            Xem lịch sử nạp
          </Link>
        </div>
        {statsQuery.isPending ? (
          <div role="status" className={ingestionStatsGrid}>
            <span className="sr-only">Đang tải thống kê lượt nạp…</span>
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className={`space-y-1.5 bg-card ${ingestionStatPadding}`}
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
        ) : statsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(statsQuery.error, 'Không tải được thống kê ingestion.')}
            retrying={statsQuery.isFetching}
            onRetry={() => void statsQuery.refetch()}
          />
        ) : (
          <div className={ingestionStatsGrid}>
            {(
              [
                ['Tổng lượt nạp', statsQuery.data.total, 'slate'],
                ['Đang chờ', statsQuery.data.queued, 'amber'],
                ['Đang chạy', statsQuery.data.running, 'amber'],
                ['Chờ thử lại', statsQuery.data.retry_wait, 'amber'],
                ['Đã lưu Bronze', statsQuery.data.success, 'emerald'],
                ['Thất bại', statsQuery.data.failed, 'rose'],
              ] as const
            ).map(([label, value, tone]) => (
              <KpiCard
                key={label}
                className={`rounded-none border-0 ${ingestionStatPadding}`}
                label={label}
                value={formatNumber(value)}
                tone={tone}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card
          title="Phân bố trạng thái nạp Bronze"
          subtitle="Số lượt nạp theo trạng thái tại thời điểm tải"
          right={
            <Link
              href="/data/auto-pipeline"
              className="text-xs font-medium text-primary hover:underline"
            >
              Xem luồng xử lý
            </Link>
          }
        >
          {statsQuery.isPending ? (
            <div role="status" className="space-y-7 px-2 py-5">
              <span className="sr-only">Đang tải biểu đồ lượt nạp…</span>
              {['w-3/5', 'w-2/5', 'w-4/5', 'w-1/2', 'w-2/3'].map((width) => (
                <div
                  key={width}
                  aria-hidden="true"
                  className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[90px_minmax(0,1fr)]"
                >
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className={`h-4 ${width}`} />
                </div>
              ))}
            </div>
          ) : statsQuery.isError ? (
            <ErrorState
              message="Không thể tải phân bố trạng thái."
              retrying={statsQuery.isFetching}
              onRetry={() => void statsQuery.refetch()}
            />
          ) : (
            <CountChart
              unit="lượt nạp"
              data={[
                { label: 'Đang chờ', count: statsQuery.data.queued },
                { label: 'Đang chạy', count: statsQuery.data.running },
                ...(statsQuery.data.retry_wait == null
                  ? []
                  : [
                      {
                        label: 'Chờ thử lại',
                        count: statsQuery.data.retry_wait,
                        tone: 'warning' as const,
                      },
                    ]),
                { label: 'Thành công', count: statsQuery.data.success, tone: 'success' },
                { label: 'Thất bại', count: statsQuery.data.failed, tone: 'error' },
              ]}
            />
          )}
        </Card>

        <div className="grid min-w-0 gap-4">
          <Card
            title="Hiệu năng nạp dữ liệu"
            right={
              <Link
                href="/data/ingestion"
                className="text-xs font-medium text-[#b91830] hover:underline"
              >
                Chi tiết
              </Link>
            }
          >
            {metricsQuery.isPending ? (
              <LoadingState />
            ) : metricsQuery.isError ? (
              <ErrorState
                message={getApiErrorMessage(metricsQuery.error, 'Không tải được chỉ số hiệu năng.')}
                retrying={metricsQuery.isFetching}
                onRetry={() => void metricsQuery.refetch()}
              />
            ) : (
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Thời gian chờ trung bình</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatSeconds(metricsQuery.data.average_wait_seconds)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Thời gian xử lý trung bình</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatSeconds(metricsQuery.data.average_processing_seconds)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tỷ lệ thất bại</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {metricsQuery.data.failure_rate_percent != null
                      ? `${metricsQuery.data.failure_rate_percent.toFixed(1)}%`
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Job chờ lâu nhất</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatSeconds(metricsQuery.data.oldest_queued_seconds)}
                  </dd>
                </div>
              </dl>
            )}
          </Card>
          <Card
            title="Tình trạng worker"
            right={
              <Link
                href="/data/workers"
                className="text-xs font-medium text-[#b91830] hover:underline"
              >
                Giám sát Worker
              </Link>
            }
          >
            {workersQuery.isPending ? (
              <LoadingState />
            ) : workersQuery.isError ? (
              <ErrorState
                message={getApiErrorMessage(
                  workersQuery.error,
                  'Không tải được trạng thái worker.'
                )}
                retrying={workersQuery.isFetching}
                onRetry={() => void workersQuery.refetch()}
              />
            ) : (
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tổng số worker đã ghi nhận</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{workers.length}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Đang hoạt động (HEALTHY)</dt>
                  <dd className="font-semibold tabular-nums text-emerald-700">
                    {healthyWorkers.length} ({busyWorkers.length} đang chạy job)
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Ngoại tuyến (OFFLINE)</dt>
                  <dd className="font-semibold tabular-nums text-rose-700">
                    {offlineWorkers.length}
                  </dd>
                </div>
              </dl>
            )}
          </Card>
        </div>
      </div>
      <Card
        title="Yêu cầu xử lý dữ liệu lỗi"
        right={
          <Link href="/data/quality" className="text-xs font-medium text-[#b91830] hover:underline">
            Quản lý yêu cầu
          </Link>
        }
      >
        {issueStatsQuery.isPending ? (
          <LoadingState />
        ) : issueStatsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              issueStatsQuery.error,
              'Không tải được thống kê yêu cầu lỗi.'
            )}
            retrying={issueStatsQuery.isFetching}
            onRetry={() => void issueStatsQuery.refetch()}
          />
        ) : (
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">Tổng yêu cầu</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                {formatNumber(issueStatsQuery.data.total)}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">Đang mở (Cần xử lý)</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-amber-700">
                {formatNumber(issueStatsQuery.data.assigned)}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">Chờ xác minh</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-sky-700">
                {formatNumber(issueStatsQuery.data.pending_verification)}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">Đã xác minh</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
                {formatNumber(issueStatsQuery.data.verified)}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      {/* Hai bảng hoạt động gần đây */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Lần nạp dữ liệu gần đây"
          subtitle="5 lượt nạp mới nhất"
          right={
            <Link
              href="/data/ingestion"
              className="text-xs font-medium text-[#b91830] hover:underline"
            >
              Tất cả
            </Link>
          }
          bodyClassName="p-0"
        >
          {jobsQuery.isPending ? (
            <TableSkeleton columns={5} label="Đang tải các lần nạp gần đây…" />
          ) : jobsQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(jobsQuery.error, 'Không tải được danh sách job.')}
                retrying={jobsQuery.isFetching}
                onRetry={() => void jobsQuery.refetch()}
              />
            </div>
          ) : jobsQuery.data.length === 0 ? (
            <EmptyState title="Chưa có lần nạp dữ liệu nào" />
          ) : (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Lần nạp dữ liệu gần đây"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Job
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Nguồn / Tệp
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Loại
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Tạo lúc
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobsQuery.data.map((job) => (
                    <tr key={job.ingestion_job_id}>
                      <td className="px-3 py-2.5 font-mono font-semibold text-[#b91830]">
                        <Link
                          href={`/data/ingestion?jobId=${job.ingestion_job_id}`}
                          className="hover:underline"
                        >
                          #{job.ingestion_job_id}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 font-mono text-slate-800">
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
          title="Hoạt động Cleaning & Silver gần đây"
          subtitle="5 lượt chạy làm sạch mới nhất"
          right={
            <Link
              href="/data/cleaning"
              className="text-xs font-medium text-[#b91830] hover:underline"
            >
              Tất cả
            </Link>
          }
          bodyClassName="p-0"
        >
          {cleaningQuery.isPending ? (
            <TableSkeleton columns={5} label="Đang tải lịch sử làm sạch…" />
          ) : cleaningQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(
                  cleaningQuery.error,
                  'Không tải được lịch sử làm sạch.'
                )}
                retrying={cleaningQuery.isFetching}
                onRetry={() => void cleaningQuery.refetch()}
              />
            </div>
          ) : cleaningQuery.data.length === 0 ? (
            <EmptyState title="Chưa có lượt chạy Cleaning nào" />
          ) : (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Hoạt động làm sạch gần đây"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Lĩnh vực / Entity
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Cleaning
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Xuất bản Silver
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Đạt / Cách ly
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Bắt đầu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cleaningQuery.data.map((run) => (
                    <tr key={run.run_id}>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-900">{run.entity}</span>
                        <span className="ml-1.5 text-slate-500">({domainLabel(run.domain)})</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag tone={statusTone(run.cleaning_status)}>
                          {statusLabel(run.cleaning_status)}
                        </Tag>
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag tone={statusTone(run.publication_status)}>
                          {statusLabel(run.publication_status)}
                        </Tag>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {formatNumber(run.records_passed)} / {formatNumber(run.records_quarantined)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {formatDateTime(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      {/* Lối tắt vận hành nhanh */}
      <Card title="Lối tắt quy trình vận hành">
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-5">
          {[
            { href: '/data/sources', label: 'Nguồn dữ liệu' },
            { href: '/data/datasets', label: 'Bộ dữ liệu Bronze' },
            { href: '/data/ingestion', label: 'Nạp dữ liệu' },
            { href: '/data/auto-pipeline', label: 'Giám sát pipeline' },
            { href: '/data/profiles', label: 'Cấu hình Silver (Profiles)' },
            { href: '/data/cleaning', label: 'Làm sạch & Kiểm tra' },
            { href: '/data/quarantine', label: 'Hồ sơ cách ly' },
            { href: '/data/silver', label: 'Phiên bản Silver' },
            { href: '/data/catalog', label: 'Data Catalog' },
            { href: '/data/lineage', label: 'Data Lineage' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-10 items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 font-medium text-foreground hover:bg-muted"
            >
              {item.label}
              <ArrowRight className="size-3 shrink-0 text-primary" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
