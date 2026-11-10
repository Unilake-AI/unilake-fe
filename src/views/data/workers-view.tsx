'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { Activity, Info, RefreshCw } from 'lucide-react'

import { API_ListIngestionWorkers } from '@/api/data-operations/ingestion'
import { getApiErrorMessage } from '@/api/http'
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
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'

const WORKER_POLL_MS = 5000

export function WorkersView() {
  const [autoRefresh, setAutoRefresh] = useState(true)

  const workersQuery = useQuery({
    queryKey: ['ingestion-workers'],
    queryFn: API_ListIngestionWorkers,
    refetchInterval: autoRefresh ? WORKER_POLL_MS : false,
  })

  const workers = workersQuery.data ?? []
  const healthy = workers.filter((w) => w.status.toUpperCase() === 'HEALTHY')
  const offline = workers.filter((w) => w.status.toUpperCase() !== 'HEALTHY')
  const processing = healthy.filter((w) => w.current_job_id != null)
  const idle = healthy.filter((w) => w.current_job_id == null)

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Giám sát Worker']}
        title="Giám sát Worker xử lý Ingestion"
        description="Theo dõi tình trạng hoạt động (heartbeat) của các worker tiêu thụ hàng đợi nạp dữ liệu."
        actions={
          <>
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="size-3.5 accent-indigo-600"
              />
              Tự động làm mới (5 giây)
            </label>
            <Button
              onClick={() => void workersQuery.refetch()}
              disabled={workersQuery.isFetching}
              icon={
                <RefreshCw
                  className={`size-3.5 ${workersQuery.isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              }
            >
              Làm mới
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <Info className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
        <p>
          <strong>Lưu ý trạng thái:</strong> Worker <strong>HEALTHY</strong> nhưng không có job hiện
          tại nghĩa là <strong>đang rảnh (Idle)</strong> và sẵn sàng nhận việc, khác với{' '}
          <strong>OFFLINE</strong> (mất tín hiệu heartbeat).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Tổng worker" value={workersQuery.data ? workers.length : '—'} />
        <KpiCard
          label="Đang hoạt động (HEALTHY)"
          value={workersQuery.data ? healthy.length : '—'}
          hint={`${idle.length} đang rảnh`}
          tone="emerald"
        />
        <KpiCard
          label="Đang xử lý job"
          value={workersQuery.data ? processing.length : '—'}
          tone="amber"
        />
        <KpiCard
          label="Ngoại tuyến (OFFLINE)"
          value={workersQuery.data ? offline.length : '—'}
          tone={offline.length > 0 ? 'rose' : 'slate'}
        />
      </div>

      <Card
        title="Danh sách Worker"
        subtitle={
          workersQuery.isSuccess
            ? 'API backend đang trực tuyến · Cập nhật từ bảng heartbeat worker'
            : undefined
        }
        bodyClassName="p-0"
      >
        {workersQuery.isPending ? (
          <LoadingState label="Đang tải danh sách worker…" />
        ) : workersQuery.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(workersQuery.error, 'Không tải được trạng thái worker.')}
              onRetry={() => void workersQuery.refetch()}
            />
          </div>
        ) : workers.length === 0 ? (
          <EmptyState
            title="Chưa có worker nào ghi nhận heartbeat"
            description="Tiến trình ingestion worker chưa đăng ký hoặc chưa chạy trên môi trường này."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {[
                    'Worker ID',
                    'Sức khỏe (Health)',
                    'Trạng thái xử lý',
                    'Job đang xử lý',
                    'Heartbeat gần nhất',
                  ].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers.map((worker) => {
                  const isHealthy = worker.status.toUpperCase() === 'HEALTHY'
                  const isBusy = worker.current_job_id != null
                  return (
                    <tr key={worker.worker_id}>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          <Activity
                            className={`size-3.5 ${isHealthy ? 'text-emerald-600' : 'text-rose-500'}`}
                            aria-hidden="true"
                          />
                          {worker.worker_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Tag tone={statusTone(worker.status)}>{statusLabel(worker.status)}</Tag>
                      </td>
                      <td className="px-4 py-3">
                        {!isHealthy ? (
                          <Tag tone="rose">Không phản hồi</Tag>
                        ) : isBusy ? (
                          <Tag tone="amber">Đang xử lý job</Tag>
                        ) : (
                          <Tag tone="slate">Đang rảnh (Idle)</Tag>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {worker.current_job_id != null ? (
                          <Link
                            href={`/data/ingestion?jobId=${worker.current_job_id}`}
                            className="font-semibold text-indigo-600 hover:underline"
                          >
                            Job #{worker.current_job_id}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(worker.last_heartbeat_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
