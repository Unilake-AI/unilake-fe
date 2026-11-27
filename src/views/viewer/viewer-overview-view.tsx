'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Database,
  Filter,
  Layers,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ViewerDomainOverview,
  API_ViewerOverview,
  API_ViewerQualityIssues,
  API_ViewerQualityOverview,
} from '@/api/viewer'
import {
  PageHeader,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  formatDateTime,
} from '@/components/page/page-parts'
import { useDomain } from '@/hooks/use-domain'
import { cn } from '@/lib/utils'

import {
  DomainStatusBadge,
  IssueStatusBadge,
  ViewerGate,
  ViewerPaging,
  labelDomain,
  numberFormat,
} from './viewer-parts'

export function ViewerOverviewView() {
  return <ViewerGate>{() => <ViewerOverviewWorkspace />}</ViewerGate>
}

function ViewerOverviewWorkspace() {
  const { domain, availableDomains, setDomain } = useDomain()
  const isAll = domain.code === 'all'
  const currentDomain = !isAll ? (domain.code as 'academic' | 'hr' | 'admissions') : null

  const overviewQuery = useQuery({
    queryKey: ['viewer', 'overview'],
    queryFn: API_ViewerOverview,
    refetchInterval: 15_000,
  })

  const qualityQuery = useQuery({
    queryKey: ['viewer', 'quality', 'overview'],
    queryFn: API_ViewerQualityOverview,
    refetchInterval: 15_000,
  })

  // Khi người dùng chọn phân hệ cụ thể, tải thêm overview chi tiết của phân hệ đó
  const domainOverviewQuery = useQuery({
    queryKey: ['viewer', 'domains', currentDomain, 'overview'],
    queryFn: () => (currentDomain ? API_ViewerDomainOverview(currentDomain) : null),
    enabled: Boolean(currentDomain),
    refetchInterval: 15_000,
  })

  const [issueDomain, setIssueDomain] = useState<string>('')
  const [issueStatus, setIssueStatus] = useState<string>('')
  const [issuePage, setIssuePage] = useState<number>(0)
  const pageSize = 10

  // Đồng bộ bộ lọc yêu cầu chất lượng khi đổi phân hệ
  useEffect(() => {
    setIssueDomain(currentDomain ?? '')
    setIssuePage(0)
  }, [currentDomain])

  const issuesQuery = useQuery({
    queryKey: ['viewer', 'quality', 'issues', issueDomain, issueStatus, issuePage],
    queryFn: () =>
      API_ViewerQualityIssues({
        domain: issueDomain || undefined,
        status: issueStatus || undefined,
        limit: pageSize,
        offset: issuePage * pageSize,
      }),
    refetchInterval: 15_000,
  })

  const overview = overviewQuery.data
  const quality = qualityQuery.data
  const domainOverview = domainOverviewQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard />}
        breadcrumb={[
          'Điều hành',
          currentDomain ? `Phân hệ ${labelDomain(currentDomain)}` : 'Tổng quan toàn trường',
        ]}
        title={
          currentDomain
            ? `Tổng quan phân hệ ${labelDomain(currentDomain)}`
            : 'Tổng quan điều hành dữ liệu'
        }
        description={
          currentDomain
            ? `Theo dõi trạng thái sẵn sàng, nguồn Gold và chất lượng dữ liệu của phân hệ ${labelDomain(currentDomain)}.`
            : 'Phạm vi đọc gồm các bộ dữ liệu hoạt động của ba phân hệ Đào tạo, Nhân sự và Tuyển sinh trên toàn trường.'
        }
      />

      {/* Domain Switcher Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Phân hệ:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {availableDomains.map((item) => {
              const active = domain.code === item.code
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setDomain(item.code)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    active
                      ? 'bg-rose-50 text-[#b91830] ring-1 ring-[#b91830]/30 shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <span>{item.shortLabel}</span>
                  {active && <Check className="size-3 text-[#b91830]" />}
                </button>
              )
            })}
          </div>
        </div>

        {currentDomain && (
          <Link
            href={`/viewer/dashboards?domain=${currentDomain}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Vào phân tích chi tiết {labelDomain(currentDomain)}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>

      {/* Domain Focus Hero Banner khi chọn một phân hệ cụ thể */}
      {currentDomain && domainOverview && (
        <div className="rounded-xl border border-slate-900 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-bold">Phân hệ {labelDomain(currentDomain)}</span>
                <DomainStatusBadge status={domainOverview.status} />
              </div>
              <p className="mt-1 text-xs text-slate-300">
                {domainOverview.last_updated_at
                  ? `Thời điểm công bố Gold gần nhất: ${formatDateTime(domainOverview.last_updated_at)}`
                  : 'Chưa có mốc công bố Gold'}
              </p>
            </div>

            <Link
              href={`/viewer/dashboards?domain=${currentDomain}`}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/20"
            >
              <span>Xem biểu đồ & metadata bảng biểu</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Highlight Metric nếu có */}
          {domainOverview.highlight_metric && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Sparkles className="size-4" />
                  <span>Chỉ số tiêu điểm Gold</span>
                </div>
                <span className="text-xs text-slate-400">
                  Thực thể: {domainOverview.highlight_metric.entity} · Phạm vi:{' '}
                  {domainOverview.highlight_metric.scope}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white tabular-nums">
                  {numberFormat(domainOverview.highlight_metric.value)}
                </span>
                <span className="text-xs text-slate-300">
                  {domainOverview.highlight_metric.unit ?? 'bản ghi'}
                </span>
              </div>
            </div>
          )}

          {/* Message giải thích khi PENDING, NO_DATA, PARTIAL */}
          {domainOverview.message && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertTriangle className="size-4 shrink-0 text-amber-400" />
              <p>{domainOverview.message}</p>
            </div>
          )}
        </div>
      )}

      {overviewQuery.isPending ? (
        <LoadingState label="Đang tải tổng quan điều hành…" />
      ) : overviewQuery.isError ? (
        <ErrorState
          message={getApiErrorMessage(overviewQuery.error, 'Không thể tải dữ liệu tổng quan.')}
          onRetry={() => void overviewQuery.refetch()}
        />
      ) : overview ? (
        <>
          {/* 4 Thẻ KPI: Toàn trường HOẶC Theo phân hệ đang chọn */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Bộ dữ liệu hoạt động
                </p>
                <Database className="size-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl tabular-nums">
                {numberFormat(
                  currentDomain
                    ? overview.domains[currentDomain]?.datasets ?? 0
                    : overview.datasets
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {currentDomain
                  ? `Phân hệ ${labelDomain(currentDomain)}`
                  : 'Toàn bộ 3 phân hệ'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Nguồn dữ liệu
                </p>
                <Layers className="size-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600 sm:text-3xl tabular-nums">
                {numberFormat(
                  currentDomain
                    ? overview.domains[currentDomain]?.sources ?? 0
                    : overview.sources
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {currentDomain ? 'Nguồn Gold thuộc phân hệ' : 'Đã kết nối qua pipeline'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {currentDomain ? 'Trạng thái sẵn sàng' : 'Phân hệ sẵn sàng'}
                </p>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
              {currentDomain ? (
                <div className="mt-2 flex items-center">
                  <DomainStatusBadge
                    status={overview.domains[currentDomain]?.status ?? 'NO_DATA'}
                  />
                </div>
              ) : (
                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 sm:text-3xl tabular-nums">
                  {overview.ready_domains} / 3
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {currentDomain
                  ? `Phân hệ ${labelDomain(currentDomain)}`
                  : 'Đạt trạng thái READY'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Yêu cầu chất lượng
                </p>
                <ShieldAlert className="size-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 sm:text-3xl tabular-nums">
                {numberFormat(
                  currentDomain
                    ? issuesQuery.data?.total ?? 0
                    : quality?.quality?.total ?? 0
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {currentDomain
                  ? `Cần xử lý tại ${labelDomain(currentDomain)}`
                  : quality
                    ? `${quality.quality.assigned} đang xử lý`
                    : 'Theo dõi chất lượng'}
              </p>
            </div>
          </div>

          {/* Trạng thái 3 Phân hệ chính */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Trạng thái sẵn sàng dữ liệu theo phân hệ
              </h2>
              {currentDomain && (
                <button
                  type="button"
                  onClick={() => setDomain('all')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Xem tất cả phân hệ
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(['academic', 'hr', 'admissions'] as const).map((dom) => {
                const isSelected = currentDomain === dom
                const info = overview.domains[dom] ?? {
                  status: 'NO_DATA',
                  datasets: 0,
                  sources: 0,
                  last_updated_at: null,
                }
                const freshness = quality?.freshness[dom] ?? info.last_updated_at

                return (
                  <div
                    key={dom}
                    className={cn(
                      'flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-all',
                      isSelected
                        ? 'border-[#b91830] bg-rose-50/20 ring-2 ring-[#b91830]/20 shadow-sm'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900">
                            {labelDomain(dom)}
                          </span>
                          {isSelected && (
                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-[#b91830]">
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <DomainStatusBadge status={info.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                        <div>
                          <p className="text-slate-500">Bộ dữ liệu</p>
                          <p className="mt-0.5 text-base font-semibold text-slate-800 tabular-nums">
                            {numberFormat(info.datasets ?? 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Nguồn kết nối</p>
                          <p className="mt-0.5 text-base font-semibold text-slate-800 tabular-nums">
                            {numberFormat(info.sources ?? 0)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="size-3.5 text-slate-400" />
                        <span>
                          {freshness
                            ? `Công bố: ${formatDateTime(freshness)}`
                            : 'Chưa có mốc công bố Gold'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                      {!isSelected ? (
                        <button
                          type="button"
                          onClick={() => setDomain(dom)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Chọn phân hệ này
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">
                          Phân hệ đang xem
                        </span>
                      )}

                      <Link
                        href={`/viewer/dashboards?domain=${dom}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Chi tiết</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Khối Chất lượng & Công bố Dữ liệu */}
          {quality && (
            <Card
              title="Chất lượng dữ liệu & Mức độ công bố Gold"
              subtitle="Tổng hợp từ toàn bộ các nguồn dữ liệu và yêu cầu xử lý chất lượng."
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Cột 1: Tiến độ xử lý yêu cầu */}
                <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      Yêu cầu theo trạng thái
                    </span>
                    <span className="text-xs text-slate-500">
                      Tổng số: {numberFormat(quality.quality.total)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Cần xử lý (Assigned)</span>
                        <span className="tabular-nums font-semibold text-amber-700">
                          {quality.quality.assigned}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-amber-500"
                          style={{
                            width: `${quality.quality.total > 0 ? (quality.quality.assigned / quality.quality.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Chờ xác minh (Pending Verification)</span>
                        <span className="tabular-nums font-semibold text-sky-700">
                          {quality.quality.pending_verification}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-sky-500"
                          style={{
                            width: `${quality.quality.total > 0 ? (quality.quality.pending_verification / quality.quality.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span>Đã xác minh (Verified)</span>
                        <span className="tabular-nums font-semibold text-emerald-700">
                          {quality.quality.verified}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${quality.quality.total > 0 ? (quality.quality.verified / quality.quality.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột 2: Mức độ bao phủ & Sự cố Gold */}
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-sm font-semibold text-slate-800">
                    Phạm vi xử lý & Sự cố đồng bộ Gold
                  </span>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                      <p className="text-slate-500">Nguồn đạt Gold hiện hành</p>
                      <p className="mt-1 text-lg font-bold text-emerald-600 tabular-nums">
                        {quality.publication.gold_ready} / {quality.publication.total_sources}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                      <p className="text-slate-500">Dataset chưa có phạm vi</p>
                      <p className="mt-1 text-lg font-bold text-slate-800 tabular-nums">
                        {quality.publication.datasets_without_scope}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                      <p className="text-slate-500">Lượt tạo Gold thất bại</p>
                      <p className="mt-1 text-lg font-bold text-rose-600 tabular-nums">
                        {quality.publication.gold_job_failed}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white p-3">
                      <p className="text-slate-500">Sự cố đồng bộ bảng nghiệp vụ</p>
                      <p className="mt-1 text-lg font-bold text-amber-600 tabular-nums">
                        {quality.publication.sync_failed}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Danh sách Yêu cầu chất lượng dữ liệu */}
          <Card
            title="Danh sách yêu cầu xử lý chất lượng dữ liệu"
            subtitle="Giám sát trạng thái xử lý các bất thường dữ liệu trên toàn trường."
          >
            {/* Filter bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Filter className="size-3.5 text-slate-400" />
                  <span>Phân hệ:</span>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={issueDomain}
                    onChange={(e) => {
                      const val = e.target.value
                      setIssueDomain(val)
                      setDomain(val ? (val as 'academic' | 'hr' | 'admissions') : 'all')
                      setIssuePage(0)
                    }}
                  >
                    <option value="">Tất cả phân hệ</option>
                    <option value="academic">Đào tạo</option>
                    <option value="hr">Nhân sự</option>
                    <option value="admissions">Tuyển sinh</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Trạng thái:</span>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={issueStatus}
                    onChange={(e) => {
                      setIssueStatus(e.target.value)
                      setIssuePage(0)
                    }}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ASSIGNED">Cần xử lý</option>
                    <option value="PENDING_VERIFICATION">Chờ xác minh</option>
                    <option value="VERIFIED">Đã xác minh</option>
                  </select>
                </div>
              </div>
            </div>

            {issuesQuery.isPending ? (
              <LoadingState label="Đang tải danh sách yêu cầu…" />
            ) : issuesQuery.isError ? (
              <ErrorState
                message={getApiErrorMessage(issuesQuery.error, 'Không thể tải yêu cầu.')}
                onRetry={() => void issuesQuery.refetch()}
              />
            ) : !issuesQuery.data?.items.length ? (
              <EmptyState
                title="Không có yêu cầu phù hợp"
                description="Không tìm thấy yêu cầu xử lý dữ liệu nào với bộ lọc hiện tại."
              />
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
                  {issuesQuery.data.items.map((item) => (
                    <div
                      key={item.issue_id}
                      className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 transition-colors hover:bg-slate-50/70"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{item.title}</span>
                          <span className="text-xs text-slate-400">({item.issue_id})</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {labelDomain(item.domain)}
                          </span>
                          <span>·</span>
                          <span>{item.department_name ?? 'Chưa gán phòng'}</span>
                          {item.dataset_name && (
                            <>
                              <span>·</span>
                              <span>Dataset: {item.dataset_name}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{formatDateTime(item.created_at)}</span>
                        </div>
                      </div>

                      <div>
                        <IssueStatusBadge status={item.status} />
                      </div>
                    </div>
                  ))}
                </div>

                <ViewerPaging
                  page={issuePage}
                  setPage={setIssuePage}
                  total={issuesQuery.data.total}
                  limit={pageSize}
                />
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
