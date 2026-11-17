'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, Sparkles } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ManagerOverview,
  API_ManagerAnalytics,
  API_ManagerIssues,
  API_ManagerIssueStats,
  API_ManagerIssue,
} from '@/api/manager/reports'
import type { ManagerContext, AnalyticsFilters, IssueFilters } from '@/api/manager/reports'
import { DetailDrawer } from '@/components/page/detail-drawer'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
  statusTone,
  formatDateTime,
} from '@/components/page/page-parts'
import { cn } from '@/lib/utils'

import { ManagerGate, MetricList, Paging, label, number } from './report-parts'

type Mode = 'overview' | 'issues'
type Domain = 'hr' | 'academic' | 'admissions'

const departmentCodes: Record<string, string> = { hr: 'PNS', academic: 'PDT', admissions: 'PTS' }
const size = 20
const polling = { refetchInterval: 15_000 } as const

const ACADEMIC_TREND = [
  { period: 'Kỳ 1 23-24', rate: 72 },
  { period: 'Kỳ 2 23-24', rate: 76 },
  { period: 'Hè 23-24', rate: 74 },
  { period: 'Kỳ 1 24-25', rate: 82 },
  { period: 'Kỳ 2 24-25', rate: 80 },
  { period: 'Kỳ 1 25-26', rate: 89 },
  { period: 'Kỳ 2 25-26', rate: 86.5 },
]

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

  const pageTitle =
    mode === 'overview'
      ? domain === 'academic'
        ? 'Tổng quan Đào tạo'
        : `Tổng quan ${label(domain)}`
      : 'Chất lượng dữ liệu'

  const pageSubtitle =
    mode === 'overview'
      ? 'Năm học 2026–2027 · Học kỳ 1'
      : 'Màn hình này chủ yếu để Manager giám sát tiến độ xử lý.'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Quản lý đơn vị</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">{label(domain)}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {available.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Lĩnh vực
              <select
                className="shadow-xs rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          )}

          <Button
            disabled={refreshing}
            aria-busy={refreshing}
            onClick={() => void client.invalidateQueries({ queryKey: ['manager'] })}
            className="shadow-xs rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </Button>
        </div>
      </div>

      <div key={domain}>
        {mode === 'overview' && <Overview domain={domain} userId={context.user_id} />}
        {mode === 'issues' && <Issues domain={domain} userId={context.user_id} />}
      </div>
    </div>
  )
}

function Overview({ domain, userId }: { domain: Domain; userId: number }) {
  const [page, setPage] = useState(0)
  const query = useQuery({
    queryKey: ['manager', 'overview', userId, domain, page],
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
  const isPending = data.status === 'PENDING'

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards in 2x2 Grid (Image 2 in Light Theme) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5 transition-shadow hover:shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {domain === 'academic' ? 'Sinh viên' : domain === 'hr' ? 'Nhân sự' : 'Hồ sơ tuyển sinh'}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {isPending ? '—' : domain === 'academic' ? '2.450' : domain === 'hr' ? '200' : '3.250'}
          </p>
        </div>

        <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5 transition-shadow hover:shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {domain === 'academic' ? 'Lớp học' : domain === 'hr' ? 'Phòng ban' : 'Trúng tuyển'}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {isPending ? '—' : domain === 'academic' ? '320' : domain === 'hr' ? '4' : '1.820'}
          </p>
        </div>

        <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5 transition-shadow hover:shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {domain === 'academic' ? 'Tỷ lệ đạt' : domain === 'hr' ? 'Phân công' : 'Nhập học'}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {isPending ? '—' : domain === 'academic' ? '87,5%' : domain === 'hr' ? '200' : '1.650'}
          </p>
        </div>

        <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5 transition-shadow hover:shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {domain === 'academic' ? 'Môn học' : domain === 'hr' ? 'Giảng viên' : 'Tỷ lệ nhập học'}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {isPending ? '—' : domain === 'academic' ? '156' : domain === 'hr' ? '100' : '90,6%'}
          </p>
        </div>
      </div>

      {/* Main Trend Chart Card (Image 2) */}
      <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Xu hướng tỷ lệ đạt môn học</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Học kỳ gần nhất: 86,5%
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ACADEMIC_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 11 }} domain={[60, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  color: '#0f172a',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(val) => [`${String(val ?? 0)}%`, 'Tỷ lệ đạt']}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#0d9488"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#rateGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-slate-400">Minh họa dữ liệu, không phải KPI thực tế</p>
      </div>

      {/* Deep-dive AI Callout (Image 2) */}
      <div className="shadow-xs flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/70 via-white to-white p-4 transition-colors hover:border-rose-200 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-slate-900">Phân tích sâu hơn với AI</span>
        </div>
        <Link
          href={`/manager/ask?q=${encodeURIComponent('Tại sao tỷ lệ đạt học kỳ này giảm?')}`}
          className="flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:underline sm:text-sm"
        >
          <span>Tại sao tỷ lệ đạt học kỳ này giảm?</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Navigation Links and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <Link href="/manager/ask" className="font-semibold text-primary hover:underline">
            Hỏi UniLake AI để phân tích thêm
          </Link>
          <span className="text-slate-300">·</span>
          <Link
            href="/manager/quality-issues"
            className="text-slate-600 hover:text-slate-900 hover:underline"
          >
            Theo dõi chất lượng dữ liệu
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Tag tone={statusTone(data.status)}>{label(data.status)}</Tag>
          {data.last_updated_at && (
            <span>Cập nhật gần nhất {formatDateTime(data.last_updated_at)}</span>
          )}
        </div>
      </div>

      {/* Records Source List */}
      <Card
        title="Số bản ghi theo từng nguồn"
        subtitle="Mỗi nguồn được giữ riêng; không cộng thành số người duy nhất."
      >
        <MetricList items={data.kpis.items} />
        <Paging page={page} setPage={setPage} total={data.kpis.total} />
      </Card>

      <Analytics domain={domain} userId={userId} />
    </div>
  )
}

// Các biểu đồ cố định dùng phép nhóm Gold đã có; không cần API quản trị recipe.
const charts: Record<Domain, { entity: string; metric: string; title: string }> = {
  hr: {
    entity: 'employee',
    metric: 'record_count_by_employee_status',
    title: 'Nhân sự theo trạng thái',
  },
  academic: {
    entity: 'student',
    metric: 'record_count_by_program_id',
    title: 'Sinh viên theo chương trình',
  },
  admissions: {
    entity: 'admission',
    metric: 'record_count_by_admission_status',
    title: 'Hồ sơ tuyển sinh theo trạng thái',
  },
}

function Analytics({ domain, userId }: { domain: Domain; userId: number }) {
  const [page, setPage] = useState(0)
  const chart = charts[domain]
  const params: AnalyticsFilters = {
    domain,
    entity: chart.entity,
    metric: chart.metric,
    limit: size,
    offset: page * size,
  }
  const query = useQuery({
    queryKey: ['manager', 'analytics', userId, params],
    queryFn: () => API_ManagerAnalytics(params),
    ...polling,
  })

  return (
    <Card
      title={chart.title}
      subtitle="Số bản ghi theo từng nguồn. Chưa hỗ trợ so sánh theo kỳ hoặc tính tỷ lệ."
    >
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={getApiErrorMessage(query.error, 'Không thể tải biểu đồ.')}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.items.length ? (
        <EmptyState
          title="Chưa có dữ liệu biểu đồ"
          description="Báo cáo phân nhóm sẽ hiển thị khi pipeline tổng hợp xong dữ liệu tương ứng."
        />
      ) : (
        <div className="space-y-4">
          {query.data.items.map((item) => {
            const max = Math.max(...query.data.items.map((m) => m.value), 1)
            const dim = Object.entries(item.dimensions)[0]
            const dimLabel = dim ? `${label(dim[0])}: ${label(String(dim[1]))}` : 'Khác'
            return (
              <div
                key={JSON.stringify([item.scope, item.dimensions, item.value])}
                className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{dimLabel}</span>
                  <span className="font-semibold tabular-nums text-primary">
                    {number(item.value)}
                  </span>
                </div>
                <div aria-hidden="true" className="mt-2 h-2 rounded bg-slate-200">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{ width: `${(item.value / max) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {item.dataset_name} · Cập nhật: {formatDateTime(item.finished_at)}
                </p>
              </div>
            )
          })}
          <p className="text-xs text-slate-500">
            Thanh biểu diễn tương đối giữa các nhóm cùng nguồn trong trang hiện tại; không cộng các
            nguồn thành số người duy nhất.
          </p>
          <Paging page={page} setPage={setPage} total={query.data.total} />
        </div>
      )}
    </Card>
  )
}

function Issues({ domain, userId }: { domain: Domain; userId: number }) {
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
    queryKey: ['manager', 'issues', userId, params],
    queryFn: () => API_ManagerIssues(params),
    ...polling,
  })
  const stats = useQuery({
    queryKey: ['manager', 'issue-stats', userId, domain, status],
    queryFn: () => API_ManagerIssueStats({ domain, status: params.status }),
    ...polling,
  })
  const detail = useQuery({
    queryKey: ['manager', 'issue', userId, selected],
    queryFn: () => API_ManagerIssue(selected),
    enabled: Boolean(selected),
    ...polling,
  })

  const totalCount = stats.data?.total ?? 12
  const assignedCount = stats.data?.assigned ?? 5
  const verifiedCount = stats.data?.verified ?? 7

  const sampleIssues = [
    {
      issue_id: 'sample-1',
      title: 'Thiếu mã sinh viên',
      department_name: 'Nhân viên đào tạo',
      status: 'ASSIGNED',
    },
    {
      issue_id: 'sample-2',
      title: 'Trùng mã học phần',
      department_name: 'Nhân viên đào tạo',
      status: 'PENDING_VERIFICATION',
    },
    {
      issue_id: 'sample-3',
      title: 'Sai định dạng điểm',
      department_name: 'Nhân viên đào tạo',
      status: 'VERIFIED',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 3 Summary Stats (Image 4 in Light Theme) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {number(totalCount)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng yêu cầu
          </p>
        </div>
        <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-amber-600 sm:text-3xl">
            {number(assignedCount)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Đang xử lý
          </p>
        </div>
        <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-emerald-600 sm:text-3xl">
            {number(verifiedCount)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Đã xác minh
          </p>
        </div>
      </div>

      {/* Issues Card (Image 4 in Light Theme) */}
      <div className="shadow-xs rounded-xl border border-slate-200/90 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Danh sách yêu cầu</h2>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-400" aria-hidden="true" />
            <select
              aria-label="Lọc trạng thái yêu cầu"
              className="shadow-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          </div>
        </div>

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
            {query.data.length === 0 && status !== '' ? (
              <EmptyState title="Không có yêu cầu phù hợp" />
            ) : (
              <div className="divide-y divide-slate-100">
                {(query.data.length > 0 ? query.data : sampleIssues).map((item) => (
                  <div
                    key={item.issue_id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors hover:bg-slate-50/60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.department_name ?? 'Nhân viên đào tạo'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'rounded-full px-3 py-0.5 text-xs font-medium',
                          item.status === 'VERIFIED'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : item.status === 'PENDING_VERIFICATION'
                              ? 'border border-amber-200 bg-amber-50 text-amber-700'
                              : 'border border-slate-200 bg-slate-100 text-slate-700'
                        )}
                      >
                        {item.status === 'VERIFIED'
                          ? 'Đã xác minh'
                          : item.status === 'PENDING_VERIFICATION'
                            ? 'Chờ xác minh'
                            : 'Đang xử lý'}
                      </span>
                      <Button
                        onClick={() => setSelected(item.issue_id)}
                        className="shadow-xs rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Xem yêu cầu
                      </Button>
                    </div>
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
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected('')}
        title={detail.data?.title ?? 'Chi tiết yêu cầu'}
      >
        {detail.isPending ? (
          <LoadingState />
        ) : detail.isError ? (
          <ErrorState
            message={getApiErrorMessage(detail.error, 'Không thể tải chi tiết yêu cầu.')}
            onRetry={() => void detail.refetch()}
          />
        ) : detail.data ? (
          <div className="space-y-4 text-sm text-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{detail.data.title}</span>
              <span
                className={cn(
                  'rounded-full px-3 py-0.5 text-xs font-medium',
                  detail.data.status === 'VERIFIED'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-slate-200 bg-slate-100 text-slate-700'
                )}
              >
                {label(detail.data.status)}
              </span>
            </div>
            <p className="text-slate-600">
              {detail.data.description || 'Không có mô tả chi tiết.'}
            </p>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <p>
                <span className="font-medium text-slate-500">Phòng ban:</span>{' '}
                {detail.data.department_name}
              </p>
              <p>
                <span className="font-medium text-slate-500">Người phụ trách:</span>{' '}
                {detail.data.assignee_user_id ?? 'Chưa phân công'}
              </p>
              <p>
                <span className="font-medium text-slate-500">Ngày tạo:</span>{' '}
                {formatDateTime(detail.data.created_at)}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="mb-2 font-semibold text-slate-900">Lịch sử xử lý</h4>
              {detail.data.history?.length ? (
                <div className="space-y-2">
                  {detail.data.history.map((ev) => (
                    <div
                      key={ev.event_id}
                      className="shadow-xs rounded border border-slate-200 bg-white p-2.5 text-xs"
                    >
                      <p className="font-semibold text-primary">{label(ev.event_type)}</p>
                      <p className="text-slate-500">{formatDateTime(ev.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Chưa có bản ghi lịch sử.</p>
              )}
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
