'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Layers3,
} from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import { API_GetIngestionStats } from '@/api/shared/ingestion'
import { API_GetQualityIssueStats} from '@/api/shared/quality-issues'
import { CountChart } from '@/components/charts/count-chart'
import {
  Card,
  ErrorState,
  KpiCard,
  LoadingState,
  formatNumber,
} from '@/components/page/page-parts'
import type { StaffContext } from '@/types/staff-context'

import { DepartmentAssignmentBanner, StaffContextGate } from './staff-context-gate'

function OverviewContent({ context }: { context: StaffContext }) {
  const jobStats = useQuery({
    queryKey: ['ingestion-jobs', 'stats'],
    queryFn: API_GetIngestionStats,
  })
  const issueStats = useQuery({
    queryKey: ['quality-issues', 'stats', 'mine'],
    queryFn: () => API_GetQualityIssueStats({ mine_only: true }),
  })
  return (
    <div className="space-y-5">


      {context.needs_department_assignment && <DepartmentAssignmentBanner note={context.note} />}

      {jobStats.isPending ? (
        <LoadingState label="Đang tải thống kê nạp dữ liệu…" />
      ) : jobStats.isError ? (
        <ErrorState
          message={getApiErrorMessage(jobStats.error, 'Không tải được thống kê nạp dữ liệu.')}
          retrying={jobStats.isFetching}
          onRetry={() => void jobStats.refetch()}
        />
      ) : (
        <section
          aria-label="Thống kê nạp dữ liệu"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4"
        >
          <KpiCard dashboard label="Tổng số lần nạp" value={formatNumber(jobStats.data.total)} />
          <KpiCard
            dashboard
            label="Nạp thành công"
            value={formatNumber(jobStats.data.success)}
            tone="emerald"
          />
          <KpiCard
            dashboard
            label="Đang chờ hoặc xử lý"
            value={formatNumber(
              jobStats.data.queued + jobStats.data.running + (jobStats.data.retry_wait ?? 0)
            )}
            tone="amber"
          />
          <KpiCard
            dashboard
            label="Nạp thất bại"
            value={formatNumber(jobStats.data.failed)}
            tone="rose"
          />
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
              retrying={issueStats.isFetching}
              onRetry={() => void issueStats.refetch()}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tổng yêu cầu{' '}
                <strong className="font-semibold text-foreground">
                  {formatNumber(issueStats.data.total)}
                </strong>
              </p>
              <CountChart
                unit="yêu cầu"
                data={[
                  { label: 'Cần xử lý', count: issueStats.data.assigned, tone: 'warning' },
                  { label: 'Chờ xác minh', count: issueStats.data.pending_verification },
                  { label: 'Đã xác minh', count: issueStats.data.verified, tone: 'success' },
                ]}
              />
            </div>
          )}
        </Card>

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
