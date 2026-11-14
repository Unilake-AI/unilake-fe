'use client'

import Image from 'next/image'
import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  History,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_GetIngestionStats, API_ListIngestionJobs } from '@/api/shared/ingestion'
import { API_GetQualityIssueStats, API_ListQualityIssues } from '@/api/shared/quality-issues'
import emptyData from '@/assets/dashboard/empty-data.webp'
import campusImage from '@/assets/login/duy-tan-campus-source.png'
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
import type { StaffContext } from '@/types/staff-context'

import { DepartmentAssignmentBanner, StaffContextGate } from './staff-context-gate'
import { domainLabel } from './staff-helpers'

function OverviewContent({ context }: { context: StaffContext }) {
  const jobStats = useQuery({
    queryKey: ['ingestion-jobs', 'stats'],
    queryFn: API_GetIngestionStats,
  })
  const recentJobs = useQuery({
    queryKey: ['ingestion-jobs', 'recent'],
    queryFn: () => API_ListIngestionJobs({ limit: 5, offset: 0 }),
  })
  const issueStats = useQuery({
    queryKey: ['quality-issues', 'stats', 'mine'],
    queryFn: () => API_GetQualityIssueStats({ mine_only: true }),
  })

  const myIssues = useQuery({
    queryKey: ['quality-issues', 'recent', 'mine'],
    queryFn: () => API_ListQualityIssues({ mine_only: true, limit: 5, offset: 0 }),
  })

  const isRefreshing =
    jobStats.isFetching || recentJobs.isFetching || issueStats.isFetching || myIssues.isFetching
  const refreshAll = () => {
    void jobStats.refetch()
    void recentJobs.refetch()
    void issueStats.refetch()
    void myIssues.refetch()
  }
  const issues = issueStats.data
  const totalIssues = issues?.total ?? 0
  const verified = issues?.verified ?? 0
  const pending = issues?.pending_verification ?? 0
  const assigned = issues?.assigned ?? 0
  // Mỗi cung vẽ đúng từ số của trạng thái đó, để cung luôn khớp với chú thích bên cạnh.
  const chartTotal = verified + pending + assigned
  const verifiedEnd = chartTotal > 0 ? (verified / chartTotal) * 100 : 0
  const pendingEnd = chartTotal > 0 ? ((verified + pending) / chartTotal) * 100 : 0
  const issueSegments =
    chartTotal > 0
      ? `conic-gradient(#5abf73 0 ${verifiedEnd}%, #ffbd4f ${verifiedEnd}% ${pendingEnd}%, #e33455 ${pendingEnd}% 100%)`
      : 'conic-gradient(#c8d0e4 0 100%)'

  return (
    <div className="space-y-5">
      <div className="relative min-h-[130px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#f9faff] to-[#eef3ff] p-4 sm:px-6">
        <Image
          src={campusImage}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 300px, 560px"
          className="pointer-events-none !left-auto !w-[45%] object-cover object-[center_48%] opacity-40 [mask-image:linear-gradient(to_right,transparent,black)]"
        />
        <div className="relative max-w-[70%]">
          <p className="text-xs font-semibold text-[#b91830]">Tổng quan</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#0f1831] sm:text-[30px]">
            Tổng quan vận hành dữ liệu
          </h1>
          <p className="mt-1 text-sm text-[#596884]">
            Theo dõi tình trạng nạp dữ liệu và các yêu cầu xử lý dữ liệu lỗi của đơn vị.
          </p>
        </div>
      </div>

      {context.needs_department_assignment && <DepartmentAssignmentBanner note={context.note} />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfe4f2] bg-white px-4 py-3 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-[#596884]">
          <span>Tài khoản:</span>
          <strong className="text-[#111a35]">{context.username}</strong>
          <span className="mx-1 text-[#cbd4e3]">|</span>
          <span>Lĩnh vực được cấp:</span>
          {context.domains.map((domain) => (
            <Tag key={domain.domain} tone="indigo">
              {domain.name}
            </Tag>
          ))}
        </div>
        <span className="text-[#596884]">
          Đơn vị công tác:{' '}
          <strong className="text-[#b91830]">
            {context.departments.map((department) => department.department_name).join(', ') ||
              'Chưa có phân công'}
          </strong>
        </span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={refreshAll}
          disabled={isRefreshing}
          icon={<RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Làm mới
        </Button>
        <Link
          href="/staff/quality-issues"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cbd4e3] bg-white px-3 text-xs font-semibold text-[#17233d]"
        >
          <ShieldCheck className="size-4" /> Yêu cầu dữ liệu lỗi
        </Link>
        {context.can_upload && (
          <Link
            href="/staff/upload"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#b91830] px-3 text-xs font-semibold text-white"
          >
            <Upload className="size-4" /> Nạp dữ liệu
          </Link>
        )}
      </div>

      {jobStats.isPending ? (
        <LoadingState label="Đang tải thống kê nạp dữ liệu…" />
      ) : jobStats.isError ? (
        <ErrorState
          message={getApiErrorMessage(jobStats.error, 'Không tải được thống kê nạp dữ liệu.')}
          onRetry={() => void jobStats.refetch()}
        />
      ) : (
        <section
          aria-label="Thống kê nạp dữ liệu"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            {
              label: 'Tổng số lần nạp',
              value: jobStats.data.total,
              icon: Database,
              color: 'text-[#4854df] bg-[#eceeff]',
            },
            {
              label: 'Nạp thành công',
              value: jobStats.data.success,
              icon: CheckCircle2,
              color: 'text-[#13933d] bg-[#e9f8ed]',
            },
            {
              label: 'Đang xử lý',
              value: jobStats.data.queued + jobStats.data.running + (jobStats.data.retry_wait ?? 0),
              icon: Clock3,
              color: 'text-[#e58a00] bg-[#fff3df]',
            },
            {
              label: 'Nạp thất bại',
              value: jobStats.data.failed,
              icon: AlertCircle,
              color: 'text-[#c51c3d] bg-[#fce8ee]',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border border-[#dfe4f2] bg-white p-5 shadow-[0_8px_24px_rgba(31,43,83,.055)]"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-full ${color}`}
                >
                  <Icon className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#34415f]">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-[#111a35]">{formatNumber(value)}</p>
                </div>
              </div>
              <div
                aria-hidden="true"
                className={`absolute -bottom-8 -right-7 size-32 rounded-full opacity-35 ${color.split(' ')[1]}`}
              />
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title={
            <span className="flex items-center gap-2">
              <Layers3 className="size-5 text-[#b91830]" />
              Tình hình yêu cầu xử lý dữ liệu lỗi
            </span>
          }
          right={
            <Link
              href="/staff/quality-issues"
              className="flex items-center gap-1 text-xs font-semibold text-[#b91830]"
            >
              Quản lý yêu cầu <ArrowRight className="size-4" />
            </Link>
          }
        >
          {issueStats.isPending ? (
            <LoadingState />
          ) : issueStats.isError ? (
            <ErrorState
              message={getApiErrorMessage(issueStats.error, 'Không tải được thống kê yêu cầu.')}
              onRetry={() => void issueStats.refetch()}
            />
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-around gap-6 sm:flex-row">
              <div
                className="relative flex size-44 shrink-0 items-center justify-center rounded-full"
                style={{ background: issueSegments }}
              >
                <div className="flex size-28 flex-col items-center justify-center rounded-full bg-white text-center">
                  <strong className="text-3xl text-[#111a35]">{formatNumber(totalIssues)}</strong>
                  <span className="text-xs">Yêu cầu</span>
                </div>
              </div>
              <div className="w-full space-y-3 text-sm">
                {[
                  ['Đã xác minh', verified, 'bg-[#5abf73]'],
                  ['Chờ xác minh', pending, 'bg-[#ffbd4f]'],
                  ['Cần xử lý', assigned, 'bg-[#e33455]'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex justify-between border-b border-[#e5e9f3] pb-2">
                    <span className="flex items-center gap-2">
                      <i className={`size-3 rounded-full ${color}`} />
                      {label}
                    </span>
                    <strong>{formatNumber(value as number)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card
          title={
            <span className="flex items-center gap-2">
              <History className="size-5 text-[#b91830]" />
              Hoạt động nạp dữ liệu gần đây
            </span>
          }
          right={
            <Link
              href="/staff/ingestion"
              className="flex items-center gap-1 text-xs font-semibold text-[#b91830]"
            >
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          }
        >
          {recentJobs.isPending ? (
            <LoadingState />
          ) : recentJobs.isError ? (
            <ErrorState
              message={getApiErrorMessage(recentJobs.error, 'Không tải được lịch sử nạp dữ liệu.')}
              onRetry={() => void recentJobs.refetch()}
            />
          ) : recentJobs.data.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <Image
                src={emptyData}
                alt=""
                width={128}
                height={100}
                className="h-24 w-auto object-contain"
              />
              <h3 className="mt-3 text-base font-bold">Chưa có lần nạp dữ liệu nào</h3>
              <p className="mt-1 text-sm text-[#65718d]">
                Hãy bắt đầu nạp dữ liệu để theo dõi tình trạng tại đây.
              </p>
              {context.can_upload && (
                <Link
                  href="/staff/upload"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#b91830] px-4 py-2 text-sm font-semibold text-white"
                >
                  <Upload className="size-4" />
                  Nạp dữ liệu ngay
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentJobs.data.map((job) => (
                <Link
                  key={job.ingestion_job_id}
                  href={`/staff/ingestion?jobId=${job.ingestion_job_id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e9f3] px-3 py-2 text-xs hover:bg-[#f7f8fc]"
                >
                  <span className="min-w-0 truncate font-semibold">
                    #{job.ingestion_job_id} · {job.source_table ?? 'Tệp dữ liệu'}
                  </span>
                  <span className="shrink-0 text-[#65718d]">{formatDateTime(job.created_at)}</span>
                  <Tag tone={statusTone(job.status)}>{statusLabel(job.status)}</Tag>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#b91830]" />
            Yêu cầu xử lý dữ liệu lỗi được giao
          </span>
        }
        subtitle="Các yêu cầu gần nhất đang gán cho tài khoản của bạn"
        right={
          <Link
            href="/staff/quality-issues"
            className="flex items-center gap-1 text-xs font-semibold text-[#b91830]"
          >
            Xem tất cả <ArrowRight className="size-4" />
          </Link>
        }
        bodyClassName="p-0"
      >
        {myIssues.isPending ? (
          <LoadingState />
        ) : myIssues.isError ? (
          <div className="p-4">
            <ErrorState
              message={getApiErrorMessage(
                myIssues.error,
                'Không tải được danh sách yêu cầu xử lý dữ liệu lỗi.'
              )}
              onRetry={() => void myIssues.refetch()}
            />
          </div>
        ) : myIssues.data.length === 0 ? (
          <EmptyState
            title="Chưa có yêu cầu xử lý nào được giao"
            description={
              context.needs_department_assignment
                ? context.note
                : 'Khi quản trị dữ liệu giao yêu cầu sửa dữ liệu lỗi, yêu cầu sẽ hiển thị tại đây.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr>
                  {['Yêu cầu', 'Lĩnh vực', 'Trạng thái', 'Cập nhật'].map((head) => (
                    <th key={head} scope="col" className="px-4 py-2.5 text-xs font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myIssues.data.map((issue) => (
                  <tr key={issue.issue_id} className="hover:bg-[#f7f8fc]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/quality-issues/${issue.issue_id}`}
                        className="font-semibold text-[#b91830] hover:underline"
                      >
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#596884]">
                      {domainLabel(issue.domain, context.domains)}
                    </td>
                    <td className="px-4 py-3">
                      <Tag tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Tag>
                    </td>
                    <td className="px-4 py-3 text-[#65718d]">{formatDateTime(issue.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            href: '/staff/upload',
            label: 'Nạp dữ liệu',
            description: 'Tải tệp dữ liệu mới',
            icon: Upload,
          },
          {
            href: '/staff/ingestion',
            label: 'Lịch sử nạp dữ liệu',
            description: 'Xem các lần nạp và kết quả xử lý',
            icon: History,
          },
          {
            href: '/staff/quality-issues',
            label: 'Yêu cầu xử lý dữ liệu lỗi',
            description: 'Theo dõi các yêu cầu được giao',
            icon: ShieldCheck,
          },
        ]
          .filter((action) => action.href !== '/staff/upload' || context.can_upload)
          .map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-[#dfe4f2] bg-white p-4 shadow-[0_8px_24px_rgba(31,43,83,.055)] transition-transform hover:-translate-y-0.5"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#fce8ee] text-[#b91830]">
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-[#111a35]">{label}</strong>
                <small className="text-[#65718d]">{description}</small>
              </span>
              <ArrowRight className="size-4 text-[#b91830]" />
            </Link>
          ))}
      </div>
    </div>
  )
}

export function StaffOverviewView() {
  return (
    <StaffContextGate showAssignmentBanner={false}>
      {(context) => <OverviewContent context={context} />}
    </StaffContextGate>
  )
}
