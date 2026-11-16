'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { Check, CircleAlert, Clock3, LoaderCircle, LockKeyhole } from 'lucide-react'

import { API_ListIngestionFlows } from '@/api/admindata/auto-pipeline'
import type { FlowStep, IngestionFlow } from '@/api/admindata/auto-pipeline'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  formatDateTime,
  formatNumber,
} from '@/components/page/page-parts'

export const FLOW_STEP_PRESENTATION = {
  done: {
    label: 'Hoàn tất',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    Icon: Check,
  },
  running: {
    label: 'Đang xử lý',
    color: 'border-indigo-300 bg-indigo-50 text-indigo-800',
    Icon: LoaderCircle,
  },
  waiting: {
    label: 'Đang chờ',
    color: 'border-amber-200 bg-amber-50 text-amber-900',
    Icon: Clock3,
  },
  pending: {
    label: 'Chưa bắt đầu',
    color: 'border-slate-200 bg-slate-50 text-slate-500',
    Icon: Clock3,
  },
  failed: {
    label: 'Thất bại',
    color: 'border-rose-200 bg-rose-50 text-rose-800',
    Icon: CircleAlert,
  },
  blocked: {
    label: 'Chưa thể tiếp tục',
    color: 'border-amber-300 bg-amber-50 text-amber-900',
    Icon: LockKeyhole,
  },
} as const

function Step({ step, index, detailed }: { step: FlowStep; index: number; detailed: boolean }) {
  const state = FLOW_STEP_PRESENTATION[step.state ?? 'pending']
  return (
    <li
      aria-label={`Bước ${index + 1}: ${step.label} — ${state.label}`}
      className={`rounded-xl border p-3 ${state.color}`}
    >
      <div className="flex items-start gap-2">
        <state.Icon
          aria-hidden="true"
          className={`mt-0.5 size-4 shrink-0 ${step.state === 'running' ? 'animate-spin' : ''}`}
        />
        <div>
          <p className="font-semibold">
            {index + 1}. {step.label}
          </p>
          <p className="mt-1 text-xs">{state.label}</p>
        </div>
      </div>
      {detailed && (
        <>
          <p className="mt-3 text-xs leading-relaxed">{step.detail}</p>
          {step.at && <p className="mt-2 text-xs">{formatDateTime(step.at)}</p>}
        </>
      )}
    </li>
  )
}

export function IngestionFlowCard({
  flow,
  expanded,
  toggle,
  inspectSilver,
}: {
  flow: IngestionFlow
  expanded: boolean
  toggle: () => void
  inspectSilver?: (id: string) => void
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-all font-semibold text-slate-900">
            {flow.filename ?? `Lần nạp #${flow.ingestion_job_id}`}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Lần nạp #{flow.ingestion_job_id} · {flow.dataset_name} · {flow.domain}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Người gửi: {flow.uploaded_by ?? 'Chưa ghi nhận'} · {formatDateTime(flow.created_at)}
          </p>
        </div>
        <Button
          aria-expanded={expanded}
          aria-controls={`flow-${flow.ingestion_job_id}`}
          onClick={toggle}
        >
          {expanded ? 'Thu gọn' : 'Xem từng bước'}
        </Button>
      </div>
      <ol className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
        {(flow.steps ?? []).map((step, index) => (
          <Step key={step.key} step={step} index={index} detailed={expanded} />
        ))}
      </ol>
      {expanded && (
        <div
          id={`flow-${flow.ingestion_job_id}`}
          className="mt-4 space-y-4 border-t border-slate-100 pt-4"
        >
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {[
              ['Đã lưu Bronze', flow.bronze_rows],
              ['Đã đọc làm sạch', flow.records_read],
              ['Đạt yêu cầu', flow.records_passed],
              ['Dòng cách ly', flow.records_quarantined],
              ['Công bố Silver', flow.records_published],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold">
                  {typeof value === 'number' ? formatNumber(value) : '—'}
                </dd>
              </div>
            ))}
          </dl>
          {flow.error_code && (
            <p role="alert" className="text-sm text-rose-700">
              Mã lỗi: {flow.error_code}
            </p>
          )}
          {flow.next_attempt_at && flow.silver_status === 'RETRY_WAIT' && (
            <p className="text-sm text-amber-800">
              Dự kiến thử lại: {formatDateTime(flow.next_attempt_at)}
            </p>
          )}
          {flow.snapshot_id && (
            <p className="break-all text-xs text-slate-600">Phiên bản Silver: {flow.snapshot_id}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#a9162e]">
            <Link href={`/data/ingestion?jobId=${flow.ingestion_job_id}`} className="underline">
              Chi tiết lần nạp Bronze
            </Link>
            {flow.run_id && (
              <Link href={`/data/cleaning?jobId=${flow.ingestion_job_id}`} className="underline">
                Báo cáo làm sạch & chất lượng
              </Link>
            )}
            {!!flow.records_quarantined && (
              <Link href="/data/quarantine" className="underline">
                Hồ sơ cách ly
              </Link>
            )}
            {flow.auto_job_id &&
              (inspectSilver ? (
                <button
                  type="button"
                  className="underline"
                  onClick={() => inspectSilver(flow.auto_job_id!)}
                >
                  Lịch sử & kết quả Silver ({flow.attempt_number} lần thử)
                </button>
              ) : (
                <Link href={`/data/pipeline?jobId=${flow.ingestion_job_id}`} className="underline">
                  Lịch sử & kết quả Silver
                </Link>
              ))}
          </div>
        </div>
      )}
    </article>
  )
}

export function IngestionFlowMonitor({
  refresh,
  initialJobId,
  inspectSilver,
}: {
  refresh: boolean
  initialJobId?: number
  inspectSilver: (id: string) => void
}) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [jobInput, setJobInput] = useState(initialJobId ? String(initialJobId) : '')
  const [jobId, setJobId] = useState(initialJobId)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<number | null>(initialJobId ?? null)
  const flows = useQuery({
    queryKey: ['auto-silver', 'flows', search, jobId, offset],
    queryFn: () =>
      API_ListIngestionFlows({
        search: search || undefined,
        ingestion_job_id: jobId,
        limit: 20,
        offset,
      }),
    refetchInterval: refresh ? 5000 : false,
  })
  const focused = selected ?? flows.data?.items[0]?.ingestion_job_id
  return (
    <Card
      title="Theo dõi từng lần nạp: Bronze → Silver"
      subtitle="Tự xuất hiện khi staff hoặc người quản trị gửi dữ liệu. Chọn lượt nạp để xem bằng chứng của từng bước."
    >
      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(searchInput.trim())
          setJobId(jobInput ? Number(jobInput) : undefined)
          setOffset(0)
          setSelected(null)
        }}
      >
        <label className="min-w-48 flex-1 text-xs font-semibold text-slate-600">
          Tệp, bộ dữ liệu hoặc người nạp
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={200}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Mã lần nạp (tùy chọn)
          <input
            type="number"
            min="1"
            step="1"
            className="mt-1 block w-40 rounded-lg border border-slate-300 p-2 text-sm"
            value={jobInput}
            onChange={(e) => setJobInput(e.target.value)}
          />
        </label>
        <Button type="submit">Lọc</Button>
        <Button
          type="button"
          onClick={() => {
            setSearchInput('')
            setSearch('')
            setJobInput('')
            setJobId(undefined)
            setOffset(0)
            setSelected(null)
          }}
        >
          Tất cả lần nạp
        </Button>
      </form>
      <p className="mb-4 text-xs text-slate-500">
        Trạng thái dựa trên kết quả đã lưu. Bước chưa có bằng chứng sẽ hiện đang chờ hoặc chưa bắt
        đầu; thời gian chỉ hiện khi hệ thống có ghi nhận.
      </p>
      {flows.isPending ? (
        <LoadingState label="Đang tải tiến trình nạp dữ liệu…" />
      ) : flows.isError ? (
        <ErrorState
          message={getApiErrorMessage(flows.error, 'Không tải được tiến trình Bronze → Silver.')}
          onRetry={() => void flows.refetch()}
        />
      ) : !flows.data.items.length ? (
        <EmptyState
          title="Chưa có lần nạp phù hợp"
          description="Các lần nạp sẽ tự xuất hiện tại đây ngay sau khi được hệ thống tiếp nhận."
        />
      ) : (
        <div className="space-y-3">
          {flows.data.items.map((flow) => (
            <IngestionFlowCard
              key={flow.ingestion_job_id}
              flow={flow}
              expanded={focused === flow.ingestion_job_id}
              toggle={() =>
                setSelected(focused === flow.ingestion_job_id ? -1 : flow.ingestion_job_id)
              }
              inspectSilver={inspectSilver}
            />
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          disabled={!offset || flows.isFetching}
          onClick={() => {
            setOffset(Math.max(0, offset - 20))
            setSelected(null)
          }}
        >
          Trước
        </Button>
        <Button
          disabled={flows.data?.next_offset == null || flows.isFetching}
          onClick={() => {
            setOffset(flows.data!.next_offset!)
            setSelected(null)
          }}
        >
          Sau
        </Button>
      </div>
    </Card>
  )
}
