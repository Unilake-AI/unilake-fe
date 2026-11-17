'use client'

import { useState } from 'react'

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ManagerOverview,
  API_ManagerAnalytics,
  API_ManagerDatasets,
  API_ManagerDataset,
  API_ManagerIssues,
  API_ManagerIssueStats,
  API_ManagerIssue,
  API_ManagerRecipes,
} from '@/api/manager/reports'
import type { ManagerContext, AnalyticsFilters, IssueFilters } from '@/api/manager/reports'
import { CountChart } from '@/components/charts/count-chart'
import { DetailDrawer } from '@/components/page/detail-drawer'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  Tag,
  statusTone,
  formatDateTime,
} from '@/components/page/page-parts'

import { ManagerGate, MetricList, Paging, inputClass, label, number } from './report-parts'

type Mode = 'overview' | 'analytics' | 'datasets' | 'issues'
type Domain = 'hr' | 'academic' | 'admissions'
const titles = {
  overview: 'Tổng quan phân hệ',
  analytics: 'Phân tích dữ liệu',
  datasets: 'Bộ dữ liệu phòng ban',
  issues: 'Yêu cầu sửa dữ liệu',
}
const departmentCodes: Record<string, string> = { hr: 'PNS', academic: 'PDT', admissions: 'PTS' }
const size = 20
const polling = { refetchInterval: 15_000 } as const

export function ManagerReportsView({ mode = 'overview' }: { mode?: Mode }) {
  return (
    <ManagerGate>
      {(context) => (
        <ManagerWorkspace
          key={JSON.stringify([context.roles, context.departments])}
          context={context}
          mode={mode}
        />
      )}
    </ManagerGate>
  )
}

function ManagerWorkspace({ context, mode }: { context: ManagerContext; mode: Mode }) {
  const available = context.domains.filter((domain) =>
    context.departments.some(
      (department) => department.department_code === departmentCodes[domain.domain]
    )
  )
  const initial =
    available.find((domain) => domain.domain === context.default_domain) ?? available[0]
  const [domain, setDomain] = useState<Domain>((initial?.domain ?? 'hr') as Domain)
  const client = useQueryClient()
  const refreshing = useIsFetching({ queryKey: ['manager'] }) > 0
  return (
    <div className="space-y-5">
      <PageHeader
        dashboard={mode === 'overview'}
        breadcrumb={['Quản lý đơn vị', label(domain)]}
        title={titles[mode]}
        description={`${label(domain)} · Báo cáo trong phạm vi phòng phụ trách đang hiệu lực.`}
        actions={
          <Button
            reading={refreshing}
            onClick={() => void client.invalidateQueries({ queryKey: ['manager'] })}
          >
            Làm mới
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Lĩnh vực
          <select
            className={inputClass}
            value={domain}
            onChange={(event) => setDomain(event.target.value as Domain)}
          >
            {available.map((item) => (
              <option key={item.domain} value={item.domain}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">
          {context.departments.map((item) => item.department_name).join(' · ')}
        </span>
      </div>
      <div key={domain}>
        {mode === 'overview' && <Overview domain={domain} />}
        {mode === 'analytics' && <Analytics domain={domain} />}
        {mode === 'datasets' && <Datasets domain={domain} />}
        {mode === 'issues' && <Issues domain={domain} />}
      </div>
    </div>
  )
}

function Overview({ domain }: { domain: Domain }) {
  const [page, setPage] = useState(0)
  const query = useQuery({
    queryKey: ['manager', 'overview', domain, page],
    queryFn: () => API_ManagerOverview({ domain, limit: size, offset: page * size }),
    ...polling,
  })
  if (query.isPending) return <LoadingState />
  if (query.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(query.error, 'Không thể tải tổng quan.')}
        onRetry={() => void query.refetch()}
      />
    )
  const data = query.data
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        <KpiCard dashboard label="Bộ dữ liệu được quản lý" value={number(data.datasets)} />
        <KpiCard
          dashboard
          label="Yêu cầu cần xử lý"
          value={number(data.issues.assigned)}
          tone="amber"
        />
        <KpiCard
          dashboard
          label="Đang chờ xác minh"
          value={number(data.issues.pending_verification)}
        />
        <KpiCard
          dashboard
          label="Đã xác minh"
          value={number(data.issues.verified)}
          tone="emerald"
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card
          title="Tiến độ yêu cầu sửa dữ liệu"
          subtitle="Số yêu cầu trong phạm vi phân hệ đang xem"
        >
          <CountChart
            unit="yêu cầu"
            data={[
              { label: 'Cần xử lý', count: data.issues.assigned, tone: 'warning' },
              { label: 'Chờ xác minh', count: data.issues.pending_verification },
              { label: 'Đã xác minh', count: data.issues.verified, tone: 'success' },
            ]}
          />
        </Card>
        <Card title="Đồng bộ nguồn báo cáo">
          <div role="status" className="space-y-3 text-sm">
            <Tag tone={statusTone(data.status)}>{label(data.status)}</Tag>
            <dl className="grid grid-cols-[1fr_auto] items-baseline gap-2">
              <dt>Nguồn đã đồng bộ</dt>
              <dd className="font-semibold tabular-nums">
                {data.sources.current == null ? '—' : number(data.sources.current)}/
                {data.sources.total == null ? '—' : number(data.sources.total)}
              </dd>
              <dt>Nguồn lỗi</dt>
              <dd className="font-semibold tabular-nums">
                {data.sources.failed == null ? '—' : number(data.sources.failed)}
              </dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              Cập nhật gần nhất {formatDateTime(data.last_updated_at)}
            </p>
          </div>
        </Card>
      </div>
      <Card
        title="Số bản ghi theo từng nguồn"
        subtitle="Mỗi nguồn được giữ riêng; không cộng thành số người duy nhất."
      >
        <MetricList items={data.kpis.items} />
        <Paging page={page} setPage={setPage} total={data.kpis.total} />
      </Card>
    </div>
  )
}

function Analytics({ domain }: { domain: Domain }) {
  const [entity, setEntity] = useState('')
  const [metric, setMetric] = useState('record_count')
  const [dataset, setDataset] = useState('')
  const [page, setPage] = useState(0)
  const recipes = useQuery({ queryKey: ['manager', 'recipes'], queryFn: API_ManagerRecipes })
  const fields = recipes.data?.dimensions[domain] ?? {}
  const params: AnalyticsFilters = {
    domain,
    entity: entity || undefined,
    metric,
    dataset_id: dataset ? Number(dataset) : undefined,
    limit: size,
    offset: page * size,
  }
  const query = useQuery({
    queryKey: ['manager', 'analytics', params],
    queryFn: () => API_ManagerAnalytics(params),
    ...polling,
  })
  return (
    <Card
      title="Thống kê dữ liệu"
      subtitle="Số bản ghi được tổng hợp theo từng nguồn; các bộ lọc thời gian và công thức tỷ lệ chưa được hỗ trợ."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs">
          Loại dữ liệu
          <select
            className={inputClass}
            value={entity}
            onChange={(event) => {
              setEntity(event.target.value)
              setMetric('record_count')
              setPage(0)
            }}
          >
            <option value="">Tất cả loại dữ liệu</option>
            {Object.keys(fields).map((key) => (
              <option key={key} value={key}>
                {label(key)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Thống kê
          <select
            className={inputClass}
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value)
              setPage(0)
            }}
          >
            <option value="record_count">Tổng số bản ghi</option>
            {(fields[entity] ?? []).map((field) => (
              <option key={field} value={`record_count_by_${field}`}>
                Theo {label(field).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Mã bộ dữ liệu (tùy chọn)
          <input
            className={inputClass}
            type="number"
            min={1}
            step={1}
            value={dataset}
            onChange={(event) => {
              const value = event.target.value
              if (!value || /^[1-9]\d*$/.test(value)) {
                setDataset(value)
                setPage(0)
              }
            }}
          />
        </label>
      </div>
      {recipes.isError && (
        <ErrorState
          message="Không thể tải danh sách phép thống kê."
          onRetry={() => void recipes.refetch()}
        />
      )}
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={getApiErrorMessage(query.error, 'Không thể tải thống kê.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {metric === 'record_count' ? (
            <MetricList items={query.data.items} />
          ) : !query.data.items.length ? (
            <EmptyState title="Chưa có dữ liệu nhóm này" />
          ) : (
            <div className="space-y-3">
              {query.data.items.map((item) => {
                const max = Math.max(
                  1,
                  ...query.data.items
                    .filter((other) => other.scope === item.scope && other.entity === item.entity)
                    .map((other) => other.value)
                )
                const group = Object.values(item.dimensions)
                  .map((value) =>
                    value === null
                      ? 'Chưa có thông tin'
                      : typeof value === 'object'
                        ? JSON.stringify(value)
                        : JSON.stringify(value)
                  )
                  .join(' · ')
                return (
                  <div
                    key={JSON.stringify([item.scope, item.entity, item.dimensions])}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex justify-between gap-4 text-sm">
                      <span>{group}</span>
                      <strong>{number(item.value)} bản ghi</strong>
                    </div>
                    <div aria-hidden="true" className="mt-2 h-2 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-[#334f72]"
                        style={{ width: `${(item.value / max) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 break-all text-xs text-slate-500">
                      {item.dataset_name} · {label(item.entity)} · Nguồn: {item.scope}
                    </p>
                  </div>
                )
              })}
              <p className="text-xs text-slate-500">
                Thanh biểu diễn tương đối giữa các nhóm cùng nguồn trong trang hiện tại.
              </p>
            </div>
          )}
          <Paging page={page} setPage={setPage} total={query.data.total} />
        </>
      )}
    </Card>
  )
}

function Datasets({ domain }: { domain: Domain }) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const query = useQuery({
    queryKey: ['manager', 'datasets', domain, page],
    queryFn: () => API_ManagerDatasets({ domain, limit: size, offset: page * size }),
    ...polling,
  })
  const detail = useQuery({
    queryKey: ['manager', 'dataset', selected],
    queryFn: () => API_ManagerDataset(selected!),
    enabled: selected !== null,
    ...polling,
  })
  return (
    <div className="space-y-5">
      <Card title="Bộ dữ liệu thuộc phòng phụ trách">
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Không thể tải bộ dữ liệu.')}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {!query.data.items.length ? (
              <EmptyState
                title="Chưa có bộ dữ liệu được phép xem"
                description="Bộ dữ liệu cần được gán đúng phòng sở hữu và đang hoạt động."
              />
            ) : (
              <div className="divide-y">
                {query.data.items.map((item) => (
                  <div
                    key={item.dataset_id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.dataset_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Mã {item.dataset_id} · {item.dataset_code} · {number(item.sources.length)}{' '}
                        nguồn báo cáo
                      </p>
                    </div>
                    <Button onClick={() => setSelected(item.dataset_id)}>
                      Xem {item.dataset_name}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Paging page={page} setPage={setPage} total={query.data.total} />
          </>
        )}
      </Card>
      <DetailDrawer
        open={Boolean(selected !== null)}
        onClose={() => setSelected(null)}
        title={detail.data?.dataset_name ?? 'Chi tiết bộ dữ liệu'}
      >
        {detail.isPending ? (
          <LoadingState />
        ) : detail.isError ? (
          <ErrorState
            message={getApiErrorMessage(detail.error, 'Không thể tải chi tiết.')}
            onRetry={() => void detail.refetch()}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">{detail.data.description}</p>
            {!detail.data.sources.length ? (
              <EmptyState title="Chưa có nguồn báo cáo đã công bố" />
            ) : (
              <div className="space-y-3">
                {detail.data.sources.map((source) => (
                  <div key={source.scope} className="rounded-xl border p-4">
                    <p className="text-sm font-semibold">{label(source.sync_status)}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">Nguồn: {source.scope}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Công bố: {formatDateTime(source.finished_at)}
                    </p>
                    {source.error_code && (
                      <p className="mt-2 text-xs text-rose-700">
                        Nguồn đang gặp lỗi tổng hợp. Liên hệ quản trị dữ liệu.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DetailDrawer>
    </div>
  )
}

function Issues({ domain }: { domain: Domain }) {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState('')
  const params: IssueFilters = {
    domain,
    status: status ? (status as 'ASSIGNED' | 'PENDING_VERIFICATION' | 'VERIFIED') : undefined,
    limit: size,
    offset: page * size,
  }
  const query = useQuery({
    queryKey: ['manager', 'issues', params],
    queryFn: () => API_ManagerIssues(params),
    ...polling,
  })
  const stats = useQuery({
    queryKey: ['manager', 'issue-stats', domain, status],
    queryFn: () => API_ManagerIssueStats({ domain, status: params.status }),
    ...polling,
  })
  const detail = useQuery({
    queryKey: ['manager', 'issue', selected],
    queryFn: () => API_ManagerIssue(selected),
    enabled: Boolean(selected),
    ...polling,
  })
  return (
    <div className="space-y-5">
      <Card
        title="Theo dõi yêu cầu sửa"
        subtitle="Xem tiến độ và lịch sử các yêu cầu được giao cho phòng phụ trách."
      >
        <label className="mb-4 flex items-center gap-2 text-sm">
          Trạng thái
          <select
            className={inputClass}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(0)
              setSelected('')
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {['ASSIGNED', 'PENDING_VERIFICATION', 'VERIFIED'].map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
        {stats.isError && (
          <ErrorState
            message="Không thể tải số lượng yêu cầu."
            onRetry={() => void stats.refetch()}
          />
        )}
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Không thể tải yêu cầu sửa.')}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {!query.data.length ? (
              <EmptyState title="Không có yêu cầu phù hợp" />
            ) : (
              <div className="divide-y">
                {query.data.map((item) => (
                  <div
                    key={item.issue_id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        <Tag tone={statusTone(item.status)}>{label(item.status)}</Tag> ·{' '}
                        {item.department_name} · Người phụ trách:{' '}
                        {item.assignee_user_id ?? 'Chưa phân công'}
                      </p>
                    </div>
                    <Button onClick={() => setSelected(item.issue_id)}>Xem yêu cầu</Button>
                  </div>
                ))}
              </div>
            )}
            <Paging
              page={page}
              setPage={setPage}
              total={stats.data?.total}
              count={query.data.length}
            />
          </>
        )}
      </Card>
      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected('')}
        title={detail.data?.title ?? 'Chi tiết yêu cầu'}
      >
        {detail.isPending ? (
          <LoadingState />
        ) : detail.isError ? (
          <ErrorState
            message={getApiErrorMessage(detail.error, 'Không thể tải yêu cầu.')}
            onRetry={() => void detail.refetch()}
          />
        ) : (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm">{detail.data.description}</p>
            <p className="text-sm">
              Trạng thái: {label(detail.data.status)} ·{' '}
              {number(detail.data.quarantine_records.length)} bản ghi cần kiểm tra
            </p>
            <h3 className="text-sm font-semibold">Lịch sử xử lý</h3>
            {!detail.data.history.length ? (
              <p className="text-sm text-slate-500">Chưa có lịch sử.</p>
            ) : (
              detail.data.history.map((event) => (
                <div key={event.event_id} className="rounded-lg border p-3 text-sm">
                  {label(event.to_status)} · Người thực hiện: {event.actor_id}
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}
