'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, RefreshCw } from 'lucide-react'

import { API_ListCleaningRuns } from '@/api/admindata/cleaning'
import { API_ListIngestionWorkers } from '@/api/admindata/ingestion'
import { getApiErrorMessage } from '@/api/http'
import {
  API_GetIngestionMetrics,
  API_GetIngestionStats,
  API_ListIngestionJobs,
} from '@/api/shared/ingestion'
import { API_GetQualityIssueStats } from '@/api/shared/quality-issues'
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

import { domainLabel, formatSeconds, jobTypeLabel } from './data-helpers'

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

  const isRefreshing =
    statsQuery.isFetching ||
    metricsQuery.isFetching ||
    jobsQuery.isFetching ||
    workersQuery.isFetching ||
    issueStatsQuery.isFetching ||
    cleaningQuery.isFetching

  function refreshAll() {
    void statsQuery.refetch()
    void metricsQuery.refetch()
    void jobsQuery.refetch()
    void workersQuery.refetch()
    void issueStatsQuery.refetch()
    void cleaningQuery.refetch()
  }

  const workers = workersQuery.data ?? []
  const healthyWorkers = workers.filter((w) => w.status.toUpperCase() === 'HEALTHY')
  const offlineWorkers = workers.filter((w) => w.status.toUpperCase() !== 'HEALTHY')
  const busyWorkers = healthyWorkers.filter((w) => w.current_job_id != null)

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Tổng quan']}
        title="Bảng điều khiển vận hành Data Lake"
        description="Theo dõi số liệu thực tế từ hệ thống Ingestion, Worker, Cleaning Pipeline và Yêu cầu xử lý dữ liệu lỗi."
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
              href="/data/ingestion"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Quản lý Ingestion
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </>
        }
      />

      {/* Thống kê Ingestion toàn hệ thống */}
      <section aria-labelledby="dash-ingestion-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="dash-ingestion-heading" className="text-sm font-semibold text-slate-900">
            Thống kê Ingestion Jobs
          </h2>
          <Link
            href="/data/ingestion"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Xem danh sách job
          </Link>
        </div>
        {statsQuery.isPending ? (
          <LoadingState label="Đang tải thống kê ingestion…" />
        ) : statsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(statsQuery.error, 'Không tải được thống kê ingestion.')}
            onRetry={() => void statsQuery.refetch()}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Tổng số job" value={formatNumber(statsQuery.data.total)} />
            <KpiCard label="QUEUED" value={formatNumber(statsQuery.data.queued)} tone="amber" />
            <KpiCard label="RUNNING" value={formatNumber(statsQuery.data.running)} tone="amber" />
            <KpiCard
              label="RETRY_WAIT"
              value={formatNumber(statsQuery.data.retry_wait ?? 0)}
              tone="amber"
            />
            <KpiCard
              label="SUCCESS (Bronze)"
              value={formatNumber(statsQuery.data.success)}
              tone="emerald"
            />
            <KpiCard label="FAILED" value={formatNumber(statsQuery.data.failed)} tone="rose" />
          </div>
        )}
      </section>

      {/* Hiệu năng Ingestion, Worker & Quality Issues */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Hiệu năng xử lý Ingestion"
          right={
            <Link
              href="/data/ingestion"
              className="text-xs font-medium text-indigo-600 hover:underline"
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
              onRetry={() => void metricsQuery.refetch()}
            />
          ) : (
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Thời gian chờ trung bình</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {formatSeconds(metricsQuery.data.average_wait_seconds)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Thời gian xử lý trung bình</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {formatSeconds(metricsQuery.data.average_processing_seconds)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Tỷ lệ thất bại</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {metricsQuery.data.failure_rate_percent != null
                    ? `${metricsQuery.data.failure_rate_percent.toFixed(1)}%`
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Job chờ lâu nhất</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {formatSeconds(metricsQuery.data.oldest_queued_seconds)}
                </dd>
              </div>
            </dl>
          )}
        </Card>

        <Card
          title="Trạng thái Workers"
          right={
            <Link
              href="/data/workers"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Giám sát Worker
            </Link>
          }
        >
          {workersQuery.isPending ? (
            <LoadingState />
          ) : workersQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(workersQuery.error, 'Không tải được trạng thái worker.')}
              onRetry={() => void workersQuery.refetch()}
            />
          ) : (
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Tổng số worker đã ghi nhận</dt>
                <dd className="font-mono font-semibold text-slate-900">{workers.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Đang hoạt động (HEALTHY)</dt>
                <dd className="font-mono font-semibold text-emerald-700">
                  {healthyWorkers.length} ({busyWorkers.length} đang chạy job)
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Ngoại tuyến (OFFLINE)</dt>
                <dd className="font-mono font-semibold text-rose-700">{offlineWorkers.length}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card
          title="Yêu cầu xử lý dữ liệu lỗi"
          right={
            <Link
              href="/data/quality"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
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
              onRetry={() => void issueStatsQuery.refetch()}
            />
          ) : (
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Tổng yêu cầu</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {formatNumber(issueStatsQuery.data.total)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Đang mở (Cần xử lý)</dt>
                <dd className="font-mono font-semibold text-amber-700">
                  {formatNumber(issueStatsQuery.data.assigned)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Chờ xác minh</dt>
                <dd className="font-mono font-semibold text-sky-700">
                  {formatNumber(issueStatsQuery.data.pending_verification)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Đã xác minh</dt>
                <dd className="font-mono font-semibold text-emerald-700">
                  {formatNumber(issueStatsQuery.data.verified)}
                </dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      {/* Lối tắt vận hành nhanh */}
      <Card title="Lối tắt quy trình vận hành">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { href: '/data/sources', label: 'Nguồn dữ liệu' },
            { href: '/data/datasets', label: 'Bộ dữ liệu Bronze' },
            { href: '/data/ingestion', label: 'Nạp dữ liệu' },
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
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              {item.label}
              <ArrowRight className="size-3 text-slate-400" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </Card>

      {/* Hai bảng hoạt động gần đây */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Lần nạp dữ liệu gần đây"
          subtitle="5 job mới nhất từ backend"
          right={
            <Link
              href="/data/ingestion"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Tất cả
            </Link>
          }
          bodyClassName="p-0"
        >
          {jobsQuery.isPending ? (
            <LoadingState />
          ) : jobsQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(jobsQuery.error, 'Không tải được danh sách job.')}
                onRetry={() => void jobsQuery.refetch()}
              />
            </div>
          ) : jobsQuery.data.length === 0 ? (
            <EmptyState title="Chưa có lần nạp dữ liệu nào" />
          ) : (
            <div className="overflow-x-auto">
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
                      <td className="px-3 py-2.5 font-mono font-semibold text-indigo-600">
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
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Tất cả
            </Link>
          }
          bodyClassName="p-0"
        >
          {cleaningQuery.isPending ? (
            <LoadingState />
          ) : cleaningQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(
                  cleaningQuery.error,
                  'Không tải được lịch sử làm sạch.'
                )}
                onRetry={() => void cleaningQuery.refetch()}
              />
            </div>
          ) : cleaningQuery.data.length === 0 ? (
            <EmptyState title="Chưa có lượt chạy Cleaning nào" />
          ) : (
            <div className="overflow-x-auto">
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
    </div>
  )
}
