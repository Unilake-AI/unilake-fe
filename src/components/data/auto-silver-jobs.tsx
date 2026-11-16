'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { API_RetryAutoSilverJob } from '@/api/admindata/auto-pipeline'
import { getApiErrorMessage } from '@/api/http'
import {
  API_GetAutoSilverJob,
  API_ListAutoSilverAttempts,
  API_ListAutoSilverJobs,
} from '@/api/shared/auto-pipeline'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
  formatDateTime,
  formatNumber,
} from '@/components/page/page-parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AutoSilverJob, AutoSilverStatus } from '@/types/auto-pipeline'

const active = new Set<AutoSilverStatus>(['QUEUED', 'RUNNING', 'RETRY_WAIT'])
const labels: Record<AutoSilverStatus, string> = {
  QUEUED: 'Chờ xử lý Silver',
  RUNNING: 'Đang làm sạch và chuẩn hóa',
  RETRY_WAIT: 'Chờ thử lại',
  SUCCESS: 'Hoàn tất xử lý tự động',
  QUARANTINED: 'Chưa công bố Silver',
  FAILED: 'Xử lý thất bại',
  CANCELLED: 'Đã dừng',
}

export function AutoSilverStatusTag({ job }: { job: AutoSilverJob }) {
  return (
    <Tag tone={job.status === 'SUCCESS' ? 'emerald' : job.status === 'FAILED' ? 'rose' : 'amber'}>
      {labels[job.status] ?? job.status}
    </Tag>
  )
}

export function AutoSilverJobDetail({
  jobId,
  canRetry = false,
}: {
  jobId: string
  canRetry?: boolean
}) {
  const queryClient = useQueryClient()
  const [confirmRetry, setConfirmRetry] = useState(false)
  const detail = useQuery({
    queryKey: ['auto-silver', 'job', jobId],
    queryFn: () => API_GetAutoSilverJob(jobId),
    refetchInterval: (query) =>
      query.state.data && active.has(query.state.data.status) ? 5000 : false,
  })
  const attempts = useQuery({
    queryKey: ['auto-silver', 'attempts', jobId, detail.data?.status, detail.data?.attempt_number],
    queryFn: () => API_ListAutoSilverAttempts(jobId),
    refetchInterval: detail.data && active.has(detail.data.status) ? 5000 : false,
  })
  const retry = useMutation({
    mutationFn: () => API_RetryAutoSilverJob(jobId),
    onSuccess: async () => {
      setConfirmRetry(false)
      await queryClient.invalidateQueries({ queryKey: ['auto-silver'] })
    },
  })
  if (detail.isPending) return <LoadingState label="Đang tải kết quả xử lý Silver…" />
  if (detail.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(detail.error, 'Không tải được lượt tự xử lý Silver.')}
        onRetry={() => void detail.refetch()}
      />
    )
  const job = detail.data
  const result = job.result
  // Trạng thái hàng đợi hoàn tất chưa diễn tả hết việc công bố một phần; lấy kết quả công bố đã lưu.
  const publication = result?.status
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AutoSilverStatusTag job={job} />
        {canRetry && job.status === 'FAILED' && (
          <Button
            onClick={() => {
              retry.reset()
              setConfirmRetry(true)
            }}
          >
            Thử lại xử lý Silver
          </Button>
        )}
      </div>
      <p className="break-all text-xs text-slate-500">
        Lượt xử lý: {job.job_id} · Lần nạp #{job.ingestion_job_id} · Đã thử {job.attempt_number} lần
      </p>
      {publication === 'PUBLISHED_WITH_QUARANTINE' && (
        <p className="text-amber-800">
          Đã công bố một phần; các dòng lỗi được giữ trong hồ sơ cách ly.
        </p>
      )}
      {publication === 'PUBLISHED' && (
        <p className="text-emerald-800">Đã công bố dữ liệu vào Silver.</p>
      )}
      {job.status === 'QUARANTINED' && (
        <p className="text-amber-800">
          Lượt xử lý này chưa công bố Silver. Quản trị dữ liệu cần xem báo cáo và hồ sơ cách ly.
        </p>
      )}
      {job.error_code && (
        <p role="alert" className="text-rose-700">
          Mã lỗi: {job.error_code}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Đã đọc', result?.records_read],
          ['Đạt yêu cầu', result?.records_passed],
          ['Cách ly', result?.records_quarantined],
          ['Đã công bố', result?.publication?.records_published],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="font-semibold">
              {typeof value === 'number' ? formatNumber(value) : '—'}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">
        Tạo: {formatDateTime(job.created_at)} · Kết thúc: {formatDateTime(job.finished_at)}
        {job.next_attempt_at ? ` · Thử lại lúc: ${formatDateTime(job.next_attempt_at)}` : ''}
      </p>
      {result?.publication?.snapshot_id && (
        <p className="break-all text-xs">Phiên bản Silver: {result.publication.snapshot_id}</p>
      )}
      <div>
        <p className="mb-2 font-semibold">Lịch sử xử lý Silver</p>
        {attempts.isPending ? (
          <LoadingState />
        ) : attempts.isError ? (
          <ErrorState
            message={getApiErrorMessage(attempts.error, 'Không tải được lịch sử thử xử lý Silver.')}
            onRetry={() => void attempts.refetch()}
          />
        ) : attempts.data.length === 0 ? (
          <p className="text-slate-500">Chưa có lần thử xử lý.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {['Lần thử', 'Trạng thái', 'Bộ xử lý', 'Bắt đầu', 'Kết thúc', 'Mã lỗi'].map(
                    (label) => (
                      <th key={label} scope="col" className="p-2">
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {attempts.data.map((attempt) => (
                  <tr key={attempt.attempt_number} className="border-t">
                    <td className="p-2">{attempt.attempt_number}</td>
                    <td className="p-2">{labels[attempt.status] ?? attempt.status}</td>
                    <td className="p-2">{attempt.worker_id}</td>
                    <td className="p-2">{formatDateTime(attempt.started_at)}</td>
                    <td className="p-2">{formatDateTime(attempt.finished_at)}</td>
                    <td className="p-2">{attempt.error_code ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog
        open={confirmRetry}
        onOpenChange={(open) => {
          if (!retry.isPending) setConfirmRetry(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thử lại xử lý Silver?</DialogTitle>
            <DialogDescription>
              Hệ thống dùng lại đúng bản Bronze và cách xử lý của lượt này. Chỉ thử lại khi cấu hình
              vẫn bật và chưa đổi phiên bản.
            </DialogDescription>
          </DialogHeader>
          {retry.isError && (
            <ErrorState
              message={getApiErrorMessage(
                retry.error,
                'Không thể thử lại. Hãy kiểm tra cấu hình hiện tại.'
              )}
            />
          )}
          <DialogFooter>
            <Button disabled={retry.isPending} onClick={() => setConfirmRetry(false)}>
              Hủy
            </Button>
            <Button variant="primary" disabled={retry.isPending} onClick={() => retry.mutate()}>
              {retry.isPending ? 'Đang yêu cầu…' : 'Xác nhận thử lại Silver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AutoSilverForIngestion({
  ingestionJobId,
  canManage = false,
}: {
  ingestionJobId: number
  canManage?: boolean
}) {
  const jobs = useQuery({
    queryKey: ['auto-silver', 'ingestion', ingestionJobId],
    queryFn: () =>
      API_ListAutoSilverJobs({ ingestion_job_id: ingestionJobId, limit: 20, offset: 0 }),
    refetchInterval: (query) =>
      query.state.data?.some((job) => active.has(job.status)) ? 5000 : false,
  })
  return (
    <section
      aria-label="Xử lý Silver tự động"
      className="space-y-3 rounded-md border border-slate-200 bg-white p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Xử lý Silver tự động</h3>
        {canManage && (
          <Link href="/data/pipeline" className="text-xs font-semibold text-[#a9162e] underline">
            Theo dõi tự chạy
          </Link>
        )}
      </div>
      {jobs.isPending ? (
        <LoadingState />
      ) : jobs.isError ? (
        <ErrorState
          message={getApiErrorMessage(jobs.error, 'Không tải được trạng thái tự xử lý Silver.')}
          onRetry={() => void jobs.refetch()}
        />
      ) : jobs.data.length === 0 ? (
        <EmptyState
          title="Chưa có lượt tự xử lý Silver cho lần nạp này"
          description="Tự chạy áp dụng khi bộ dữ liệu đã bật cấu hình trước lúc lần nạp Bronze thành công. Dữ liệu Bronze cũ có thể được quản trị xử lý thủ công."
        />
      ) : (
        jobs.data.map((job) => <AutoSilverJobDetail key={job.job_id} jobId={job.job_id} />)
      )}
    </section>
  )
}
