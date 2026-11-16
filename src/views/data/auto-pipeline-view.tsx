'use client'

import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { API_AutoSilverOverview, API_ListSilverWorkers } from '@/api/admindata/auto-pipeline'
import { getApiErrorMessage } from '@/api/http'
import { API_ListAutoSilverJobs } from '@/api/shared/auto-pipeline'
import { AutoSilverJobDetail, AutoSilverStatusTag } from '@/components/data/auto-silver-jobs'
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

const inputClass = 'w-full rounded-md border border-slate-300 bg-white p-2 text-sm'
const PAGE_SIZE = 20

export function AutoPipelineView() {
  const [datasetId, setDatasetId] = useState('')
  const [offset, setOffset] = useState(0)
  const [ingestionInput, setIngestionInput] = useState('')
  const [ingestionFilter, setIngestionFilter] = useState<number | undefined>()
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(true)
  const overview = useQuery({
    queryKey: ['auto-silver', 'overview'],
    queryFn: API_AutoSilverOverview,
    refetchInterval: refresh ? 5000 : false,
  })
  const jobs = useQuery({
    queryKey: ['auto-silver', 'jobs', datasetId, ingestionFilter, offset],
    queryFn: () =>
      API_ListAutoSilverJobs({
        dataset_id: datasetId ? Number(datasetId) : undefined,
        ingestion_job_id: ingestionFilter,
        limit: PAGE_SIZE,
        offset,
      }),
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
        breadcrumb={['Quản trị dữ liệu', 'Xử lý Silver tự động']}
        title="Xử lý Silver tự động"
        description="Sau khi nạp Bronze thành công, hệ thống tự nhận diện file, làm sạch, chuẩn hóa và công bố Silver. Không cần chọn bộ dữ liệu để bắt đầu."
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
                void jobs.refetch()
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
      <Card title="Các lượt tự xử lý Silver">
        <details className="mb-4">
          <summary className="mb-3 cursor-pointer text-sm font-semibold">
            Lọc lượt chạy (tùy chọn)
          </summary>
          <form
            className="mb-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const value = Number(ingestionInput)
              if (!ingestionInput.trim() || (Number.isInteger(value) && value > 0)) {
                setIngestionFilter(ingestionInput.trim() ? value : undefined)
                setOffset(0)
                setSelectedJob(null)
              }
            }}
          >
            <input
              aria-label="Lọc theo mã bộ dữ liệu"
              className={inputClass}
              type="number"
              min="1"
              value={datasetId}
              onChange={(event) => {
                const value = event.target.value
                if (!value || /^[1-9]\d*$/.test(value)) {
                  setDatasetId(value)
                  setOffset(0)
                  setSelectedJob(null)
                }
              }}
              placeholder="Mã bộ dữ liệu (tùy chọn)"
            />
            <input
              aria-label="Lọc theo lần nạp Bronze"
              type="number"
              min="1"
              className={inputClass}
              value={ingestionInput}
              onChange={(event) => setIngestionInput(event.target.value)}
              placeholder="Lần nạp Bronze (tùy chọn)"
            />
            <Button type="submit">Lọc lượt chạy</Button>
          </form>
        </details>
        {jobs.isPending ? (
          <LoadingState />
        ) : jobs.isError ? (
          <ErrorState
            message={getApiErrorMessage(jobs.error, 'Không tải được các lượt tự xử lý.')}
            onRetry={() => void jobs.refetch()}
          />
        ) : jobs.data.length === 0 ? (
          <EmptyState
            title="Chưa có lượt tự xử lý phù hợp"
            description="Lần nạp Bronze thành công sẽ tự xuất hiện tại đây; không cần thiết lập cho từng bộ dữ liệu."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {[
                    'Lượt xử lý',
                    'Lần nạp / File / Bộ dữ liệu',
                    'Trạng thái',
                    'Đã thử',
                    'Tạo lúc',
                    'Mã lỗi',
                  ].map((label) => (
                    <th key={label} scope="col" className="p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.data.map((job) => (
                  <tr key={job.job_id} className="border-t">
                    <td className="p-2">
                      <button
                        className="font-semibold text-[#a9162e] underline"
                        onClick={() => setSelectedJob(job.job_id)}
                      >
                        Xem lượt {job.job_id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="p-2">
                      #{job.ingestion_job_id} · {job.source_table ?? 'File nguồn'}
                      <p className="mt-1 text-slate-500">
                        {job.dataset_name ?? `Bộ dữ liệu #${job.dataset_id}`}
                      </p>
                    </td>
                    <td className="p-2">
                      <AutoSilverStatusTag job={job} />
                    </td>
                    <td className="p-2">{job.attempt_number}</td>
                    <td className="p-2">{formatDateTime(job.created_at)}</td>
                    <td className="p-2">{job.error_code ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button
            disabled={offset === 0}
            onClick={() => {
              setOffset((value) => Math.max(0, value - PAGE_SIZE))
              setSelectedJob(null)
            }}
          >
            Trước
          </Button>
          <Button
            disabled={!jobs.data || jobs.data.length < PAGE_SIZE}
            onClick={() => {
              setOffset((value) => value + PAGE_SIZE)
              setSelectedJob(null)
            }}
          >
            Sau
          </Button>
        </div>
      </Card>
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
