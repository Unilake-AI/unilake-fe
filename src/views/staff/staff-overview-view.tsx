'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChartPie, Layers3 } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_GetIngestionMetrics, API_GetIngestionStats } from '@/api/shared/ingestion'
import { API_GetQualityIssueStats } from '@/api/shared/quality-issues'
import { CountChart } from '@/components/charts/count-chart'
import { ErrorState, KpiCard, LoadingState, formatNumber } from '@/components/page/page-parts'
import { Button } from '@/components/ui/button'
import type { StaffContext } from '@/types/staff-context'

import { DepartmentAssignmentBanner, StaffContextGate } from './staff-context-gate'

const statCardClassName =
  'rounded-xl border shadow-sm [&>div]:min-h-12 [&>div]:items-center sm:[&>div]:min-h-9 [&_svg]:box-content [&_svg]:rounded-lg [&_svg]:bg-muted [&_svg]:p-2'

const percentFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function FailureRateChart() {
  const metrics = useQuery({
    queryKey: ['ingestion-jobs', 'metrics'],
    queryFn: API_GetIngestionMetrics,
  })
  const rate = metrics.data?.failure_rate_percent

  return (
    <section
      aria-labelledby="staff-failure-rate"
      className="flex min-w-0 flex-col rounded-xl border bg-card shadow-sm"
    >
      <header className="flex items-center gap-3 border-b p-4 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ChartPie className="size-5" aria-hidden="true" />
        </span>
        <h2 id="staff-failure-rate" className="text-base font-semibold text-foreground">
          Tỷ lệ nạp thất bại
        </h2>
      </header>
      <div className="grid flex-1 content-center p-4 sm:p-5">
        {metrics.isPending ? (
          <LoadingState label="Đang tải tỷ lệ nạp thất bại…" />
        ) : metrics.isError ? (
          <ErrorState
            message={getApiErrorMessage(metrics.error, 'Không tải được tỷ lệ nạp thất bại.')}
            retrying={metrics.isFetching}
            onRetry={() => void metrics.refetch()}
          />
        ) : rate == null ? (
          <p className="grid min-h-36 place-items-center text-center text-sm text-muted-foreground">
            Chưa có dữ liệu nạp
          </p>
        ) : (
          <figure className="relative mx-auto grid size-32 place-items-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${rate}%, hsl(var(--muted)) 0)`,
              }}
            />
            <figcaption className="relative grid size-24 place-items-center rounded-full bg-card text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {percentFormatter.format(rate / 100)}
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}

function OverviewContent({ context }: { context: StaffContext }) {
  const jobStats = useQuery({
    queryKey: ['ingestion-jobs', 'stats'],
    queryFn: API_GetIngestionStats,
  })
  return (
    <div className="space-y-6">
      {context.needs_department_assignment && <DepartmentAssignmentBanner note={context.note} />}

      <section aria-labelledby="staff-ingestion-stats" className="space-y-3">
        <h2 id="staff-ingestion-stats" className="text-base font-semibold text-foreground">
          Thống kê nạp dữ liệu
        </h2>
        {jobStats.isPending ? (
          <LoadingState label="Đang tải thống kê nạp dữ liệu…" />
        ) : jobStats.isError ? (
          <ErrorState
            message={getApiErrorMessage(jobStats.error, 'Không tải được thống kê nạp dữ liệu.')}
            retrying={jobStats.isFetching}
            onRetry={() => void jobStats.refetch()}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              dashboard
              className={statCardClassName}
              label="Tổng số lần nạp"
              value={formatNumber(jobStats.data.total)}
            />
            <KpiCard
              dashboard
              className={statCardClassName}
              label="Nạp thành công"
              value={formatNumber(jobStats.data.success)}
              tone="emerald"
            />
            <KpiCard
              dashboard
              className={statCardClassName}
              label="Đang chờ hoặc xử lý"
              value={formatNumber(
                jobStats.data.queued + jobStats.data.running + (jobStats.data.retry_wait ?? 0)
              )}
              tone="amber"
            />
            <KpiCard
              dashboard
              className={statCardClassName}
              label="Nạp thất bại"
              value={formatNumber(jobStats.data.failed)}
              tone="rose"
            />
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <QualityIssueSummary />
        <FailureRateChart />
      </div>
    </div>
  )
}

function QualityIssueSummary() {
  const issueStats = useQuery({
    queryKey: ['quality-issues', 'stats', 'mine'],
    queryFn: () => API_GetQualityIssueStats({ mine_only: true }),
  })

  return (
    <section className="rounded-xl border bg-card shadow-sm" aria-labelledby="staff-issue-stats">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers3 className="size-5" aria-hidden="true" />
          </span>
          <h2 id="staff-issue-stats" className="text-base font-semibold text-foreground">
            Tình hình yêu cầu xử lý dữ liệu lỗi
          </h2>
        </div>
        <Button asChild variant="outline" className="text-primary hover:text-primary">
          <Link href="/staff/quality-issues">
            Quản lý yêu cầu <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </header>
      <div className="p-4 sm:p-5">
        {issueStats.isPending ? (
          <LoadingState />
        ) : issueStats.isError ? (
          <ErrorState
            message={getApiErrorMessage(issueStats.error, 'Không tải được thống kê yêu cầu.')}
            retrying={issueStats.isFetching}
            onRetry={() => void issueStats.refetch()}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(0,3fr)]">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4 sm:block sm:p-5">
              <p className="text-sm font-medium text-muted-foreground">Tổng yêu cầu</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:mt-2">
                {formatNumber(issueStats.data.total)}
              </p>
            </div>
            <div className="grid min-h-36 min-w-0 content-center rounded-lg border bg-muted/20 px-2 py-3">
              <CountChart
                unit="yêu cầu"
                data={[
                  { label: 'Cần xử lý', count: issueStats.data.assigned, tone: 'warning' },
                  { label: 'Chờ xác minh', count: issueStats.data.pending_verification },
                  { label: 'Đã xác minh', count: issueStats.data.verified, tone: 'success' },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function StaffOverviewView() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Tổng quan
        </h1>
      </header>
      <StaffContextGate showAssignmentBanner={false}>
        {(context) => <OverviewContent context={context} />}
      </StaffContextGate>
    </div>
  )
}
