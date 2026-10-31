'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Play, RefreshCw, X } from 'lucide-react'

import { API_CreateIngestionJob, API_ListDataSources, API_ListIngestionJobs } from '@/api/api_data'
import { getApiErrorMessage, getApiRequestId } from '@/api/http'
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
  statusTone,
} from '@/components/page/page-parts'
import type { IngestionJob } from '@/types/data'

const ACTIVE_STATUSES = new Set(['QUEUED', 'RUNNING'])
const POLL_INTERVAL_MS = 5000

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30'

export function isJobActive(job: IngestionJob): boolean {
  return ACTIVE_STATUSES.has(job.status.toUpperCase())
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
        'Chọn nguồn dữ liệu, nhập dataset_id (số nguyên dương) và tên file / bảng nguồn.'
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
      subtitle="POST /api/v1/ingestion/jobs · API trả 202 ngay, job chạy nền và cập nhật trạng thái"
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
            Dataset đích (dataset_id) *
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
            Dataset BRONZE cùng hệ thống nguồn với nguồn đã chọn.
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
            {formError ?? getApiErrorMessage(run.error, 'Không tạo được job nạp dữ liệu.')}
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
        description="Theo dõi từng lần nạp từ nguồn vào Bronze. Tác vụ dài: tạo job trả về mã job, giao diện tự hỏi lại trạng thái."
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
        <KpiCard label="Job gần đây" value={show(list.length)} hint="50 job mới nhất" />
        <KpiCard
          label="Thành công"
          value={show(success.length)}
          hint={
            finished.length
              ? `${((success.length / finished.length) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% job đã kết thúc`
              : 'Chưa có job kết thúc'
          }
          tone="emerald"
        />
        <KpiCard
          label="Đang chạy"
          value={show(running.length)}
          hint={running.length ? 'Tự cập nhật mỗi 5 giây' : 'Không có job đang chạy'}
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
        title="Lịch sử job nạp dữ liệu"
        subtitle="ingestion_job · mới nhất trước"
        right={<Tag tone="amber">Bronze · MinIO</Tag>}
        bodyClassName="p-0"
      >
        {jobs.isPending ? (
          <LoadingState />
        ) : jobs.isError ? (
          <div className="p-4">
            <ErrorState
              requestId={getApiRequestId(jobs.error)}
              message={getApiErrorMessage(jobs.error, 'Không tải được lịch sử nạp dữ liệu.')}
              onRetry={() => void jobs.refetch()}
            />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Chưa có job nạp dữ liệu"
            description="Bấm “Chạy nạp dữ liệu” để tạo job đầu tiên."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {[
                    'Job',
                    'Nguồn',
                    'Dataset',
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
                  <tr key={job.ingestion_job_id}>
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                      #{job.ingestion_job_id}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">#{job.data_source_id}</td>
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
                        <Tag tone={statusTone(job.status)}>{job.status}</Tag>
                        {job.stage && (
                          <span className="font-mono text-[10px] text-slate-400">{job.stage}</span>
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
              Job #{latestFailed.ingestion_job_id} thất bại — nguồn #{latestFailed.data_source_id}
            </p>
            <p className="font-mono text-[11px]">
              {latestFailed.stage ?? 'FAILED'}
              {latestFailed.error_message ? ` · ${latestFailed.error_message}` : ''}. Kiểm tra nguồn
              rồi chạy lại.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
