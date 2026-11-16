'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'

import { API_AutoSilverOverview, API_ListIngestionFlows } from '@/api/admindata/auto-pipeline'
import { getApiErrorMessage } from '@/api/http'
import {
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  formatDateTime,
} from '@/components/page/page-parts'

import { FLOW_STEP_PRESENTATION, IngestionFlowCard } from './ingestion-flow-monitor'

export function PipelineDashboard({ refresh }: { refresh: boolean }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const overview = useQuery({
    queryKey: ['auto-silver', 'dashboard', 'overview'],
    queryFn: API_AutoSilverOverview,
    refetchInterval: refresh ? 5000 : false,
  })
  const flows = useQuery({
    queryKey: ['auto-silver', 'dashboard', 'recent-flows'],
    queryFn: () => API_ListIngestionFlows({ limit: 5, offset: 0 }),
    refetchInterval: refresh ? 5000 : false,
  })
  const selected = flows.data?.items.find((flow) => flow.ingestion_job_id === selectedId)
  return (
    <section aria-label="Dashboard Bronze đến Silver" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Luồng dữ liệu Bronze → Silver</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi file staff gửi lên và kết quả xử lý ngay tại Tổng quan.
          </p>
        </div>
        <Link href="/data/pipeline" className="text-sm font-semibold text-[#b91830] underline">
          Xem toàn bộ tiến trình
        </Link>
      </div>
      {overview.isPending ? (
        <LoadingState label="Đang tải tổng quan Silver…" />
      ) : overview.isError ? (
        <ErrorState
          message={getApiErrorMessage(overview.error, 'Không tải được tổng quan Silver tự động.')}
          onRetry={() => void overview.refetch()}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
            <span>
              {overview.data.automatic_enabled
                ? 'Tự xử lý Silver đang bật'
                : 'Cần cập nhật hệ thống tự xử lý Silver'}
            </span>
            <span>{overview.data.healthy_workers} bộ xử lý Silver đang hoạt động</span>
          </div>
          {overview.data.healthy_workers === 0 && (
            <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Chưa có bộ xử lý Silver hoạt động. File đã xếp hàng sẽ chờ dịch vụ hoạt động lại.
            </p>
          )}
          {overview.data.paused_datasets > 0 && (
            <p className="text-sm text-amber-800">
              {overview.data.paused_datasets} bộ dữ liệu đang tạm dừng tự xử lý.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiCard
              label="Chờ / thử lại Silver"
              value={(overview.data.counts.QUEUED ?? 0) + (overview.data.counts.RETRY_WAIT ?? 0)}
              hint="Hàng đợi xử lý tự động"
              tone="amber"
            />
            <KpiCard
              label="Đang xử lý Silver"
              value={overview.data.counts.RUNNING ?? 0}
              hint="Lượt tự động đang chạy"
            />
            <KpiCard
              label="Hoàn tất Silver tự động"
              value={overview.data.counts.SUCCESS ?? 0}
              hint="Toàn bộ lịch sử tự động"
              tone="emerald"
            />
            <KpiCard
              label="Silver cần kiểm tra"
              value={(overview.data.counts.FAILED ?? 0) + (overview.data.counts.QUARANTINED ?? 0)}
              hint="Lượt tự động lỗi hoặc cách ly"
              tone="rose"
            />
          </div>
        </>
      )}
      <Card
        title="Tiến trình các file gần đây"
        subtitle="5 lần nạp mới nhất; gồm cả lượt chưa vào Bronze và lịch sử xử lý trực tiếp. Số liệu tổng hợp bên trên chỉ tính hàng đợi Silver tự động."
        bodyClassName="p-0"
      >
        {flows.isPending ? (
          <LoadingState label="Đang tải tiến trình file…" />
        ) : flows.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(flows.error, 'Không tải được tiến trình file.')}
              onRetry={() => void flows.refetch()}
            />
          </div>
        ) : !flows.data.items.length ? (
          <EmptyState
            title="Chưa có file được tiếp nhận"
            description="Khi staff nạp dữ liệu, tiến trình sẽ tự xuất hiện tại đây."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      'File / Người nạp',
                      'Tiếp nhận',
                      'Bronze',
                      'Hàng đợi Silver',
                      'Làm sạch & kiểm tra',
                      'Công bố Silver',
                    ].map((label) => (
                      <th key={label} scope="col" className="p-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flows.data.items.map((flow) => (
                    <tr
                      key={flow.ingestion_job_id}
                      className={`border-t border-slate-100 ${selectedId === flow.ingestion_job_id ? 'bg-indigo-50/50' : ''}`}
                    >
                      <td className="max-w-64 p-3">
                        <button
                          type="button"
                          aria-label={`Xem tiến trình lần nạp #${flow.ingestion_job_id}`}
                          aria-expanded={selectedId === flow.ingestion_job_id}
                          onClick={() =>
                            setSelectedId(
                              selectedId === flow.ingestion_job_id ? null : flow.ingestion_job_id
                            )
                          }
                          className="block max-w-full break-all text-left font-semibold text-[#b91830] hover:underline"
                        >
                          {flow.filename ?? `Lần nạp #${flow.ingestion_job_id}`}
                        </button>
                        <p className="mt-1 text-slate-600">
                          {flow.uploaded_by ?? 'Chưa ghi nhận người nạp'} · {flow.dataset_name}
                        </p>
                        <p className="mt-1 text-slate-400">
                          #{flow.ingestion_job_id} · {formatDateTime(flow.created_at)}
                        </p>
                      </td>
                      {['received', 'bronze', 'queue', 'cleaning', 'publication'].map((key) => {
                        const step = flow.steps?.find((s) => s.key === key)
                        const style = FLOW_STEP_PRESENTATION[step?.state ?? 'pending']
                        return (
                          <td key={key} className="p-3">
                            <span
                              title={step?.detail}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${style.color}`}
                            >
                              <style.Icon
                                className={`size-3.5 shrink-0 ${step?.state === 'running' ? 'animate-spin' : ''}`}
                                aria-hidden="true"
                              />
                              {style.label}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected && (
              <div className="border-t border-slate-200 p-4">
                <IngestionFlowCard flow={selected} expanded toggle={() => setSelectedId(null)} />
              </div>
            )}
            <div className="border-t border-slate-100 p-3 text-right">
              <Link
                href="/data/pipeline"
                className="text-xs font-semibold text-[#b91830] underline"
              >
                Tra cứu tất cả lần nạp và lịch sử xử lý
              </Link>
            </div>
          </>
        )}
      </Card>
    </section>
  )
}
