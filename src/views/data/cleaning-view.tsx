'use client'

import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  FileText,
  Play,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  API_GetCleaningReport,
  API_GetCleaningRun,
  API_ListCleaningRuns,
  API_PreviewCleaning,
  API_RunCleaning,
} from '@/api/admindata/cleaning'
import { API_ListProfiles } from '@/api/admindata/profiles'
import { getApiErrorMessage } from '@/api/http'
import { API_ListIngestionJobs } from '@/api/shared/ingestion'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CleaningPreviewResponse, ManualCleaningResponse } from '@/types/cleaning'

import { domainLabel, formatCellValue } from './data-helpers'

const PAGE_SIZE = 20

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30'

function SampleRowsTable({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 p-3 text-xs text-slate-500">
        {title}: Không có dòng mẫu.
      </div>
    )
  }
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-800">
        {title} ({rows.length} dòng mẫu)
      </p>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500">
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col" className="px-2.5 py-1.5 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="max-w-[200px] truncate px-2.5 py-1.5 font-mono text-slate-700"
                  >
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CleaningExecutionOutcome({ result }: { result: ManualCleaningResponse }) {
  const pubStatus =
    typeof result.publication?.status === 'string' ? result.publication.status.toUpperCase() : null
  const snapshotId =
    typeof result.publication?.snapshot_id === 'string' ? result.publication.snapshot_id : null
  const statusUpper = result.status.toUpperCase()
  const isPublished = pubStatus === 'PUBLISHED'
  const isPartial = pubStatus === 'PUBLISHED_WITH_QUARANTINE'

  return (
    <Card
      title={`Kết quả chạy Cleaning (Run ${result.run_id})`}
      right={<Tag tone={statusTone(result.status)}>{statusLabel(result.status)}</Tag>}
    >
      <div className="space-y-4 text-xs">
        {isPublished ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>
              Đã làm sạch và xuất bản phiên bản Silver thành công
              {snapshotId ? ` (Snapshot ${snapshotId})` : ''}.
            </span>
          </div>
        ) : isPartial ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"
          >
            <CircleAlert className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>
              Đã xuất bản một phần sang Silver nhưng có {formatNumber(result.records_quarantined)}{' '}
              bản ghi bị cách ly (Quarantine){snapshotId ? ` · Snapshot ${snapshotId}` : ''}.
            </span>
          </div>
        ) : (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900"
          >
            <CircleAlert className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>
              Trạng thái: <strong>{statusLabel(statusUpper)}</strong> · Trạng thái xuất bản Silver:{' '}
              <strong>{pubStatus ? statusLabel(pubStatus) : 'Chưa xuất bản'}</strong>. Dữ liệu chưa
              được công bố thành phiên bản Silver hoàn chỉnh.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Đã đọc" value={formatNumber(result.records_read)} />
          <KpiCard label="Đạt chuẩn" value={formatNumber(result.records_passed)} tone="emerald" />
          <KpiCard
            label="Cách ly (Quarantine)"
            value={formatNumber(result.records_quarantined)}
            tone={result.records_quarantined > 0 ? 'amber' : 'slate'}
          />
          <KpiCard label="Gộp trùng" value={formatNumber(result.records_collapsed)} />
        </div>

        {result.issues.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              Vấn đề phát hiện ({result.issues.length})
            </p>
            <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
              {JSON.stringify(result.issues, null, 2)}
            </pre>
          </div>
        )}

        {result.quarantine_report && (
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">Tóm tắt Quarantine Report</p>
            <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
              {JSON.stringify(result.quarantine_report, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  )
}

function PreviewOutcome({ preview }: { preview: CleaningPreviewResponse }) {
  return (
    <Card
      title={`Bản xem trước (Preview) — Job #${preview.ingestion_job_id} · Profile ${preview.profile_id}`}
      subtitle="Xem trước không ghi dữ liệu vào Silver và không lưu bản ghi vào Quarantine"
      right={
        <Tag tone={preview.publication_checked ? 'emerald' : 'amber'}>
          {preview.publication_checked ? 'publication_checked: true' : 'publication_checked: false'}
        </Tag>
      }
    >
      <div className="space-y-4 text-xs">
        <div
          role="status"
          className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sky-900"
        >
          {preview.note ??
            'Đây chỉ là kết quả xem trước (Preview), chưa kiểm tra liên kết toàn bộ snapshot và chưa xuất bản Silver.'}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Đã đọc" value={formatNumber(preview.records_read)} />
          <KpiCard
            label="Qua làm sạch"
            value={formatNumber(preview.records_passed_cleaning)}
            tone="emerald"
          />
          <KpiCard
            label="Cách ly"
            value={formatNumber(preview.records_quarantined)}
            tone={preview.records_quarantined > 0 ? 'amber' : 'slate'}
          />
          <KpiCard label="Gộp trùng" value={formatNumber(preview.records_collapsed)} />
          <KpiCard
            label="Chuẩn hóa hợp lệ"
            value={formatNumber(preview.records_normalized)}
            tone="indigo"
          />
        </div>

        {(preview.cleaning_issues.length > 0 || preview.normalization_issues.length > 0) && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="font-semibold text-slate-800">
                Lỗi làm sạch ({preview.cleaning_issues.length})
              </p>
              <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
                {JSON.stringify(preview.cleaning_issues, null, 2)}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-800">
                Lỗi chuẩn hóa / ánh xạ ({preview.normalization_issues.length})
              </p>
              <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
                {JSON.stringify(preview.normalization_issues, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <SampleRowsTable title="Mẫu sau làm sạch (cleaned_sample)" rows={preview.cleaned_sample} />
        <SampleRowsTable
          title="Mẫu sau chuẩn hóa (normalized_sample)"
          rows={preview.normalized_sample}
        />
      </div>
    </Card>
  )
}

export function CleaningView({ initialJobId }: { initialJobId?: number }) {
  const queryClient = useQueryClient()
  const [selectedJobId, setSelectedJobId] = useState(initialJobId ? String(initialJobId) : '')
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [baseSnapshot, setBaseSnapshot] = useState('active')
  const [confirmRunOpen, setConfirmRunOpen] = useState(false)

  // Filters for Cleaning Runs history
  const [cleaningStatusFilter, setCleaningStatusFilter] = useState('')
  const [publicationStatusFilter, setPublicationStatusFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [loadReportRunId, setLoadReportRunId] = useState<string | null>(null)

  const bronzeJobsQuery = useQuery({
    queryKey: ['ingestion-jobs', 'successful-bronze'],
    queryFn: () => API_ListIngestionJobs({ status: 'SUCCESS', limit: 100, offset: 0 }),
  })

  const profilesQuery = useQuery({
    queryKey: ['silver-profiles', { limit: 100, offset: 0 }],
    queryFn: () => API_ListProfiles({ limit: 100, offset: 0 }),
  })

  const runsQuery = useQuery({
    queryKey: [
      'cleaning-runs',
      {
        cleaning_status: cleaningStatusFilter || undefined,
        publication_status: publicationStatusFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      },
    ],
    queryFn: () =>
      API_ListCleaningRuns({
        cleaning_status: (cleaningStatusFilter as 'RUNNING' | 'COMPLETED' | 'FAILED') || undefined,
        publication_status:
          (publicationStatusFilter as
            | 'NOT_STARTED'
            | 'RUNNING'
            | 'PUBLISHED'
            | 'PUBLISHED_WITH_QUARANTINE'
            | 'BLOCKED'
            | 'FAILED'
            | 'SKIPPED') || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  })

  const runDetailQuery = useQuery({
    queryKey: ['cleaning-runs', 'detail', selectedRunId],
    queryFn: () => API_GetCleaningRun(selectedRunId!),
    enabled: selectedRunId !== null,
  })

  const runReportQuery = useQuery({
    queryKey: ['cleaning-runs', 'report', loadReportRunId],
    queryFn: () => API_GetCleaningReport(loadReportRunId!),
    enabled: loadReportRunId !== null,
    retry: false,
  })

  const previewMutation = useMutation({
    mutationFn: ({ jobId, profileId }: { jobId: number; profileId: string }) =>
      API_PreviewCleaning(jobId, profileId),
  })

  const runMutation = useMutation({
    mutationFn: ({
      jobId,
      profileId,
      snapshot,
    }: {
      jobId: number
      profileId: string
      snapshot: string | null
    }) => API_RunCleaning(jobId, profileId, snapshot),
    onSuccess: async (res) => {
      setConfirmRunOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['cleaning-runs'] })
      await queryClient.invalidateQueries({ queryKey: ['quarantine-records'] })
      await queryClient.invalidateQueries({ queryKey: ['silver-snapshots'] })
      toast.success(`Đã chạy Cleaning (Run ${res.run_id}).`)
    },
    onError: () => {
      setConfirmRunOpen(false)
    },
  })

  const parsedJobId = Number(selectedJobId)
  const selectedJob = (bronzeJobsQuery.data ?? []).find((j) => j.ingestion_job_id === parsedJobId)
  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data])
  const selectedProfile = profiles.find((p) => p.profile_id === selectedProfileId)

  const compatibleProfiles = useMemo(() => {
    if (!selectedJob) return profiles
    return profiles.filter((p) => p.definition.dataset_id === selectedJob.dataset_id)
  }, [profiles, selectedJob])

  const profileCompatible =
    !selectedJob ||
    !selectedProfile ||
    selectedProfile.definition.dataset_id === selectedJob.dataset_id

  const canExecute =
    Number.isInteger(parsedJobId) &&
    parsedJobId > 0 &&
    Boolean(selectedProfileId) &&
    profileCompatible &&
    !previewMutation.isPending &&
    !runMutation.isPending

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Làm sạch & Kiểm tra']}
        title="Cleaning, Validation & Xuất bản Silver"
        description="Xem trước kết quả làm sạch từ bản Bronze SUCCESS, sau đó thực thi Cleaning Pipeline và theo dõi lịch sử xuất bản Silver."
        actions={
          <Button
            onClick={() => {
              void bronzeJobsQuery.refetch()
              void profilesQuery.refetch()
              void runsQuery.refetch()
            }}
            icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
          >
            Làm mới
          </Button>
        }
      />

      {/* Workbench: Chọn Job Bronze + Silver Profile */}
      <Card
        title="Thực thi Preview & Cleaning Pipeline"
        subtitle="Chỉ hỗ trợ job Ingestion đã đạt SUCCESS (đã lưu Bronze) với Silver Profile tương thích."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="clean-job" className="block text-xs font-semibold text-slate-700">
              1. Chọn Bronze Job (SUCCESS) *
            </label>
            <select
              id="clean-job"
              className={inputClass}
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value)
                previewMutation.reset()
                runMutation.reset()
              }}
            >
              <option value="">
                {bronzeJobsQuery.isPending ? 'Đang tải job…' : 'Chọn job Bronze đã thành công'}
              </option>
              {(bronzeJobsQuery.data ?? []).map((job) => (
                <option key={job.ingestion_job_id} value={String(job.ingestion_job_id)}>
                  #{job.ingestion_job_id} · {job.source_table ?? '—'} (Dataset #{job.dataset_id})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clean-profile" className="block text-xs font-semibold text-slate-700">
              2. Chọn Silver Profile *
            </label>
            <select
              id="clean-profile"
              className={inputClass}
              value={selectedProfileId}
              onChange={(e) => {
                setSelectedProfileId(e.target.value)
                previewMutation.reset()
                runMutation.reset()
              }}
            >
              <option value="">
                {profilesQuery.isPending ? 'Đang tải profile…' : 'Chọn Silver Profile'}
              </option>
              {(compatibleProfiles.length > 0 ? compatibleProfiles : profiles).map((prof) => (
                <option key={prof.profile_id} value={prof.profile_id}>
                  {prof.profile_id} ({prof.definition.domain}/{prof.definition.entity} · Dataset #
                  {prof.definition.dataset_id})
                </option>
              ))}
            </select>
            {selectedJob && compatibleProfiles.length === 0 && profiles.length > 0 && (
              <p className="text-[11px] text-amber-700">
                Chưa có profile nào khớp Dataset #{selectedJob.dataset_id}. Hãy tạo profile phù hợp
                trước.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="clean-base-snapshot"
              className="block text-xs font-semibold text-slate-700"
            >
              Base Snapshot (tùy chọn khi chạy thật)
            </label>
            <input
              id="clean-base-snapshot"
              className={`${inputClass} font-mono`}
              value={baseSnapshot}
              onChange={(e) => setBaseSnapshot(e.target.value)}
              placeholder="active"
            />
          </div>
        </div>

        {!profileCompatible && (
          <p role="alert" className="mt-3 text-xs text-rose-600">
            Profile đã chọn không khớp với Dataset #{selectedJob?.dataset_id} của job này.
          </p>
        )}

        {(previewMutation.isError || runMutation.isError) && (
          <div role="alert" className="mt-3">
            <ErrorState
              message={getApiErrorMessage(
                runMutation.error ?? previewMutation.error,
                'Không thể thực thi Preview hoặc Cleaning Pipeline.'
              )}
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!canExecute}
            onClick={() =>
              previewMutation.mutate({ jobId: parsedJobId, profileId: selectedProfileId })
            }
            icon={<Eye className="size-3.5" aria-hidden="true" />}
          >
            {previewMutation.isPending ? 'Đang xem trước…' : 'Xem trước (Preview)'}
          </Button>
          <Button
            variant="primary"
            disabled={!canExecute}
            onClick={() => setConfirmRunOpen(true)}
            icon={<Play className="size-3.5" aria-hidden="true" />}
          >
            {runMutation.isPending ? 'Đang chạy Cleaning…' : 'Chạy Cleaning & Xuất bản Silver'}
          </Button>
        </div>
      </Card>

      {previewMutation.data && <PreviewOutcome preview={previewMutation.data} />}

      {runMutation.data && <CleaningExecutionOutcome result={runMutation.data} />}

      {/* Lịch sử Cleaning Runs */}
      <Card title="Lịch sử lượt chạy Cleaning (Cleaning Runs)" bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 text-xs">
          <select
            aria-label="Lọc trạng thái Cleaning"
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
            value={cleaningStatusFilter}
            onChange={(e) => {
              setCleaningStatusFilter(e.target.value)
              setOffset(0)
            }}
          >
            <option value="">Tất cả trạng thái Cleaning</option>
            <option value="RUNNING">RUNNING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
          </select>
          <select
            aria-label="Lọc trạng thái xuất bản Silver"
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
            value={publicationStatusFilter}
            onChange={(e) => {
              setPublicationStatusFilter(e.target.value)
              setOffset(0)
            }}
          >
            <option value="">Tất cả trạng thái xuất bản</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="PUBLISHED_WITH_QUARANTINE">PUBLISHED_WITH_QUARANTINE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="FAILED">FAILED</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>
        </div>

        {runsQuery.isPending ? (
          <LoadingState />
        ) : runsQuery.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(runsQuery.error, 'Không tải được lịch sử Cleaning.')}
              onRetry={() => void runsQuery.refetch()}
            />
          </div>
        ) : runsQuery.data.length === 0 ? (
          <EmptyState title="Chưa có lượt chạy Cleaning nào" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {[
                      'Run ID',
                      'Job / Dataset',
                      'Lĩnh vực / Entity',
                      'Cleaning',
                      'Xuất bản Silver',
                      'Đọc / Đạt / Cách ly',
                      'Bắt đầu',
                      '',
                    ].map((h, i) => (
                      <th key={i} scope="col" className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runsQuery.data.map((run) => (
                    <tr key={run.run_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRunId(run.run_id)
                            setLoadReportRunId(null)
                          }}
                          className="font-semibold text-indigo-600 hover:underline"
                        >
                          {run.run_id.slice(0, 8)}…
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        Job #{run.ingestion_job_id} · DS #{run.dataset_id}
                      </td>
                      <td className="px-3 py-2.5">
                        {domainLabel(run.domain)} · <span className="font-mono">{run.entity}</span>
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
                        {formatNumber(run.records_read)} / {formatNumber(run.records_passed)} /{' '}
                        {formatNumber(run.records_quarantined)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {formatDateTime(run.started_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {run.report_available && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedRunId(run.run_id)
                              setLoadReportRunId(run.run_id)
                            }}
                            icon={<FileText className="size-3.5" aria-hidden="true" />}
                          >
                            Báo cáo
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>Hiển thị {runsQuery.data.length} lượt chạy</span>
              <div className="flex gap-1.5">
                <Button
                  disabled={offset === 0}
                  onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                  icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                >
                  Trang trước
                </Button>
                <Button
                  disabled={runsQuery.data.length < PAGE_SIZE}
                  onClick={() => setOffset((p) => p + PAGE_SIZE)}
                  icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selectedRunId && (
        <Card
          title={`Chi tiết lượt Cleaning ${selectedRunId}`}
          right={
            <div className="flex gap-2">
              {runDetailQuery.data?.report_available && (
                <Button
                  variant="outline"
                  onClick={() => setLoadReportRunId(selectedRunId)}
                  icon={<FileText className="size-3.5" aria-hidden="true" />}
                >
                  Tải báo cáo chi tiết
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSelectedRunId(null)}>
                Đóng
              </Button>
            </div>
          }
        >
          {runDetailQuery.isPending ? (
            <LoadingState />
          ) : runDetailQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                runDetailQuery.error,
                'Không tải được chi tiết lượt chạy.'
              )}
            />
          ) : (
            <div className="space-y-3 text-xs">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="text-slate-500">Bronze / Input Version</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">
                    {runDetailQuery.data.bronze_version} ·{' '}
                    {runDetailQuery.data.input_version ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Silver Snapshot ID</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">
                    {runDetailQuery.data.silver_snapshot_id ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Gộp trùng / Đã xuất bản</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">
                    {formatNumber(runDetailQuery.data.records_collapsed)} /{' '}
                    {formatNumber(runDetailQuery.data.records_published)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Mã lỗi</dt>
                  <dd className="mt-0.5 font-mono text-rose-700">
                    {runDetailQuery.data.error_code ?? '—'}
                  </dd>
                </div>
              </dl>

              {loadReportRunId === selectedRunId && (
                <div>
                  <p className="mb-1 font-semibold text-slate-800">
                    Báo cáo chi tiết từ kho lưu trữ
                  </p>
                  {runReportQuery.isPending ? (
                    <LoadingState label="Đang tải báo cáo…" />
                  ) : runReportQuery.isError ? (
                    <ErrorState
                      message={getApiErrorMessage(
                        runReportQuery.error,
                        'Không đọc được báo cáo làm sạch.'
                      )}
                      onRetry={() => void runReportQuery.refetch()}
                    />
                  ) : (
                    <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-800">
                      {JSON.stringify(runReportQuery.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <Dialog open={confirmRunOpen} onOpenChange={setConfirmRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận chạy Cleaning Pipeline</DialogTitle>
            <DialogDescription>
              Thực thi làm sạch cho Job <strong className="font-mono">#{parsedJobId}</strong> với
              Silver Profile <strong className="font-mono">{selectedProfileId}</strong> (base
              snapshot: <strong className="font-mono">{baseSnapshot.trim() || 'active'}</strong>)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={runMutation.isPending}
              onClick={() => setConfirmRunOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={runMutation.isPending}
              onClick={() =>
                runMutation.mutate({
                  jobId: parsedJobId,
                  profileId: selectedProfileId,
                  snapshot: baseSnapshot.trim() || null,
                })
              }
            >
              {runMutation.isPending ? 'Đang xử lý…' : 'Xác nhận chạy Cleaning'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
