'use client'

import { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { API_AutoSilverOverview, API_ListSilverWorkers } from '@/api/admindata/auto-pipeline'
import { getApiErrorMessage } from '@/api/http'
import { AutoSilverJobDetail } from '@/components/data/auto-silver-jobs'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  KpiCard,
  formatDateTime,
} from '@/components/page/page-parts'

import { IngestionFlowMonitor } from './ingestion-flow-monitor'

export function AutoPipelineView({ initialJobId }: { initialJobId?: number }) {
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(true)
  const queryClient = useQueryClient()
  const overview = useQuery({
    queryKey: ['auto-silver', 'overview'],
    queryFn: API_AutoSilverOverview,
    refetchInterval: refresh ? 5000 : false,
  })
  const workers = useQuery({
    queryKey: ['auto-silver', 'workers'],
    queryFn: API_ListSilverWorkers,
    refetchInterval: refresh ? 5000 : false,
  })
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Tiến trình nạp & xử lý dữ liệu']}
        title="Tiến trình nạp & xử lý dữ liệu"
        description="Theo dõi tiến trình xử lý từng đợt dữ liệu theo thời gian thực từ lúc tiếp nhận (Ingestion) qua lưu trữ Bronze, làm sạch Silver đến tổng hợp Gold."
        actions={
          <>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={refresh}
                onChange={(event) => setRefresh(event.target.checked)}
              />
              Tự làm mới mỗi 5 giây
            </label>
            <Button
              onClick={() => {
                void overview.refetch()
                void queryClient.invalidateQueries({ queryKey: ['auto-silver', 'flows'] })
                void workers.refetch()
              }}
            >
              Làm mới
            </Button>
          </>
        }
      />
      {overview.isPending ? (
        <LoadingState />
      ) : overview.isError ? (
        <ErrorState
          message={getApiErrorMessage(overview.error, 'Không tải được trạng thái tự động.')}
          onRetry={() => void overview.refetch()}
        />
      ) : (
        <>
          <div
            role="status"
            className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900"
          >
            <strong>
              {overview.data.automatic_enabled
                ? 'Đang tự động xử lý Bronze → Silver'
                : 'Cần cập nhật hệ thống tự động'}
            </strong>
            <p className="mt-1">
              {overview.data.automatic_enabled
                ? 'File mới được tự xếp hàng sau khi nạp thành công. File có lỗi được ghi nhận riêng để xử lý; không tự công bố dữ liệu chưa đạt.'
                : 'Liên hệ quản trị hệ thống để cập nhật cơ sở dữ liệu.'}
            </p>
            {overview.data.paused_datasets > 0 && (
              <p className="mt-2">
                Có {overview.data.paused_datasets} bộ dữ liệu đang được tạm dừng bởi cấu hình riêng.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Đang chờ / thử lại"
              value={(overview.data.counts.QUEUED ?? 0) + (overview.data.counts.RETRY_WAIT ?? 0)}
            />
            <KpiCard label="Đang xử lý" value={overview.data.counts.RUNNING ?? 0} />
            <KpiCard label="Đã hoàn tất" value={overview.data.counts.SUCCESS ?? 0} tone="emerald" />
            <KpiCard
              label="Cần kiểm tra"
              value={(overview.data.counts.FAILED ?? 0) + (overview.data.counts.QUARANTINED ?? 0)}
              tone="amber"
            />
          </div>
          {overview.data.healthy_workers === 0 && (
            <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Chưa có bộ xử lý Silver đang hoạt động. Các file vẫn được giữ trong hàng đợi để xử lý
              khi dịch vụ hoạt động lại.
            </p>
          )}
        </>
      )}
      <IngestionFlowMonitor
        refresh={refresh}
        initialJobId={initialJobId}
        inspectSilver={setSelectedJob}
      />
      {selectedJob && (
        <Card
          title="Chi tiết lượt tự xử lý"
          right={<Button onClick={() => setSelectedJob(null)}>Đóng chi tiết</Button>}
        >
          <AutoSilverJobDetail key={selectedJob} jobId={selectedJob} canRetry />
        </Card>
      )}
      <Card title="Tiến trình xử lý Silver">
        {workers.isPending ? (
          <LoadingState />
        ) : workers.isError ? (
          <ErrorState
            message={getApiErrorMessage(workers.error, 'Không tải được tiến trình xử lý Silver.')}
            onRetry={() => void workers.refetch()}
          />
        ) : workers.data.length === 0 ? (
          <EmptyState
            title="Chưa ghi nhận tiến trình xử lý Silver"
            description="Cần có Silver Worker đang chạy để nhận các lượt đã xếp hàng."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th scope="col" className="p-2">
                    Bộ xử lý
                  </th>
                  <th scope="col" className="p-2">
                    Lượt đang xử lý
                  </th>
                  <th scope="col" className="p-2">
                    Liên lạc gần nhất
                  </th>
                </tr>
              </thead>
              <tbody>
                {workers.data.map((worker) => (
                  <tr key={worker.worker_id} className="border-t">
                    <td className="p-2">{worker.worker_id}</td>
                    <td className="p-2">
                      {worker.current_job_id ? (
                        <button
                          className="text-[#a9162e] underline"
                          onClick={() => setSelectedJob(worker.current_job_id)}
                        >
                          Xem lượt đang xử lý
                        </button>
                      ) : (
                        'Chưa giữ lượt xử lý'
                      )}
                    </td>
                    <td className="p-2">
                      {formatDateTime(worker.last_heartbeat_at)} ·{' '}
                      {worker.healthy ? 'Đang hoạt động' : 'Mất liên lạc'}
                    </td>
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
