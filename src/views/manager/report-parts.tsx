'use client'

import type { ReactNode } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import { API_ManagerContext } from '@/api/manager/reports'
import type { ManagerContext, ManagerMetric } from '@/api/manager/reports'
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/page/page-parts'

export const names: Record<string, string> = {
  hr: 'Nhân sự',
  academic: 'Đào tạo',
  admissions: 'Tuyển sinh',
  employee: 'Nhân sự',
  assignment: 'Phân công',
  lecturer: 'Giảng viên',
  student: 'Sinh viên',
  class: 'Lớp học phần',
  enrollment: 'Đăng ký học',
  semester: 'Học kỳ',
  course: 'Học phần',
  applicant: 'Thí sinh',
  admission: 'Hồ sơ tuyển sinh',
  program: 'Chương trình',
  major: 'Ngành',
  gender: 'Giới tính',
  employee_status: 'Trạng thái nhân sự',
  birth_year: 'Năm sinh',
  department_id: 'Đơn vị',
  position_id: 'Chức vụ',
  assignment_status: 'Trạng thái phân công',
  academic_degree: 'Học vị',
  academic_title: 'Học hàm',
  student_status: 'Trạng thái sinh viên',
  program_id: 'Chương trình',
  admission_year_id: 'Năm tuyển sinh',
  course_id: 'Học phần',
  semester_id: 'Học kỳ',
  class_status: 'Trạng thái lớp',
  class_id: 'Lớp',
  enrollment_status: 'Trạng thái đăng ký',
  academic_year: 'Năm học',
  status: 'Trạng thái',
  province: 'Tỉnh thành',
  admission_method_id: 'Phương thức tuyển sinh',
  admission_status: 'Trạng thái hồ sơ',
  major_id: 'Ngành',
  degree_level: 'Bậc học',
  record_count: 'Số bản ghi',
  CURRENT: 'Đã đồng bộ',
  NOT_STARTED: 'Chưa tạo báo cáo',
  QUEUED: 'Đang chờ',
  RUNNING: 'Đang tổng hợp',
  RETRY_WAIT: 'Đang chờ thử lại',
  FAILED: 'Xử lý lỗi',
  SUCCEEDED: 'Đã công bố',
  SUPERSEDED: 'Đã có bản mới',
  READY: 'Dữ liệu đã cập nhật',
  PARTIAL: 'Một phần dữ liệu đang cập nhật',
  PENDING: 'Chưa có báo cáo hiện hành',
  NO_DATA: 'Chưa có dữ liệu báo cáo',
  ASSIGNED: 'Cần xử lý',
  PENDING_VERIFICATION: 'Chờ xác minh',
  VERIFIED: 'Đã xác minh',
}
export const label = (key: string) => names[key] ?? key
export const number = (value: number) => value.toLocaleString('vi-VN')
export const inputClass = 'rounded-lg border border-slate-300 bg-white p-2 text-sm'

export function ManagerGate({ children }: { children: (context: ManagerContext) => ReactNode }) {
  const context = useQuery({
    queryKey: ['manager', 'context'],
    queryFn: API_ManagerContext,
    refetchInterval: 15_000,
  })
  if (context.isPending) return <LoadingState label="Đang kiểm tra quyền quản lý…" />
  if (context.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(context.error, 'Không thể đọc quyền quản lý.')}
        onRetry={() => void context.refetch()}
      />
    )
  if (!context.data.departments.length)
    return (
      <Card title="Chưa có phân công phòng ban">
        <EmptyState
          title="Cần phân công đang hiệu lực"
          description="Liên hệ quản trị viên để gán phòng phụ trách phù hợp với vai trò quản lý."
        />
      </Card>
    )
  return (
    <>
      {context.data.needs_department_assignment && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Một số lĩnh vực chưa có phân công phòng ban. Chỉ dữ liệu thuộc phạm vi đang hiệu lực được
          hiển thị.
        </p>
      )}
      {children(context.data)}
    </>
  )
}

export function Paging({
  page,
  setPage,
  total,
  count,
  size = 20,
}: {
  page: number
  setPage: (page: number) => void
  total?: number
  count?: number
  size?: number
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-600">
      <span>
        Trang {page + 1}
        {total !== undefined ? ` · ${number(total)} kết quả` : ''}
      </span>
      <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
        Trang trước
      </Button>
      <Button
        disabled={total !== undefined ? (page + 1) * size >= total : (count ?? 0) < size}
        onClick={() => setPage(page + 1)}
      >
        Trang sau
      </Button>
    </div>
  )
}

export function MetricList({ items }: { items: ManagerMetric[] }) {
  if (!items.length)
    return (
      <EmptyState
        title="Chưa có chỉ số phù hợp"
        description="Báo cáo sẽ xuất hiện khi dữ liệu được tổng hợp xong. Không có dữ liệu không đồng nghĩa với số lượng bằng 0."
      />
    )
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={JSON.stringify([item.scope, item.entity, item.metric, item.dimensions])}
          className="rounded-xl border border-slate-200 p-4"
        >
          <p className="text-sm font-semibold">{label(item.entity)}</p>
          <p className="mt-2 text-3xl font-bold text-indigo-700">
            {number(item.value)} <span className="text-xs font-normal text-slate-500">bản ghi</span>
          </p>
          <p className="mt-2 text-xs text-slate-600">{item.dataset_name}</p>
          <p className="mt-1 break-all text-xs text-slate-500">Nguồn: {item.scope}</p>
        </div>
      ))}
    </div>
  )
}
