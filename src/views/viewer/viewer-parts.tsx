'use client'

import type { ReactNode } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import { API_ViewerContext } from '@/api/viewer'
import type { DomainStatus, ViewerContext } from '@/api/viewer'
import { Button, ErrorState, LoadingState, Tag } from '@/components/page/page-parts'
import type { StatusTone } from '@/types/page/page-parts'

export const DOMAIN_NAMES: Record<string, string> = {
  hr: 'Nhân sự',
  academic: 'Đào tạo',
  admissions: 'Tuyển sinh',
}

export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  READY: 'Sẵn sàng',
  PARTIAL: 'Cập nhật một phần',
  PENDING: 'Chờ công bố Gold',
  NO_DATA: 'Chưa có dữ liệu',
}

export const DOMAIN_STATUS_TONES: Record<DomainStatus, StatusTone> = {
  READY: 'emerald',
  PARTIAL: 'sky',
  PENDING: 'amber',
  NO_DATA: 'slate',
}

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Cần xử lý',
  PENDING_VERIFICATION: 'Chờ xác minh',
  VERIFIED: 'Đã xác minh',
}

export const ISSUE_STATUS_TONES: Record<string, StatusTone> = {
  ASSIGNED: 'amber',
  PENDING_VERIFICATION: 'sky',
  VERIFIED: 'emerald',
}

export const labelDomain = (domain: string) => DOMAIN_NAMES[domain] ?? domain
export const labelStatus = (status: DomainStatus) => DOMAIN_STATUS_LABELS[status] ?? status
export const labelIssueStatus = (status: string) => ISSUE_STATUS_LABELS[status] ?? status
export const numberFormat = (val: number | undefined | null) =>
  typeof val === 'number' ? val.toLocaleString('vi-VN') : '—'

export function DomainStatusBadge({ status }: { status: DomainStatus }) {
  const tone = DOMAIN_STATUS_TONES[status] ?? 'slate'
  const label = DOMAIN_STATUS_LABELS[status] ?? status
  return <Tag tone={tone}>{label}</Tag>
}

export function IssueStatusBadge({ status }: { status: string }) {
  const tone = ISSUE_STATUS_TONES[status] ?? 'slate'
  const label = ISSUE_STATUS_LABELS[status] ?? status
  return <Tag tone={tone}>{label}</Tag>
}

export function ViewerPaging({
  page,
  setPage,
  total,
  limit = 20,
}: {
  page: number
  setPage: (page: number) => void
  total: number
  limit?: number
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
      <span>
        Trang {page + 1} / {totalPages} (Tổng {numberFormat(total)} mục)
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          disabled={page <= 0}
          onClick={() => setPage(page - 1)}
          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
        >
          Trước
        </Button>
        <Button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
        >
          Sau
        </Button>
      </div>
    </div>
  )
}

export function ViewerGate({ children }: { children: (context: ViewerContext) => ReactNode }) {
  const query = useQuery({
    queryKey: ['viewer', 'context'],
    queryFn: API_ViewerContext,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
  })

  if (query.isPending || (!query.isFetchedAfterMount && !query.isError)) {
    return <LoadingState label="Đang kiểm tra quyền truy cập điều hành…" />
  }

  if (query.isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(query.error, 'Không thể xác thực quyền truy cập Viewer.')}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const context = query.data
  const hasViewerRole = context.roles.includes('VIEWER') || context.roles.includes('ADMIN')
  if (!hasViewerRole) {
    return (
      <ErrorState
        message="Tài khoản không có vai trò Người xem điều hành (VIEWER)."
        onRetry={() => void query.refetch()}
      />
    )
  }

  return <>{children(context)}</>
}
