'use client'

import type { ReactNode } from 'react'

import { AlertTriangle, ShieldAlert } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import type { StaffContext } from '@/api/shared/staff'
import { ErrorState } from '@/components/page/page-parts'
import { Skeleton } from '@/components/ui/skeleton'
import { useStaffContext } from '@/hooks/use-staff-context'

export function StaffLoadingSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải ngữ cảnh nhân viên">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

export function DepartmentAssignmentBanner({ note }: { note: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
      <div className="space-y-0.5">
        <p className="font-semibold">Tài khoản chưa có phân công đơn vị đang hiệu lực</p>
        <p className="text-amber-800">{note}</p>
      </div>
    </div>
  )
}

export function StaffAccessDeniedState() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-6 py-10 text-center"
    >
      <ShieldAlert className="size-8 text-rose-600" aria-hidden="true" />
      <h2 className="text-base font-semibold text-rose-900">Không có quyền truy cập</h2>
      <p className="max-w-md text-xs leading-5 text-rose-700">
        Tài khoản của bạn không được cấp quyền sử dụng không gian làm việc dành cho nhân viên phòng
        ban. Vui lòng liên hệ quản trị viên nếu bạn cần được phân quyền.
      </p>
    </div>
  )
}

export function StaffContextGate({
  children,
  showAssignmentBanner = true,
}: {
  children: (context: StaffContext) => ReactNode
  showAssignmentBanner?: boolean
}) {
  const { data, isPending, isError, isForbidden, error, refetch } = useStaffContext()

  if (isPending) {
    return <StaffLoadingSkeleton />
  }

  if (isForbidden) {
    return <StaffAccessDeniedState />
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={getApiErrorMessage(
          error,
          'Không thể tải thông tin quyền và phạm vi làm việc. Vui lòng thử lại.'
        )}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      {showAssignmentBanner && data.needs_department_assignment && (
        <DepartmentAssignmentBanner note={data.note} />
      )}
      {children(data)}
    </div>
  )
}
