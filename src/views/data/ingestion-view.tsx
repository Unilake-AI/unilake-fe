'use client'

import { Fragment, useState } from 'react'
import type { FormEvent } from 'react'

import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Play, RefreshCw, X } from 'lucide-react'

import { API_RunCleaning } from '@/api/data-operations/cleaning'
import { API_CreateIngestionJob } from '@/api/data-operations/ingestion'
import { getApiErrorMessage, getErrorMessageForCode } from '@/api/http'
import { API_ListDataSources } from '@/api/shared/data-sources'
import { API_GetIngestionJob, API_ListIngestionJobs } from '@/api/shared/ingestion'
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
import type { IngestionJob } from '@/types/data'

const ACTIVE_STATUSES = new Set(['QUEUED', 'RUNNING'])
const POLL_INTERVAL_MS = 5000
const INGESTION_FAILURE = 'Không thể nạp dữ liệu. Vui lòng kiểm tra nguồn và thử lại.'

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30'

export function isJobActive(job: IngestionJob): boolean {
  return ACTIVE_STATUSES.has(job.status.toUpperCase())
}

function JobDetails({ jobId }: { jobId: number }) {
  const [profileId, setProfileId] = useState('')
  const job = useQuery({
    queryKey: ['ingestion-jobs', jobId],
    queryFn: () => API_GetIngestionJob(jobId),
    refetchInterval: (query) =>
      query.state.data && isJobActive(query.state.data) ? POLL_INTERVAL_MS : false,
  })
  const cleaningKey = ['ingestion-cleaning', jobId]
  const cleaning = useMutation({
    mutationKey: cleaningKey,
    mutationFn: (profile: string) => API_RunCleaning(jobId, profile),
  })
  const isCleaning = useIsMutating({ mutationKey: cleaningKey }) > 0

  if (job.isPending) return <LoadingState />
  if (job.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(job.error, 'Không tải được thông tin lần nạp dữ liệu.')}
        onRetry={() => void job.refetch()}
      />
    )
  }

  return (
    <div className="space-y-2" id={`ingestion-job-${jobId}`}>
      <p className="font-semibold text-slate-900">Chi tiết lần nạp #{jobId}</p>
      <p className="text-slate-700">
        <Tag tone={statusTone(job.data.status)}>{statusLabel(job.data.status)}</Tag> · Giai đoạn{' '}
        {job.data.stage ? statusLabel(job.data.stage) : '—'} · Người yêu cầu{' '}
        {job.data.requested_by ?? '—'}
      </p>
      <p className="text-slate-700">
        Đã ghi {formatNumber(job.data.rows_written)} dòng · Đã loại{' '}
        {formatNumber(job.data.rows_rejected)} dòng
      </p>
      {job.data.error_message && (
        <p className="text-rose-700">
          {getErrorMessageForCode(job.data.error_message) ?? INGESTION_FAILURE}
        </p>
      )}
      {job.data.status.toUpperCase() === 'SUCCESS' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="space-y-1 text-slate-700">
            <span className="block">Mã cấu hình làm sạch</span>
            <input
              className={inputClass}
              maxLength={100}
              value={profileId}
              disabled={isCleaning}
              onChange={(event) => setProfileId(event.target.value)}
            />
          </label>
          <Button
            variant="primary"
            className="self-end"
            disabled={isCleaning || !profileId.trim()}
            onClick={() => cleaning.mutate(profileId.trim())}
          >
            {isCleaning ? 'Đang làm sạch…' : 'Làm sạch dữ liệu'}
          </Button>
        </div>
      )}
      {cleaning.isError && (
        <ErrorState
          message={getApiErrorMessage(cleaning.error, 'Không chạy được tác vụ làm sạch.')}
        />
      )}
      {cleaning.data && (
        <p role="status" className="text-slate-700">
          <Tag tone={statusTone(cleaning.data.status)}>{statusLabel(cleaning.data.status)}</Tag> ·{' '}
          {formatNumber(cleaning.data.records_passed)} dòng đạt ·{' '}
          {formatNumber(cleaning.data.records_quarantined)} dòng cần kiểm tra ·{' '}
          {cleaning.data.publication
            ? 'Đã lưu kết quả làm sạch'
            : 'Chưa lưu kết quả vào bộ dữ liệu đã làm sạch'}
        </p>
      )}
    </div>
  )
}

function RunJobPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [dataSourceId, setDataSourceId] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [sourceTable, setSourceTable] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const sources = useQuery({
    queryKey: ['datasources', { page: 1, page_size: 100, is_active: true }],
    queryFn: () => API_ListDataSources({ page: 1, page_size: 100, is_active: true }),
  })

  const run = useMutation({
    mutationFn: API_CreateIngestionJob,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ingestion-jobs'] })
      onClose()
    },
  })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dataset = Number(datasetId)
    if (!dataSourceId || !Number.isInteger(dataset) || dataset <= 0 || !sourceTable.trim()) {
      setFormError(
        'Vui lòng chọn nguồn dữ liệu, nhập mã bộ dữ liệu lớn hơn 0 và điền tên tệp hoặc bảng nguồn.'
      )
      return
    }
    setFormError(null)
    run.mutate({
      data_source_id: Number(dataSourceId),
      dataset_id: dataset,
      source_table: sourceTable.trim(),
    })
  }

  return (
    <Card
      title="Chạy nạp dữ liệu"
      subtitle="Bạn có thể theo dõi tiến độ sau khi bắt đầu nạp."
      right={
        <Button variant="ghost" onClick={onClose} aria-label="Đóng form chạy nạp dữ liệu">
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="job-source" className="block text-xs font-semibold text-slate-700">
            Nguồn dữ liệu *
          </label>
          <select
            id="job-source"
            className={inputClass}
            value={dataSourceId}
            onChange={(event) => setDataSourceId(event.target.value)}
          >
            <option value="">
              {sources.isPending ? 'Đang tải…' : 'Chọn nguồn đang hoạt động'}
            </option>
            {sources.data?.items.map((source) => (
              <option key={source.data_source_id} value={source.data_source_id}>
                #{source.data_source_id} · {source.source_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="job-dataset" className="block text-xs font-semibold text-slate-700">
            Mã bộ dữ liệu đích *
          </label>
          <input
            id="job-dataset"
            inputMode="numeric"
            className={`${inputClass} font-mono`}
            value={datasetId}
            placeholder="vd. 2"
            onChange={(event) => setDatasetId(event.target.value)}
          />
          <p className="text-[11px] text-slate-400">
            Nhập mã của bộ dữ liệu thô thuộc hệ thống nguồn đã chọn.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="job-table" className="block text-xs font-semibold text-slate-700">
            File / bảng nguồn *
          </label>
          <input
            id="job-table"
            className={`${inputClass} font-mono`}
            value={sourceTable}
            placeholder="02-academic.csv"
            onChange={(event) => setSourceTable(event.target.value)}
          />
        </div>
        {(formError || run.isError) && (
          <p role="alert" className="text-xs text-rose-600 md:col-span-3">
            {formError ??
              getApiErrorMessage(run.error, 'Không thể bắt đầu nạp dữ liệu. Vui lòng thử lại.')}
          </p>
        )}
        <div className="flex justify-end md:col-span-3">
          <button
            type="submit"
            disabled={run.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {run.isPending ? 'Đang gửi…' : 'Chạy nạp dữ liệu'}
          </button>
        </div>
      </form>
    </Card>
  )
}

export function IngestionView() {
  const [showRun, setShowRun] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  const jobs = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: () => API_ListIngestionJobs({ limit: 50 }),
    // Job chạy nền: còn job QUEUED/RUNNING thì tự hỏi lại trạng thái.
    refetchInterval: (query) => (query.state.data?.some(isJobActive) ? POLL_INTERVAL_MS : false),
  })

  const list = jobs.data ?? []
  const finished = list.filter((job) => !isJobActive(job))
  const success = list.filter((job) => job.status.toUpperCase() === 'SUCCESS')
  const failed = list.filter((job) => job.status.toUpperCase() === 'FAILED')
  const running = list.filter(isJobActive)
  const rowsWritten = list.reduce((sum, job) => sum + (job.rows_written ?? 0), 0)
  const rowsRejected = list.reduce((sum, job) => sum + (job.rows_rejected ?? 0), 0)
  const latestFailed = failed[0]
  const show = (value: number) => (jobs.data ? formatNumber(value) : '—')

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Nạp dữ liệu']}
        title="Giám sát nạp dữ liệu"
        description="Theo dõi tiến độ và kết quả của từng lần nạp dữ liệu. Tiến độ được cập nhật tự động."
        actions={
          <>
            <Button
              onClick={() => void jobs.refetch()}
              disabled={jobs.isFetching}
              icon={
                <RefreshCw
                  className={`size-3.5 ${jobs.isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              }
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowRun(true)}
              icon={<Play className="size-3.5" aria-hidden="true" />}
            >
              Chạy nạp dữ liệu
            </Button>
          </>
        }
      />

      {showRun && <RunJobPanel onClose={() => setShowRun(false)} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Lần nạp gần đây" value={show(list.length)} hint="50 lần nạp gần nhất" />
        <KpiCard
          label="Thành công"
          value={show(success.length)}
          hint={
            finished.length
              ? `${((success.length / finished.length) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% lần nạp đã kết thúc`
              : 'Chưa có lần nạp nào kết thúc'
          }
          tone="emerald"
        />
        <KpiCard
          label="Đang chạy"
          value={show(running.length)}
          hint={running.length ? 'Tự cập nhật mỗi 5 giây' : 'Hiện không có lần nạp nào đang chạy'}
          tone="amber"
        />
        <KpiCard
          label="Dòng đã ghi"
          value={show(rowsWritten)}
          hint={`Bị loại: ${formatNumber(rowsRejected)} dòng`}
          tone={failed.length ? 'rose' : 'slate'}
        />
      </div>

      <Card
        title="Lịch sử nạp dữ liệu"
        subtitle="Mới nhất trước"
        right={<Tag tone="amber">Dữ liệu thô</Tag>}
        bodyClassName="p-0"
      >
        {jobs.isPending ? (
          <LoadingState />
        ) : jobs.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(jobs.error, 'Không tải được lịch sử nạp dữ liệu.')}
              onRetry={() => void jobs.refetch()}
            />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Chưa có lần nạp dữ liệu nào"
            description="Bấm “Chạy nạp dữ liệu” để bắt đầu."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {[
                    'Lần nạp',
                    'Nguồn',
                    'Bộ dữ liệu',
                    'File / bảng',
                    'Bắt đầu',
                    'Kết thúc',
                    'Trạng thái',
                    'Đọc',
                    'Ghi',
                    'Loại',
                  ].map((head) => (
                    <th key={head} scope="col" className="px-3 py-2 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((job) => (
                  <Fragment key={job.ingestion_job_id}>
                    <tr>
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                        <Button
                          variant="ghost"
                          aria-label={`Chi tiết lần nạp #${job.ingestion_job_id}`}
                          aria-expanded={selectedJobId === job.ingestion_job_id}
                          onClick={() =>
                            setSelectedJobId(
                              selectedJobId === job.ingestion_job_id ? null : job.ingestion_job_id
                            )
                          }
                        >
                          #{job.ingestion_job_id}
                        </Button>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                        #{job.data_source_id}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">#{job.dataset_id}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {job.source_table ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {formatDateTime(job.started_at ?? job.created_at)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        {formatDateTime(job.finished_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col items-start gap-0.5">
                          <Tag tone={statusTone(job.status)}>{statusLabel(job.status)}</Tag>
                          {job.stage && (
                            <span className="font-mono text-[10px] text-slate-400">
                              {statusLabel(job.stage)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {formatNumber(job.rows_read)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {formatNumber(job.rows_written)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {formatNumber(job.rows_rejected)}
                      </td>
                    </tr>
                    {selectedJobId === job.ingestion_job_id && (
                      <tr>
                        <td colSpan={10} className="bg-slate-50 px-4 py-3">
                          <JobDetails jobId={job.ingestion_job_id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {latestFailed && (
        <div
          role="status"
          className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs"
        >
          <CircleAlert className="mt-px size-4 shrink-0 text-rose-600" aria-hidden="true" />
          <div className="text-rose-700">
            <p className="font-semibold">
              Lần nạp #{latestFailed.ingestion_job_id} không thành công
            </p>
            <p>{getErrorMessageForCode(latestFailed.error_message) ?? INGESTION_FAILURE}</p>
          </div>
        </div>
      )}
    </div>
  )
}
