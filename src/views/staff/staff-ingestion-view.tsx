'use client'

import { Fragment, useMemo, useState } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  Upload,
} from 'lucide-react'

import { getApiErrorMessage, getErrorMessageForCode } from '@/api/http'
import { API_ListDatasets } from '@/api/shared/datasets'
import {
  API_GetIngestionJob,
  API_GetIngestionMetrics,
  API_GetIngestionStats,
  API_ListIngestionAttempts,
  API_ListIngestionJobs,
} from '@/api/shared/ingestion'
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
import type { IngestionJobStatusFilter } from '@/types/ingestion'
import type { StaffContext } from '@/types/staff-context'

import { StaffContextGate } from './staff-context-gate'
import {
  BRONZE_SUCCESS_MESSAGE,
  INGESTION_POLL_INTERVAL_MS,
  extractSafeValidationDetails,
  isIngestionJobActive,
  jobTypeLabel,
} from './staff-helpers'

const PAGE_SIZE = 20

const JOB_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'QUEUED', label: 'Đang chờ (QUEUED)' },
  { value: 'RUNNING', label: 'Đang chạy (RUNNING)' },
  { value: 'RETRY_WAIT', label: 'Chờ thử lại (RETRY_WAIT)' },
  { value: 'SUCCESS', label: 'Thành công (SUCCESS)' },
  { value: 'FAILED', label: 'Không thành công (FAILED)' },
  { value: 'REJECTED', label: 'Bị từ chối (REJECTED)' },
] as const

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)} giây`
  return `${(seconds / 60).toFixed(1)} phút`
}

function JobDetailSection({
  jobId,
  datasetNameMap,
}: {
  jobId: number
  datasetNameMap: Map<number, string>
}) {
  const jobQuery = useQuery({
    queryKey: ['ingestion-jobs', jobId],
    queryFn: () => API_GetIngestionJob(jobId),
    refetchInterval: (query) =>
      query.state.data && isIngestionJobActive(query.state.data.status)
        ? INGESTION_POLL_INTERVAL_MS
        : false,
  })

  const attemptsQuery = useQuery({
    queryKey: ['ingestion-jobs', jobId, 'attempts'],
    queryFn: () => API_ListIngestionAttempts(jobId),
    refetchInterval: () =>
      jobQuery.data && isIngestionJobActive(jobQuery.data.status)
        ? INGESTION_POLL_INTERVAL_MS
        : false,
  })

  if (jobQuery.isPending) {
    return <LoadingState label={`Đang tải chi tiết lần nạp #${jobId}…`} />
  }

  if (jobQuery.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(jobQuery.error, 'Không tải được chi tiết lần nạp dữ liệu.')}
        onRetry={() => void jobQuery.refetch()}
      />
    )
  }

  const job = jobQuery.data
  const status = job.status.toUpperCase()
  const datasetName = datasetNameMap.get(job.dataset_id)
  const validationDetails = extractSafeValidationDetails(job.validation_report)

  return (
    <div className="space-y-4 text-xs" id={`staff-ingestion-job-${jobId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">
            Chi tiết lần nạp #{job.ingestion_job_id}
            {job.attempt_number ? ` · Lần thử #${job.attempt_number}` : ''}
          </p>
          <p className="text-slate-500">
            Bộ dữ liệu: {datasetName ? `${datasetName} (#${job.dataset_id})` : `#${job.dataset_id}`}{' '}
            · Tệp nguồn: <span className="font-mono text-slate-700">{job.source_table ?? '—'}</span>
          </p>
        </div>
        <Tag tone={statusTone(status)}>{statusLabel(status)}</Tag>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Giai đoạn hiện tại</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {job.stage ? statusLabel(job.stage) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Số dòng đọc / ghi / loại</dt>
          <dd className="mt-0.5 font-mono text-slate-900">
            {formatNumber(job.rows_read)} / {formatNumber(job.rows_written)} /{' '}
            {formatNumber(job.rows_rejected)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Bắt đầu</dt>
          <dd className="mt-0.5 text-slate-900">{formatDateTime(job.started_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Kết thúc</dt>
          <dd className="mt-0.5 text-slate-900">{formatDateTime(job.finished_at)}</dd>
        </div>
      </dl>

      {status === 'SUCCESS' && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{BRONZE_SUCCESS_MESSAGE}</span>
        </div>
      )}

      {job.quality_issue_id && (
        <div className="flex items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-900">
          <span>Lần nạp này gắn với yêu cầu xử lý dữ liệu lỗi.</span>
          <Link
            href={`/staff/quality-issues/${job.quality_issue_id}`}
            className="font-semibold text-indigo-700 hover:underline"
          >
            Mở yêu cầu xử lý
          </Link>
        </div>
      )}

      {(status === 'FAILED' || status === 'REJECTED' || job.error_message) && (
        <div
          role="alert"
          className="space-y-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-800"
        >
          <div className="flex items-center gap-1.5 font-semibold text-rose-900">
            <CircleAlert className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>Thông tin lỗi</span>
          </div>
          <p>
            {getErrorMessageForCode(job.error_message) ??
              'Lần nạp dữ liệu không thành công. Nếu là lỗi nội dung tệp, vui lòng chỉnh sửa tệp nguồn và tải lên bản mới.'}
          </p>
          {validationDetails.length > 0 && (
            <ul className="list-disc pl-4 text-rose-700">
              {validationDetails.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Lịch sử các lần thử (Attempts) */}
      <div className="space-y-2">
        <p className="font-semibold text-slate-800">Chuỗi các lần chạy (Attempts)</p>
        {attemptsQuery.isPending ? (
          <LoadingState label="Đang tải lịch sử lần chạy…" />
        ) : attemptsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              attemptsQuery.error,
              'Không tải được lịch sử các lần chạy.'
            )}
            onRetry={() => void attemptsQuery.refetch()}
          />
        ) : attemptsQuery.data.length === 0 ? (
          <p className="text-slate-500">Chưa có thông tin chuỗi lần chạy.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Lần thử
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Job ID
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Giai đoạn
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Thời gian tạo
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Ghi chú lỗi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attemptsQuery.data.map((attempt) => (
                  <tr key={attempt.ingestion_job_id}>
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                      #{attempt.attempt_number}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">
                      #{attempt.ingestion_job_id}
                    </td>
                    <td className="px-3 py-2">
                      <Tag tone={statusTone(attempt.status)}>{statusLabel(attempt.status)}</Tag>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {attempt.stage ? statusLabel(attempt.stage) : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {formatDateTime(attempt.created_at)}
                    </td>
                    <td className="px-3 py-2 text-rose-700">
                      {attempt.error_message
                        ? (getErrorMessageForCode(attempt.error_message) ??
                          'Không thành công trong lần thử này')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function IngestionContent({
  context,
  initialJobId,
}: {
  context: StaffContext
  initialJobId?: number
}) {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [datasetIdFilter, setDatasetIdFilter] = useState<string>('')
  const [mineOnly, setMineOnly] = useState(false)
  const [offset, setOffset] = useState(0)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(initialJobId ?? null)

  const parsedDatasetId = datasetIdFilter ? Number(datasetIdFilter) : undefined

  const statsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'stats'],
    queryFn: API_GetIngestionStats,
  })

  const metricsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'metrics'],
    queryFn: API_GetIngestionMetrics,
  })

  const datasetsQuery = useQuery({
    queryKey: ['datasets', { limit: 100, offset: 0 }],
    queryFn: () => API_ListDatasets({ limit: 100, offset: 0 }),
  })

  const jobsQuery = useQuery({
    queryKey: [
      'ingestion-jobs',
      {
        limit: PAGE_SIZE,
        offset,
        status: statusFilter || undefined,
        dataset_id: parsedDatasetId,
        mine_only: mineOnly,
      },
    ],
    queryFn: () =>
      API_ListIngestionJobs({
        limit: PAGE_SIZE,
        offset,
        status: (statusFilter as IngestionJobStatusFilter) || undefined,
        dataset_id: parsedDatasetId,
        mine_only: mineOnly,
      }),
    refetchInterval: (query) =>
      query.state.data?.some((job) => isIngestionJobActive(job.status))
        ? INGESTION_POLL_INTERVAL_MS
        : false,
  })

  const datasetNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const ds of datasetsQuery.data ?? []) {
      map.set(ds.dataset_id, ds.dataset_name)
    }
    return map
  }, [datasetsQuery.data])

  const jobs = jobsQuery.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Không gian nhân viên', 'Lịch sử nạp dữ liệu']}
        title="Lịch sử nạp dữ liệu"
        description="Theo dõi tiến độ xử lý tệp vào Bronze, kết quả đọc/ghi dòng và lịch sử các lần chạy tự động."
        actions={
          <>
            <Button
              onClick={() => {
                void jobsQuery.refetch()
                void statsQuery.refetch()
                void metricsQuery.refetch()
              }}
              disabled={jobsQuery.isFetching}
              icon={
                <RefreshCw
                  className={`size-3.5 ${jobsQuery.isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              }
            >
              Làm mới
            </Button>
            {context.can_upload && (
              <Link
                href="/staff/upload"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                Nạp dữ liệu mới
              </Link>
            )}
          </>
        }
      />

      {/* Thống kê & Chỉ số vận hành */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Tổng lần nạp"
          value={statsQuery.data ? formatNumber(statsQuery.data.total) : '—'}
        />
        <KpiCard
          label="Đang chờ"
          value={statsQuery.data ? formatNumber(statsQuery.data.queued) : '—'}
          tone="amber"
        />
        <KpiCard
          label="Đang chạy"
          value={statsQuery.data ? formatNumber(statsQuery.data.running) : '—'}
          tone="amber"
        />
        <KpiCard
          label="Chờ thử lại"
          value={statsQuery.data ? formatNumber(statsQuery.data.retry_wait ?? 0) : '—'}
          tone="amber"
        />
        <KpiCard
          label="Thành công"
          value={statsQuery.data ? formatNumber(statsQuery.data.success) : '—'}
          tone="emerald"
        />
        <KpiCard
          label="Thất bại"
          value={statsQuery.data ? formatNumber(statsQuery.data.failed) : '—'}
          tone="rose"
        />
      </div>

      {metricsQuery.data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label="Thời gian chờ trung bình"
            value={formatDuration(metricsQuery.data.average_wait_seconds)}
          />
          <KpiCard
            label="Thời gian xử lý trung bình"
            value={formatDuration(metricsQuery.data.average_processing_seconds)}
          />
          <KpiCard
            label="Tỷ lệ thất bại"
            value={
              metricsQuery.data.failure_rate_percent != null
                ? `${metricsQuery.data.failure_rate_percent.toFixed(1)}%`
                : '—'
            }
          />
        </div>
      )}

      {/* Bộ lọc */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div className="space-y-1">
            <label htmlFor="filter-job-status" className="block font-semibold text-slate-700">
              Trạng thái
            </label>
            <select
              id="filter-job-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900"
            >
              {JOB_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-job-dataset" className="block font-semibold text-slate-700">
              Bộ dữ liệu
            </label>
            <select
              id="filter-job-dataset"
              value={datasetIdFilter}
              onChange={(e) => {
                setDatasetIdFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 min-w-[200px] rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900"
            >
              <option value="">Tất cả bộ dữ liệu</option>
              {(datasetsQuery.data ?? []).map((ds) => (
                <option key={ds.dataset_id} value={String(ds.dataset_id)}>
                  {ds.dataset_name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => {
                setMineOnly(e.target.checked)
                setOffset(0)
              }}
              className="size-4 accent-indigo-600"
            />
            Chỉ lần nạp của tôi
          </label>
        </div>
      </Card>

      {/* Bảng danh sách */}
      <Card
        title="Danh sách lần nạp dữ liệu"
        subtitle="Bấm vào một dòng để xem chi tiết và lịch sử các lần thử"
        bodyClassName="p-0"
      >
        {jobsQuery.isPending ? (
          <LoadingState label="Đang tải danh sách lần nạp dữ liệu…" />
        ) : jobsQuery.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(
                jobsQuery.error,
                'Không tải được danh sách lần nạp dữ liệu.'
              )}
              onRetry={() => void jobsQuery.refetch()}
            />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="Không có lần nạp dữ liệu phù hợp"
            description="Thử thay đổi bộ lọc hoặc bắt đầu tải tệp mới tại mục Nạp dữ liệu."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {[
                      'Job ID',
                      'Ngày tạo',
                      'Tệp / Nguồn',
                      'Bộ dữ liệu',
                      'Loại',
                      'Giai đoạn',
                      'Trạng thái',
                      'Đọc / Ghi / Loại',
                    ].map((heading) => (
                      <th key={heading} scope="col" className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const isSelected = selectedJobId === job.ingestion_job_id
                    const dsName = datasetNameMap.get(job.dataset_id)
                    return (
                      <Fragment key={job.ingestion_job_id}>
                        <tr className={isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              aria-expanded={isSelected}
                              onClick={() =>
                                setSelectedJobId(isSelected ? null : job.ingestion_job_id)
                              }
                              className="font-mono font-semibold text-indigo-600 hover:underline"
                            >
                              Chi tiết #{job.ingestion_job_id}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {formatDateTime(job.created_at)}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-2.5 font-mono text-slate-900">
                            {job.source_table ?? '—'}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-700">
                            {dsName ?? `#${job.dataset_id}`}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {jobTypeLabel(job.job_type)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {job.stage ? statusLabel(job.stage) : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <Tag tone={statusTone(job.status)}>{statusLabel(job.status)}</Tag>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-700">
                            {formatNumber(job.rows_read)} / {formatNumber(job.rows_written)} /{' '}
                            {formatNumber(job.rows_rejected)}
                          </td>
                        </tr>
                        {isSelected && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={8} className="p-4">
                              <JobDetailSection
                                jobId={job.ingestion_job_id}
                                datasetNameMap={datasetNameMap}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>
                Hiển thị {jobs.length} lần nạp (từ vị trí {offset + 1})
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  disabled={offset === 0 || jobsQuery.isFetching}
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                >
                  Trang trước
                </Button>
                <Button
                  disabled={jobs.length < PAGE_SIZE || jobsQuery.isFetching}
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

      {/* Nếu initialJobId không nằm ở trang hiện tại nhưng được chọn từ URL */}
      {selectedJobId !== null && !jobs.some((j) => j.ingestion_job_id === selectedJobId) && (
        <Card title={`Chi tiết lần nạp #${selectedJobId}`}>
          <JobDetailSection jobId={selectedJobId} datasetNameMap={datasetNameMap} />
        </Card>
      )}
    </div>
  )
}

export function StaffIngestionView({ initialJobId }: { initialJobId?: number }) {
  return (
    <StaffContextGate>
      {(context) => <IngestionContent context={context} initialJobId={initialJobId} />}
    </StaffContextGate>
  )
}
