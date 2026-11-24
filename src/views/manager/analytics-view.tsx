'use client'

import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Filter } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getApiErrorMessage } from '@/api/http'
import { API_ManagerAnalysisOptions, API_ManagerAnalytics } from '@/api/manager/reports'
import type { AnalyticsFilters, ManagerContext } from '@/api/manager/reports'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  formatDateTime,
} from '@/components/page/page-parts'

import { ManagerGate, Paging, label, number } from './report-parts'

type Domain = 'hr' | 'academic' | 'admissions'

interface DomainEntityOption {
  entity: string
  label: string
  metrics: { id: string; label: string }[]
}

const DOMAIN_OPTIONS: Record<Domain, DomainEntityOption[]> = {
  hr: [
    {
      entity: 'employee',
      label: 'Nhân sự',
      metrics: [
        { id: 'record_count_by_employee_status', label: 'Theo trạng thái công tác' },
        { id: 'record_count_by_department_id', label: 'Theo phòng ban / đơn vị' },
        { id: 'record_count_by_position_id', label: 'Theo chức danh / ngạch' },
      ],
    },
    {
      entity: 'assignment',
      label: 'Phân công',
      metrics: [{ id: 'record_count_by_assignment_status', label: 'Theo trạng thái phân công' }],
    },
  ],
  academic: [
    {
      entity: 'student',
      label: 'Sinh viên',
      metrics: [
        { id: 'record_count_by_program_id', label: 'Theo chương trình đào tạo' },
        { id: 'record_count_by_student_status', label: 'Theo tình trạng học tập' },
        { id: 'record_count_by_academic_year', label: 'Theo khóa học / năm học' },
      ],
    },
    {
      entity: 'course',
      label: 'Học phần',
      metrics: [{ id: 'record_count_by_status', label: 'Theo trạng thái học phần' }],
    },
  ],
  admissions: [
    {
      entity: 'admission',
      label: 'Hồ sơ tuyển sinh',
      metrics: [
        { id: 'record_count_by_admission_status', label: 'Theo trạng thái hồ sơ' },
        { id: 'record_count_by_admission_method_id', label: 'Theo phương thức xét tuyển' },
        { id: 'record_count_by_major_id', label: 'Theo ngành đăng ký' },
      ],
    },
  ],
}

const COLORS = ['#ba1a3a', '#0d9488', '#2563eb', '#d97706', '#7c3aed', '#059669', '#e11d48']

export function ManagerAnalyticsView() {
  return <ManagerGate>{(context) => <AnalyticsWorkspace context={context} />}</ManagerGate>
}

function AnalyticsWorkspace({ context }: { context: ManagerContext }) {
  const defaultDomain = (context.default_domain ?? context.domains[0]?.domain ?? 'hr') as Domain
  const [domain, setDomain] = useState<Domain>(defaultDomain)
  const [dimensionValueInput, setDimensionValueInput] = useState('')
  const [appliedDimensionValue, setAppliedDimensionValue] = useState('')

  const defaultOptions = DOMAIN_OPTIONS[domain] ?? DOMAIN_OPTIONS.hr
  const optionsQuery = useQuery({
    queryKey: ['manager', 'analysis-options', context.user_id, domain],
    queryFn: () => API_ManagerAnalysisOptions(domain),
    retry: false,
    staleTime: 60_000,
  })
  const remoteOptions = optionsQuery.data?.filter((item) => !item.domain || item.domain === domain)
  const entityOptions = remoteOptions?.length
    ? remoteOptions.map(({ entity, metrics }) => ({
        entity,
        label: label(entity),
        metrics: metrics.map(({ metric, name }) => ({
          id: metric,
          label:
            name && name !== metric
              ? name
              : metric.startsWith('record_count_by_')
                ? `Số bản ghi theo ${label(metric.slice('record_count_by_'.length)).toLowerCase()}`
                : label(metric),
        })),
      }))
    : defaultOptions
  const [selectedEntity, setSelectedEntity] = useState(defaultOptions[0]?.entity ?? 'employee')

  const currentEntityConfig =
    entityOptions.find((e) => e.entity === selectedEntity) ?? entityOptions[0]!
  const [selectedMetric, setSelectedMetric] = useState(
    defaultOptions[0]?.metrics[0]?.id ?? 'record_count'
  )
  const effectiveMetric = currentEntityConfig.metrics.find(
    (metric) => metric.id === selectedMetric
  ) ??
    currentEntityConfig.metrics[0] ?? { id: 'record_count', label: label('record_count') }
  const canFilterDimension = effectiveMetric.id.startsWith('record_count_by_')

  const [page, setPage] = useState(0)
  const pageSize = 20

  const params: AnalyticsFilters = {
    domain,
    entity: currentEntityConfig.entity,
    metric: effectiveMetric.id,
    dimension_value: canFilterDimension ? appliedDimensionValue || undefined : undefined,
    limit: pageSize,
    offset: page * pageSize,
  }

  const query = useQuery({
    queryKey: ['manager', 'analytics', context.user_id, params],
    queryFn: () => API_ManagerAnalytics(params),
    refetchInterval: 15_000,
  })

  // Khi đổi entity thì đổi luôn metric đầu tiên tương ứng
  function handleEntityChange(newEntity: string) {
    setSelectedEntity(newEntity)
    const nextCfg = entityOptions.find((e) => e.entity === newEntity)
    if (nextCfg?.metrics[0]) {
      setSelectedMetric(nextCfg.metrics[0].id)
    }
    resetDimensionFilter()
  }

  function handleDomainChange(newDomain: Domain) {
    setDomain(newDomain)
    const nextEntityOpts = DOMAIN_OPTIONS[newDomain] ?? []
    if (nextEntityOpts[0]) {
      setSelectedEntity(nextEntityOpts[0].entity)
      setSelectedMetric(nextEntityOpts[0].metrics[0]?.id ?? 'record_count')
    }
    resetDimensionFilter()
  }

  function resetDimensionFilter() {
    setDimensionValueInput('')
    setAppliedDimensionValue('')
    setPage(0)
  }

  const chartData = (query.data?.items ?? []).map((item, idx) => {
    const dim = Object.entries(item.dimensions)[0]
    const name = dim ? `${label(dim[0])}: ${label(String(dim[1]))}` : `Nhóm #${idx + 1}`
    return {
      name,
      value: item.value,
      dataset: item.dataset_name,
      finishedAt: item.finished_at,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Quản lý đơn vị</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">Phân tích dữ liệu</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Phân tích số liệu {label(domain)}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Khai thác chuyên sâu các biểu đồ thống kê theo cơ cấu, trạng thái và tỷ lệ phân bổ.
          </p>
        </div>

        {context.domains.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Lĩnh vực:
            <select
              className="shadow-xs rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={domain}
              onChange={(e) => handleDomainChange(e.target.value as Domain)}
            >
              {context.domains.map((item) => (
                <option key={item.domain} value={item.domain}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Filter Control Bar */}
      <div className="shadow-xs flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Filter className="size-4 text-slate-400" aria-hidden="true" />
          <span>Bộ lọc:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            Thực thể
            <select
              value={currentEntityConfig.entity}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="shadow-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {entityOptions.map((opt) => (
                <option key={opt.entity} value={opt.entity}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            Chỉ số
            <select
              value={effectiveMetric.id}
              onChange={(e) => {
                setSelectedMetric(e.target.value)
                resetDimensionFilter()
              }}
              className="shadow-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {currentEntityConfig.metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {canFilterDimension && (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault()
                setAppliedDimensionValue(dimensionValueInput.trim())
                setPage(0)
              }}
            >
              <input
                type="search"
                aria-label="Lọc theo giá trị chiều"
                placeholder="Lọc giá trị chiều…"
                value={dimensionValueInput}
                onChange={(event) => setDimensionValueInput(event.target.value)}
                className="shadow-xs w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="submit" variant="outline" className="h-7 px-2.5 text-xs">
                Lọc
              </Button>
            </form>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => void query.refetch()}
            reading={query.isFetching}
            className="shadow-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {query.isPending ? (
        <LoadingState label="Đang tổng hợp số liệu phân tích…" />
      ) : query.isError ? (
        <ErrorState
          message={getApiErrorMessage(query.error, 'Không thể tải số liệu phân tích.')}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.items.length ? (
        <EmptyState
          title="Chưa có dữ liệu phân tích cho tiêu chí này"
          description="Báo cáo phân tích sẽ xuất hiện khi dữ liệu Gold được nạp và tổng hợp."
        />
      ) : (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Bar Chart Card */}
            <Card
              title="Phân bổ số lượng bản ghi"
              subtitle={`Thực thể ${currentEntityConfig.label} theo ${effectiveMetric.label.toLowerCase()}`}
            >
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        color: '#0f172a',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(val) => [number(Number(val)), 'Số lượng']}
                    />
                    <Bar dataKey="value" fill="#ba1a3a" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Pie / Distribution Card */}
            <Card title="Cơ cấu tỷ lệ" subtitle="Tỷ trọng giữa các nhóm trong trang hiện tại">
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [number(Number(val)), 'Bản ghi']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        color: '#0f172a',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Detailed Progress Table */}
          <Card
            title="Chi tiết từng nhóm chỉ số"
            subtitle="Mỗi nguồn được giữ riêng; không cộng dồn thành số lượng người duy nhất."
          >
            <div className="divide-y divide-slate-100">
              {query.data.items.map((item) => {
                const max = Math.max(...query.data.items.map((m) => m.value), 1)
                const dim = Object.entries(item.dimensions)[0]
                const dimLabel = dim ? `${label(dim[0])}: ${label(String(dim[1]))}` : 'Khác'
                const pct = ((item.value / max) * 100).toFixed(1)
                return (
                  <div
                    key={JSON.stringify([item.scope, item.dimensions, item.value])}
                    className="py-3.5 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{dimLabel}</span>
                      <span className="font-bold tabular-nums text-primary">
                        {number(item.value)} bản ghi
                      </span>
                    </div>

                    <div aria-hidden="true" className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-500">
                      <span>
                        Nguồn: {item.dataset_name} · Scope: {item.scope}
                      </span>
                      <span>Cập nhật: {formatDateTime(item.finished_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <Paging page={page} setPage={setPage} total={query.data.total} />
          </Card>
        </div>
      )}
    </div>
  )
}
