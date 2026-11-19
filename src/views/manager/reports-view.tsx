'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, Sparkles } from 'lucide-react'
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
  API_ManagerOverview,
  API_ManagerAnalytics,
  API_ManagerIssues,
  API_ManagerIssueStats,
  API_ManagerIssue,
} from '@/api/manager/reports'
import type {
  ManagerContext,
  AnalyticsFilters,
  IssueFilters,
  ManagerMetric,
} from '@/api/manager/reports'
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

const roleToDomain: Record<string, Domain> = {
  HR_MANAGER: 'hr',
  ACADEMIC_MANAGER: 'academic',
  ADMISSIONS_MANAGER: 'admissions',
}

interface DomainKpiConfig {
  label: string
  entity: string
  unit: string
  secondaryEntity?: string
}

const DOMAIN_KPIS: Record<Domain, DomainKpiConfig[]> = {
  hr: [
    { label: 'Nhân sự', entity: 'employee', unit: 'nhân sự' },
    { label: 'Phòng ban', entity: 'department', unit: 'đơn vị' },
    { label: 'Phân công', entity: 'assignment', unit: 'lượt' },
    { label: 'Giảng viên', entity: 'lecturer', unit: 'giảng viên', secondaryEntity: 'position' },
  ],
  academic: [
    { label: 'Sinh viên', entity: 'student', unit: 'sinh viên' },
    { label: 'Lớp học', entity: 'class', unit: 'lớp' },
    { label: 'Đăng ký học', entity: 'enrollment', unit: 'lượt', secondaryEntity: 'enrollment_grade' },
    { label: 'Học phần', entity: 'course', unit: 'học phần' },
  ],
  admissions: [
    { label: 'Hồ sơ tuyển sinh', entity: 'admission', unit: 'hồ sơ', secondaryEntity: 'applicant' },
    { label: 'Phương thức', entity: 'admission_method', unit: 'phương thức' },
    { label: 'Ngành xét tuyển', entity: 'major', unit: 'ngành' },
    { label: 'Đợt tuyển sinh', entity: 'admission_year', unit: 'đợt' },
  ],
}

function getKpiValue(
  items: ManagerMetric[],
  config: DomainKpiConfig,
  isPending: boolean
): string {
  if (isPending) return '—'
  const matching = items.filter(
    (m) =>
      m.entity === config.entity ||
      (config.secondaryEntity && m.entity === config.secondaryEntity)
  )
  if (matching.length > 0) {
    const total = matching.reduce((sum, m) => sum + (Number(m.value) || 0), 0)
    return number(total)
  }
  return '—'
}

const aiQuestions: Record<Domain, string> = {
  hr: 'Phân tích cơ cấu và biến động nhân sự hiện tại',
  academic: 'Phân tích kết quả học tập và tiến độ sinh viên',
  admissions: 'Phân tích tình hình hồ sơ tuyển sinh đợt này',
}

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
  const roleDomains = context.roles.map((r) => roleToDomain[r]).filter(Boolean) as Domain[]
  const available = context.domains.filter(
    (domain) =>
      roleDomains.includes(domain.domain as Domain) ||
      context.departments.some(
        (department) => department.department_code === departmentCodes[domain.domain]
      )
  )
  const initial =
    available.find((d) => roleDomains.includes(d.domain as Domain)) ??
    available.find((d) => d.domain === context.default_domain) ??
    available[0] ??
    context.domains[0]
  const [domain, setDomain] = useState<Domain>((initial?.domain ?? roleDomains[0] ?? 'hr') as Domain)
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
      ? `${label(domain)} · Báo cáo tổng hợp số liệu trong phạm vi phòng phụ trách.`
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
            reading={refreshing}
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
      {/* 4 KPI Cards đặc thù theo từng phòng ban / role */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {DOMAIN_KPIS[domain].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {kpi.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl tabular-nums">
              {(() => {
                const val = getKpiValue(data.kpis.items, kpi, isPending)
                return val === '—' ? '—' : `${val} ${kpi.unit}`
              })()}
            </p>
          </div>
        ))}
      </div>

      {/* Thông tin vận hành dữ liệu phòng ban */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-slate-200/80 bg-white p-4 text-xs shadow-xs">
        <div>
          <span className="text-slate-500">Bộ dữ liệu quản lý:</span>{' '}
          <span className="font-semibold text-slate-800 tabular-nums">{isPending ? '—' : number(data.datasets)}</span>
        </div>
        <div>
          <span className="text-slate-500">Yêu cầu cần xử lý:</span>{' '}
          <span className="font-semibold text-amber-600 tabular-nums">{isPending ? '—' : number(data.issues.assigned)}</span>
        </div>
        <div>
          <span className="text-slate-500">Chờ xác minh:</span>{' '}
          <span className="font-semibold text-blue-600 tabular-nums">{isPending ? '—' : number(data.issues.pending_verification)}</span>
        </div>
        <div>
          <span className="text-slate-500">Đã hoàn thành:</span>{' '}
          <span className="font-semibold text-emerald-600 tabular-nums">{isPending ? '—' : number(data.issues.verified)}</span>
        </div>
      </div>

      <Analytics domain={domain} userId={userId} />

      {/* Deep-dive AI Callout */}
      <div className="shadow-xs flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/70 via-white to-white p-4 transition-colors hover:border-rose-200 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-slate-900">Phân tích sâu hơn với AI</span>
        </div>
        <Link
          href={`/manager/ask?q=${encodeURIComponent(aiQuestions[domain])}`}
          className="text-xs sm:text-sm font-medium text-primary hover:underline transition-colors flex items-center gap-1.5"
        >
          <span>{aiQuestions[domain]}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Navigation Links and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <Link
            href="/manager/ask"
            className="font-semibold text-primary hover:underline"
          >
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
        <div className="space-y-6">
          {query.data.items.length > 1 && (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={query.data.items.map((item, idx) => {
                    const dim = Object.entries(item.dimensions)[0]
                    return {
                      name: dim ? `${label(dim[0])}: ${label(String(dim[1]))}` : `Nhóm #${idx + 1}`,
                      value: item.value,
                    }
                  })}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(val) => [number(Number(val)), 'Số bản ghi']}
                  />
                  <Bar dataKey="value" fill="#ba1a3a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

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
          </div>
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
  const [assigneeInput, setAssigneeInput] = useState('')
  const [selected, setSelected] = useState('')

  const assigneeUserId =
    assigneeInput.trim() && /^\d+$/.test(assigneeInput.trim())
      ? Number(assigneeInput.trim())
      : undefined

  const params: IssueFilters = {
    domain,
    status: status ? (status as 'ASSIGNED' | 'PENDING_VERIFICATION' | 'VERIFIED') : undefined,
    assignee_user_id: assigneeUserId,
    limit: size,
    offset: page * size,
  }
  const query = useQuery({
    queryKey: ['manager', 'issues', userId, params],
    queryFn: () => API_ManagerIssues(params),
    ...polling,
  })
  const stats = useQuery({
    queryKey: ['manager', 'issue-stats', userId, domain, status, assigneeUserId],
    queryFn: () =>
      API_ManagerIssueStats({
        domain,
        status: params.status,
        assignee_user_id: assigneeUserId,
      }),
    ...polling,
  })
  const detail = useQuery({
    queryKey: ['manager', 'issue', userId, selected],
    queryFn: () => API_ManagerIssue(selected),
    enabled: Boolean(selected),
    ...polling,
  })

  const totalCount = stats.data?.total ?? 0
  const assignedCount = stats.data?.assigned ?? 0
  const pendingVerificationCount = stats.data?.pending_verification ?? 0
  const verifiedCount = stats.data?.verified ?? 0

  return (
    <div className="space-y-6">
      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl tabular-nums">
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
          <p className="text-2xl font-bold tabular-nums tracking-tight text-indigo-600 sm:text-3xl">
            {number(pendingVerificationCount)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Chờ xác minh
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

      {/* Issues Card (Image 4) */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Danh sách yêu cầu</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              inputMode="numeric"
              aria-label="Lọc theo ID nhân viên phụ trách"
              placeholder="ID nhân viên…"
              value={assigneeInput}
              onChange={(event) => {
                const val = event.target.value.replace(/[^\d]/g, '')
                setAssigneeInput(val)
                setPage(0)
                setSelected('')
              }}
              className="shadow-xs w-32 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
                {query.data.map((item) => (
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
                        {label(item.status)}
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
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">{detail.data.title}</span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-0.5 text-xs font-medium',
                  detail.data.status === 'VERIFIED'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : detail.data.status === 'PENDING_VERIFICATION'
                      ? 'border border-amber-200 bg-amber-50 text-amber-700'
                      : 'border border-slate-200 bg-slate-100 text-slate-700'
                )}
              >
                {label(detail.data.status)}
              </span>
            </div>
            <p className="text-slate-600">{detail.data.description || 'Không có mô tả chi tiết.'}</p>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <p>
                <span className="font-medium text-slate-500">Phòng ban:</span>{' '}
                {detail.data.department_name}
              </p>
              <p>
                <span className="font-medium text-slate-500">Người phụ trách:</span>{' '}
                {detail.data.assignee_user_id != null
                  ? `Nhân viên #${detail.data.assignee_user_id}`
                  : 'Chưa phân công'}
              </p>
              <p>
                <span className="font-medium text-slate-500">Ngày tạo:</span>{' '}
                {formatDateTime(detail.data.created_at)}
              </p>
              <p>
                <span className="font-medium text-slate-500">Cập nhật gần nhất:</span>{' '}
                {formatDateTime(detail.data.updated_at)}
              </p>
            </div>

            {/* Hồ sơ cách ly (quarantine_records) theo PDF #11 */}
            <div className="border-t border-slate-200 pt-3">
              <h4 className="mb-2 font-semibold text-slate-900">
                Hồ sơ cách ly ({number(detail.data.quarantine_records?.length ?? 0)})
              </h4>
              {detail.data.quarantine_records?.length ? (
                <div className="space-y-2">
                  {detail.data.quarantine_records.map((rec) => (
                    <div
                      key={rec.record_id}
                      className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-900">
                          {rec.source_table || 'Không rõ tệp nguồn'}
                        </span>
                        <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[11px] text-amber-800">
                          {rec.locator || `Dòng #${rec.record_position}`}
                        </span>
                      </div>
                      {rec.entity && (
                        <p className="text-[11px] text-slate-600">
                          Thực thể: <strong className="text-slate-800">{label(rec.entity)}</strong>
                        </p>
                      )}
                      {rec.error_codes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {rec.error_codes.map((code) => (
                            <span
                              key={code}
                              className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] text-rose-700"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Chưa có hồ sơ cách ly đi kèm.</p>
              )}
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
                      <p className="font-semibold text-primary">
                        {label(ev.to_status || ev.event_type)}
                      </p>
                      <p className="text-slate-500">
                        Người thực hiện #{ev.actor_id} · {formatDateTime(ev.created_at)}
                      </p>
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
