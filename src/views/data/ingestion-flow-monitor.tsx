'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowRight, Check, Circle, Clock3, ShieldAlert, X } from 'lucide-react'

import { API_GetCleaningRun } from '@/api/admindata/cleaning'
import { API_GoldSources } from '@/api/admindata/gold'
import type { GoldDomain, GoldSource } from '@/api/admindata/gold'
import { API_ListIngestionFlows } from '@/api/admindata/ingestion-flows'
import type { IngestionFlow, IngestionFlowStep } from '@/api/admindata/ingestion-flows'
import { getApiErrorMessage, getErrorMessageForCode } from '@/api/http'
import { DetailDrawer } from '@/components/page/detail-drawer'
import { FilterForm, filterControlClassName } from '@/components/page/filter-bar'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
  formatDateTime,
  formatNumber,
  statusLabel,
  statusTone,
} from '@/components/page/page-parts'
import { cn } from '@/lib/utils'
import type { CleaningRun } from '@/types/cleaning'

const PAGE_SIZE = 10

const stepStatus: Record<IngestionFlowStep['state'], string> = {
  done: 'SUCCESS',
  running: 'RUNNING',
  waiting: 'QUEUED',
  pending: 'NOT_STARTED',
  failed: 'FAILED',
  blocked: 'BLOCKED',
}

export function pipelineStages(
  flow: IngestionFlow,
  cleaning: CleaningRun | undefined,
  goldSources: GoldSource[]
) {
  const source = flow.steps.find(({ key }) => key === 'received')
  const bronze = flow.steps.find(({ key }) => key === 'bronze')
  const publication = flow.steps.find(({ key }) => key === 'publication')
  const silverSteps = flow.steps.filter(({ key }) =>
    ['queue', 'cleaning', 'publication'].includes(key)
  )
  const current = [...silverSteps].reverse().find(({ state }) => state !== 'pending') ?? publication
  const bronzeDone = bronze?.state === 'done' && flow.ingestion_status === 'SUCCESS'
  const publicationStatus =
    cleaning?.run_id === flow.run_id &&
    cleaning?.dataset_id === flow.dataset_id &&
    cleaning?.ingestion_job_id === flow.ingestion_job_id
      ? cleaning?.publication_status
      : undefined
  const published =
    bronzeDone &&
    Boolean(flow.snapshot_id) &&
    (publication?.state === 'done' ||
      (cleaning?.silver_snapshot_id === flow.snapshot_id &&
        (publicationStatus === 'PUBLISHED' || publicationStatus === 'PUBLISHED_WITH_QUARANTINE')))
  let silver = current ? stepStatus[current.state] : 'UNKNOWN'
  if (published) {
    silver =
      publicationStatus === 'PUBLISHED_WITH_QUARANTINE' || (flow.records_quarantined ?? 0) > 0
        ? 'PUBLISHED_WITH_QUARANTINE'
        : 'PUBLISHED'
  } else if (!bronzeDone) {
    silver = publication?.state === 'pending' ? 'NOT_STARTED' : 'UNKNOWN'
  } else if (
    publicationStatus === 'SKIPPED' ||
    publication?.detail.startsWith('Lượt này chỉ làm sạch')
  ) {
    silver = 'SKIPPED'
  } else if (
    publicationStatus === 'BLOCKED' ||
    publicationStatus === 'FAILED' ||
    publicationStatus === 'RUNNING'
  ) {
    silver = publicationStatus
  } else if (silver === 'SUCCESS') {
    silver = 'UNKNOWN'
  }
  const gold = published
    ? goldSources.find(
        (item) =>
          item.silver_snapshot_id === flow.snapshot_id && item.dataset_id === flow.dataset_id
      )
    : undefined
  return [
    {
      layer: 'Source',
      status: source ? stepStatus[source.state] : 'UNKNOWN',
      detail: source?.detail,
      done: source?.state === 'done',
    },
    {
      layer: 'Bronze',
      status: bronze ? flow.ingestion_status : 'UNKNOWN',
      detail: bronze?.detail,
      done: bronzeDone,
    },
    {
      layer: 'Silver',
      status: silver,
      detail: !bronzeDone ? publication?.detail : current?.detail,
      done: published,
    },
    {
      layer: 'Gold',
      status: gold?.status ?? gold?.sync_status ?? 'UNKNOWN',
      detail: gold
        ? 'Khớp phiên bản Silver và bộ dữ liệu của lần nạp.'
        : 'Chưa có kết quả khớp trong danh sách Gold hiện hành. Lượt cũ hoặc chưa xuất bản Silver có thể chưa xác định được.',
      done: gold?.status === 'SUCCEEDED',
      error: gold?.error_code,
    },
  ]
}

function FlowRow({ flow, refresh }: { flow: IngestionFlow; refresh: boolean }) {
  const [selected, setSelected] = useState<number | null>(null)
  const domain = ['hr', 'academic', 'admissions'].includes(flow.domain)
    ? (flow.domain as GoldDomain)
    : undefined
  const gold = useQuery({
    queryKey: ['ingestion-flow', 'gold-sources', domain],
    queryFn: () => API_GoldSources({ domain, limit: 100 }),
    enabled: Boolean(domain && flow.snapshot_id),
    refetchInterval: refresh ? 5000 : false,
  })
  const cleaning = useQuery({
    queryKey: ['ingestion-flow', 'cleaning', flow.run_id],
    queryFn: () => API_GetCleaningRun(flow.run_id!),
    enabled: Boolean(
      flow.run_id &&
      flow.ingestion_status === 'SUCCESS' &&
      flow.steps.some(({ key, state }) => key === 'publication' && state === 'blocked')
    ),
  })
  const stages = pipelineStages(flow, cleaning.data, gold.data ?? [])
  const stage = selected === null ? undefined : stages[selected]
  const silver = selected === 2
  return (
    <article className="min-w-0 space-y-3 border-b py-4 last:border-b-0">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold">
            {flow.filename || flow.dataset_name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {flow.dataset_name}
            {flow.uploaded_by && ` · ${flow.uploaded_by}`}
          </p>
        </div>
        <Link
          className="text-xs font-medium text-primary hover:underline"
          href={`/data/ingestion?jobId=${flow.ingestion_job_id}`}
        >
          Lần nạp #{flow.ingestion_job_id}
        </Link>
      </header>
      <ol className="grid min-w-0 gap-1 md:grid-cols-4">
        {stages.map((item, index) => {
          const tone = statusTone(item.status)
          const Icon = item.done
            ? Check
            : item.status === 'BLOCKED'
              ? ShieldAlert
              : tone === 'rose'
                ? X
                : tone === 'amber'
                  ? Clock3
                  : Circle
          const reached = item.done && stages.slice(0, index).every((previous) => previous.done)
          return (
            <li
              key={item.layer}
              className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center"
            >
              {index > 0 && (
                <div
                  className={cn('ml-4 md:ml-0', reached ? 'text-emerald-700' : 'text-slate-400')}
                  aria-hidden="true"
                >
                  <ArrowDown className="size-4 md:hidden" />
                  <ArrowRight className="hidden size-4 md:block" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-haspopup="dialog"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 py-2 text-left hover:bg-muted"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="grid min-w-0 gap-1">
                  <span className="text-xs font-semibold">{item.layer}</span>
                  <span className="text-xs text-muted-foreground">{statusLabel(item.status)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <DetailDrawer
        open={stage !== undefined}
        onClose={() => setSelected(null)}
        title={`${stage?.layer ?? ''} · Lần nạp #${flow.ingestion_job_id}`}
      >
        {stage && (
          <div className="space-y-4 text-sm">
            <Tag tone={statusTone(stage.status)}>
              {stage.status} · {statusLabel(stage.status)}
            </Tag>
            <p>{stage.detail}</p>
            {selected === 3 && gold.isError && (
              <ErrorState
                message="Không tải được trạng thái Gold."
                retrying={gold.isFetching}
                onRetry={() => void gold.refetch()}
              />
            )}
            {selected === 3 && gold.isPending && flow.snapshot_id && domain && <LoadingState />}
            {selected === 0 && <p>Tiếp nhận {formatDateTime(flow.created_at)}</p>}
            {selected === 1 && <p>Số dòng đã lưu Bronze {formatNumber(flow.bronze_rows)}</p>}
            {silver && (
              <>
                <ol className="divide-y rounded-md border px-3">
                  {flow.steps
                    .filter(({ key }) => ['queue', 'cleaning', 'publication'].includes(key))
                    .map((step) => (
                      <li key={step.key} className="py-2">
                        <p className="font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.detail}</p>
                        {step.at && (
                          <p className="text-xs text-muted-foreground">{formatDateTime(step.at)}</p>
                        )}
                      </li>
                    ))}
                </ol>
                <dl className="grid grid-cols-[1fr_auto] gap-2">
                  <dt>Dòng đã đọc</dt>
                  <dd>{formatNumber(flow.records_read)}</dd>
                  <dt>Dòng hợp lệ</dt>
                  <dd>{formatNumber(flow.records_passed)}</dd>
                  <dt>Dòng cách ly</dt>
                  <dd>{formatNumber(flow.records_quarantined)}</dd>
                  <dt>Dòng đã công bố</dt>
                  <dd>{formatNumber(flow.records_published)}</dd>
                </dl>
                {flow.run_id && (
                  <p className="break-all text-xs text-muted-foreground">
                    Cleaning run {flow.run_id}
                  </p>
                )}
                {flow.snapshot_id && (
                  <p className="break-all text-xs text-muted-foreground">
                    Silver snapshot {flow.snapshot_id}
                  </p>
                )}
              </>
            )}
            {(stage.error || (silver && flow.error_code)) && (
              <p className="break-all rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-800">
                Mã lỗi {stage.error || flow.error_code}
                {getErrorMessageForCode(stage.error || flow.error_code) && (
                  <span className="mt-1 block">
                    {getErrorMessageForCode(stage.error || flow.error_code)}
                  </span>
                )}
              </p>
            )}
          </div>
        )}
      </DetailDrawer>
    </article>
  )
}

export function IngestionFlowMonitor({ refresh = true }: { refresh?: boolean }) {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const flows = useQuery({
    queryKey: ['ingestion-flow', 'list', search, offset],
    queryFn: () =>
      API_ListIngestionFlows({ search: search || undefined, offset, limit: PAGE_SIZE }),
    refetchInterval: refresh ? 5000 : false,
  })

  return (
    <Card
      title="Luồng xử lý theo lần nạp"
      subtitle="Gold chỉ hiển thị khi danh sách Gold hiện hành có kết quả khớp phiên bản Silver của lần nạp."
    >
      <FilterForm
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(input.trim())
          setOffset(0)
        }}
      >
        <input
          type="search"
          maxLength={200}
          aria-label="Tìm lần nạp"
          placeholder="Tìm theo tên tệp, bộ dữ liệu hoặc người nạp"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className={`${filterControlClassName} w-full sm:max-w-sm`}
        />
      </FilterForm>
      {flows.isPending ? (
        <LoadingState />
      ) : flows.isError && !flows.data ? (
        <ErrorState
          message={getApiErrorMessage(flows.error, 'Không tải được luồng xử lý.')}
          retrying={flows.isFetching}
          onRetry={() => void flows.refetch()}
        />
      ) : flows.data?.items.length ? (
        <>
          {flows.isError && (
            <p role="status" className="mt-3 text-xs text-rose-700">
              Chưa làm mới được. Đang hiển thị dữ liệu lần tải trước.
            </p>
          )}
          {flows.data.items.map((flow) => (
            <FlowRow key={flow.ingestion_job_id} flow={flow} refresh={refresh} />
          ))}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Trang trước
            </Button>
            <Button
              onClick={() => {
                if (flows.data?.next_offset != null) setOffset(flows.data.next_offset)
              }}
              disabled={flows.data.next_offset == null}
            >
              Trang sau
            </Button>
          </div>
        </>
      ) : (
        <EmptyState title="Không có lần nạp phù hợp" />
      )}
    </Card>
  )
}
