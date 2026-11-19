'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Clock,
  Database,
  ExternalLink,
  Eye,
  Filter,
  Info,
  Layers,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ViewerDatasetDetail,
  API_ViewerDatasets,
  API_ViewerDomainAnalytics,
  API_ViewerDomainOverview,
  API_ViewerQualityIssues,
} from '@/api/viewer'
import type {
  ViewerContext,
  ViewerDatasetDetail,
  ViewerMetricItem,
} from '@/api/viewer'
import { DetailDrawer } from '@/components/page/detail-drawer'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
  formatDateTime,
} from '@/components/page/page-parts'
import { useDomain } from '@/hooks/use-domain'
import { cn } from '@/lib/utils'

import {
  DOMAIN_NAMES,
  DomainStatusBadge,
  IssueStatusBadge,
  ViewerGate,
  ViewerPaging,
  labelDomain,
  numberFormat,
} from './viewer-parts'

type DomainCode = 'academic' | 'hr' | 'admissions'

const DOMAIN_CONFIG: Record<
  DomainCode,
  {
    title: string
    entities: { entity: string; label: string }[]
    metrics: { id: string; label: string }[]
  }
> = {
  academic: {
    title: 'Phân hệ Đào tạo',
    entities: [
      { entity: 'student', label: 'Sinh viên' },
      { entity: 'course', label: 'Học phần' },
      { entity: 'class', label: 'Lớp học phần' },
    ],
    metrics: [
      { id: 'record_count', label: 'Tổng số bản ghi' },
      { id: 'record_count_by_program_id', label: 'Theo chương trình đào tạo' },
      { id: 'record_count_by_student_status', label: 'Theo tình trạng học tập' },
      { id: 'record_count_by_academic_year', label: 'Theo năm học' },
    ],
  },
  hr: {
    title: 'Phân hệ Nhân sự',
    entities: [
      { entity: 'employee', label: 'Nhân sự' },
      { entity: 'assignment', label: 'Phân công công tác' },
      { entity: 'department', label: 'Phòng ban / Đơn vị' },
    ],
    metrics: [
      { id: 'record_count', label: 'Tổng số bản ghi' },
      { id: 'record_count_by_employee_status', label: 'Theo trạng thái công tác' },
      { id: 'record_count_by_department_id', label: 'Theo đơn vị công tác' },
      { id: 'record_count_by_position_id', label: 'Theo chức vụ' },
    ],
  },
  admissions: {
    title: 'Phân hệ Tuyển sinh',
    entities: [
      { entity: 'admission', label: 'Hồ sơ tuyển sinh' },
      { entity: 'applicant', label: 'Thí sinh' },
    ],
    metrics: [
      { id: 'record_count', label: 'Tổng số bản ghi' },
      { id: 'record_count_by_admission_status', label: 'Theo trạng thái hồ sơ' },
      { id: 'record_count_by_admission_method_id', label: 'Theo phương thức xét tuyển' },
      { id: 'record_count_by_major_id', label: 'Theo ngành đăng ký' },
    ],
  },
}

export function ViewerDomainsView() {
  return (
    <ViewerGate>
      {(context) => <ViewerDomainsWorkspace context={context} />}
    </ViewerGate>
  )
}

function ViewerDomainsWorkspace({ context }: { context: ViewerContext }) {
  const { domain, setDomain } = useDomain()
  const searchParams = useSearchParams()
  const initialDomain = (searchParams.get('domain') as DomainCode) || 'academic'
  const [selectedDomain, setSelectedDomain] = useState<DomainCode>(
    ['academic', 'hr', 'admissions'].includes(initialDomain)
      ? initialDomain
      : domain.code !== 'all' && ['academic', 'hr', 'admissions'].includes(domain.code)
        ? (domain.code as DomainCode)
        : 'academic'
  )

  const cfg = DOMAIN_CONFIG[selectedDomain]

  // Filter states for analytics
  const [selectedEntity, setSelectedEntity] = useState<string>(cfg.entities[0]?.entity ?? '')
  const [selectedMetric, setSelectedMetric] = useState<string>('record_count')
  const [dimensionValue, setDimensionValue] = useState<string>('')
  const [analyticsPage, setAnalyticsPage] = useState<number>(0)
  const analyticsPageSize = 20

  // Filter states for datasets
  const [datasetPage, setDatasetPage] = useState<number>(0)
  const [inspectDatasetId, setInspectDatasetId] = useState<number | null>(null)
  const datasetPageSize = 10

  // When domain changes, reset entity/metric
  function handleDomainChange(newDomain: DomainCode, updateGlobal = true) {
    setSelectedDomain(newDomain)
    if (updateGlobal) {
      setDomain(newDomain)
    }
    const nextCfg = DOMAIN_CONFIG[newDomain]
    setSelectedEntity(nextCfg.entities[0]?.entity ?? '')
    setSelectedMetric('record_count')
    setDimensionValue('')
    setAnalyticsPage(0)
    setDatasetPage(0)
  }

  // Đồng bộ khi người dùng đổi phân hệ từ DomainSelector (header / sidebar)
  useEffect(() => {
    if (
      domain.code !== 'all' &&
      (domain.code === 'academic' || domain.code === 'hr' || domain.code === 'admissions')
    ) {
      if (domain.code !== selectedDomain) {
        handleDomainChange(domain.code as DomainCode, false)
      }
    }
  }, [domain.code, selectedDomain])

  // 1. Overview per domain
  const domainOverviewQuery = useQuery({
    queryKey: ['viewer', 'domains', selectedDomain, 'overview'],
    queryFn: () => API_ViewerDomainOverview(selectedDomain),
    refetchInterval: 15_000,
  })

  // 2. Analytics per domain
  const analyticsQuery = useQuery({
    queryKey: [
      'viewer',
      'domains',
      selectedDomain,
      'analytics',
      selectedEntity,
      selectedMetric,
      dimensionValue,
      analyticsPage,
    ],
    queryFn: () =>
      API_ViewerDomainAnalytics(selectedDomain, {
        entity: selectedEntity || undefined,
        metric: selectedMetric || undefined,
        dimension_value: dimensionValue || undefined,
        limit: analyticsPageSize,
        offset: analyticsPage * analyticsPageSize,
      }),
    refetchInterval: 15_000,
  })

  // 3. Datasets per domain
  const datasetsQuery = useQuery({
    queryKey: ['viewer', 'datasets', selectedDomain, datasetPage],
    queryFn: () =>
      API_ViewerDatasets({
        domain: selectedDomain,
        limit: datasetPageSize,
        offset: datasetPage * datasetPageSize,
      }),
    refetchInterval: 15_000,
  })

  // 4. Dataset detail drawer
  const datasetDetailQuery = useQuery({
    queryKey: ['viewer', 'dataset', inspectDatasetId],
    queryFn: () => API_ViewerDatasetDetail(inspectDatasetId!),
    enabled: inspectDatasetId !== null,
  })

  const domainOverview = domainOverviewQuery.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Điều hành</span>
          <span>/</span>
          <span>Dashboard theo phân hệ</span>
          <span>/</span>
          <span className="font-semibold text-slate-700">{labelDomain(selectedDomain)}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Phân tích dữ liệu {labelDomain(selectedDomain)}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Khai thác và giám sát các chỉ số Gold, metadata bộ dữ liệu và tiến độ xử lý dữ liệu.
        </p>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        {(['academic', 'hr', 'admissions'] as const).map((dom) => {
          const isActive = selectedDomain === dom
          return (
            <button
              key={dom}
              type="button"
              onClick={() => handleDomainChange(dom)}
              className={cn(
                'relative px-5 py-3 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {labelDomain(dom)}
            </button>
          )
        })}
      </div>

      {/* Domain Overview Card */}
      {domainOverviewQuery.isPending ? (
        <LoadingState label="Đang tải thông tin phân hệ…" />
      ) : domainOverviewQuery.isError ? (
        <ErrorState
          message={getApiErrorMessage(domainOverviewQuery.error, 'Không thể tải tổng quan phân hệ.')}
          onRetry={() => void domainOverviewQuery.refetch()}
        />
      ) : domainOverview ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-bold text-slate-900">{cfg.title}</span>
                <DomainStatusBadge status={domainOverview.status} />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="size-3.5 text-slate-400" />
                <span>
                  {domainOverview.last_updated_at
                    ? `Công bố Gold gần nhất: ${formatDateTime(domainOverview.last_updated_at)}`
                    : 'Chưa có mốc công bố Gold'}
                </span>
              </div>
            </div>

            {/* Highlight Metric nếu có */}
            {domainOverview.highlight_metric && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-2.5">
                <Sparkles className="size-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                    Chỉ số nổi bật ({domainOverview.highlight_metric.entity})
                  </p>
                  <p className="text-xl font-bold tabular-nums text-emerald-900">
                    {numberFormat(domainOverview.highlight_metric.value)}{' '}
                    <span className="text-xs font-normal text-emerald-700">
                      {domainOverview.highlight_metric.unit}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Thông báo trạng thái nếu không READY */}
          {domainOverview.message && domainOverview.status !== 'READY' && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800">
              <Info className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-semibold">Thông tin tiến độ: </span>
                <span>{domainOverview.message}</span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Analytics Section */}
      <Card
        title={`Thống kê chỉ số Gold (${labelDomain(selectedDomain)})`}
        subtitle="Dữ liệu tổng hợp từ các pipeline Gold hiện hành."
      >
        {/* Filter Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Entity selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Filter className="size-3.5 text-slate-400" />
              <span>Thực thể:</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value)
                  setAnalyticsPage(0)
                }}
              >
                <option value="">Tất cả thực thể</option>
                {cfg.entities.map((item) => (
                  <option key={item.entity} value={item.entity}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span>Chỉ số:</span>
              <select
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedMetric}
                onChange={(e) => {
                  setSelectedMetric(e.target.value)
                  setAnalyticsPage(0)
                }}
              >
                {cfg.metrics.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dimension value filter (nếu metric có _by_) */}
            {selectedMetric.includes('_by_') && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <span>Nhóm:</span>
                <input
                  type="text"
                  placeholder="Lọc theo giá trị nhóm…"
                  value={dimensionValue}
                  onChange={(e) => {
                    setDimensionValue(e.target.value)
                    setAnalyticsPage(0)
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* Analytics Query Results */}
        {analyticsQuery.isPending ? (
          <LoadingState label="Đang tải số liệu thống kê Gold…" />
        ) : analyticsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(analyticsQuery.error, 'Không thể tải thống kê Gold.')}
            onRetry={() => void analyticsQuery.refetch()}
          />
        ) : !analyticsQuery.data?.items.length ? (
          <EmptyState
            title="Chưa có dữ liệu thống kê"
            description="Không tìm thấy chỉ số Gold nào phù hợp với bộ lọc này."
          />
        ) : (
          <div className="space-y-6">
            {/* Chart visualization */}
            {analyticsQuery.data.items.length > 1 && (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsQuery.data.items.map((item, idx) => {
                      const dimKey = Object.keys(item.dimensions)[0]
                      const dimVal = dimKey ? String(item.dimensions[dimKey]) : ''
                      return {
                        name: dimVal ? dimVal : `${item.entity} #${idx + 1}`,
                        value: item.value,
                        dataset: item.dataset_name,
                      }
                    })}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#cbd5e1"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(val) => [numberFormat(Number(val)), 'Bản ghi']}
                    />
                    <Bar dataKey="value" fill="#ba1a3a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Breakdown item list */}
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
              {analyticsQuery.data.items.map((item) => {
                const dimKey = Object.keys(item.dimensions)[0]
                const dimLabel = dimKey
                  ? `${dimKey}: ${String(item.dimensions[dimKey])}`
                  : item.scope
                return (
                  <div
                    key={JSON.stringify([item.dataset_id, item.scope, item.dimensions, item.value])}
                    className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 transition-colors hover:bg-slate-50/70"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{dimLabel}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.dataset_name} · Thực thể: {item.entity} · Chỉ số: {item.metric}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold tabular-nums text-slate-900">
                        {numberFormat(item.value)}
                      </span>
                      <span className="ml-1 text-xs text-slate-500">{item.unit ?? 'bản ghi'}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <ViewerPaging
              page={analyticsPage}
              setPage={setAnalyticsPage}
              total={analyticsQuery.data.total}
              limit={analyticsPageSize}
            />
          </div>
        )}
      </Card>

      {/* Datasets Metadata Section */}
      <Card
        title={`Danh mục bộ dữ liệu (${labelDomain(selectedDomain)})`}
        subtitle="Danh sách các bộ dữ liệu đang hoạt động thuộc phân hệ này."
      >
        {datasetsQuery.isPending ? (
          <LoadingState label="Đang tải danh sách bộ dữ liệu…" />
        ) : datasetsQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(datasetsQuery.error, 'Không thể tải bộ dữ liệu.')}
            onRetry={() => void datasetsQuery.refetch()}
          />
        ) : !datasetsQuery.data?.items.length ? (
          <EmptyState
            title="Chưa có bộ dữ liệu"
            description="Phân hệ này chưa có bộ dữ liệu nào đang hoạt động."
          />
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
              {datasetsQuery.data.items.map((ds) => (
                <div
                  key={ds.dataset_id}
                  className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 transition-colors hover:bg-slate-50/70"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{ds.name}</span>
                      <Tag tone={ds.status === 'ACTIVE' ? 'emerald' : 'slate'}>{ds.status}</Tag>
                    </div>
                    <p className="text-xs text-slate-600">
                      {ds.description || 'Chưa có mô tả chi tiết cho bộ dữ liệu này.'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Phòng sở hữu: {ds.department_name ?? 'Toàn trường'}</span>
                      {ds.updated_at && (
                        <>
                          <span>·</span>
                          <span>Cập nhật: {formatDateTime(ds.updated_at)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => setInspectDatasetId(ds.dataset_id)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <TableIcon className="size-3.5 text-slate-500" />
                    <span>Xem bảng & cột</span>
                  </Button>
                </div>
              ))}
            </div>

            <ViewerPaging
              page={datasetPage}
              setPage={setDatasetPage}
              total={datasetsQuery.data.total}
              limit={datasetPageSize}
            />
          </div>
        )}
      </Card>

      {/* Dataset Detail Drawer */}
      <DetailDrawer
        open={inspectDatasetId !== null}
        onClose={() => setInspectDatasetId(null)}
        title={datasetDetailQuery.data?.name ?? 'Chi tiết cấu trúc bộ dữ liệu'}
      >
        {datasetDetailQuery.isPending ? (
          <LoadingState label="Đang đọc cấu trúc bảng và cột…" />
        ) : datasetDetailQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(datasetDetailQuery.error, 'Không thể tải chi tiết bộ dữ liệu.')}
            onRetry={() => void datasetDetailQuery.refetch()}
          />
        ) : datasetDetailQuery.data ? (
          <div className="space-y-6 text-sm text-slate-800">
            <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <p>
                <span className="font-semibold text-slate-600">Mã bộ dữ liệu:</span>{' '}
                {datasetDetailQuery.data.dataset_id}
              </p>
              <p>
                <span className="font-semibold text-slate-600">Phân hệ:</span>{' '}
                {labelDomain(datasetDetailQuery.data.domain)}
              </p>
              <p>
                <span className="font-semibold text-slate-600">Phòng sở hữu:</span>{' '}
                {datasetDetailQuery.data.department_name ?? 'Toàn trường'}
              </p>
              {datasetDetailQuery.data.description && (
                <p>
                  <span className="font-semibold text-slate-600">Mô tả:</span>{' '}
                  {datasetDetailQuery.data.description}
                </p>
              )}
            </div>

            {/* Tables and columns list */}
            <div>
              <h3 className="mb-3 font-bold text-slate-900">Cấu trúc các bảng dữ liệu</h3>
              {!datasetDetailQuery.data.tables?.length ? (
                <p className="text-xs text-slate-400">Chưa có thông tin bảng cho bộ dữ liệu này.</p>
              ) : (
                <div className="space-y-4">
                  {datasetDetailQuery.data.tables.map((table) => (
                    <div
                      key={table.table_name}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs"
                    >
                      <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-2">
                        <span className="font-semibold text-slate-800 text-xs font-mono">
                          {table.table_name}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {table.columns.map((col) => (
                          <div
                            key={col.name}
                            className="flex items-center justify-between px-3.5 py-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-medium text-slate-800">
                                {col.name}
                              </span>
                              {col.description && (
                                <p className="text-slate-400 text-2xs">{col.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-mono text-slate-600">
                                {col.type}
                              </span>
                              {col.nullable && (
                                <span className="text-2xs text-slate-400">nullable</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
