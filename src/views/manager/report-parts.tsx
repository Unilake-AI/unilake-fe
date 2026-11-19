'use client'

import type { ReactNode } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import { API_ManagerContext } from '@/api/manager/reports'
import type { ManagerContext, ManagerMetric } from '@/api/manager/reports'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  formatDateTime,
} from '@/components/page/page-parts'

export const names: Record<string, string> = {
  hr: 'Nhân sự',
  department: 'Phòng ban',
  position: 'Chức vụ',
  qualification: 'Văn bằng',
  curriculum: 'Khung chương trình',
  curriculum_course: 'Học phần trong khung',
  class_lecturer: 'Phân công giảng dạy',
  enrollment_grade: 'Kết quả học tập',
  admission_year: 'Năm tuyển sinh',
  admission_method: 'Phương thức tuyển sinh',
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
  title: 'Chức danh',
  student_status: 'Trạng thái sinh viên',
  academic_status: 'Trạng thái đào tạo',
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
  APPROVED: 'Đã phê duyệt',
  REVOKED: 'Đã thu hồi',
  COMPLETED: 'Hoàn tất',
  BRONZE: 'Tầng Bronze',
  SILVER: 'Tầng Silver',
  GOLD: 'Tầng Gold',
}
export const label = (key: string) => names[key] ?? key
export const number = (value: number) => value.toLocaleString('vi-VN')
export const inputClass = 'rounded-lg border border-slate-300 bg-white p-2 text-sm'

export function ManagerGate({ children }: { children: (context: ManagerContext) => ReactNode }) {
  const context = useQuery({
    queryKey: ['manager', 'context'],
    queryFn: API_ManagerContext,
    refetchInterval: 15_000,
    refetchOnMount: 'always',
  })
  if (context.isPending || (!context.isFetchedAfterMount && !context.isError))
    return <LoadingState label="Đang kiểm tra quyền quản lý…" />
  if (context.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(context.error, 'Không thể đọc quyền quản lý.')}
        onRetry={() => void context.refetch()}
      />
    )
  if (!context.data.departments.length)
    return (
      <Card title="Chưa cấu hình phòng phụ trách">
        <EmptyState
          title="Cần cấu hình phòng theo vai trò"
          description="Liên hệ quản trị viên để thiết lập phòng phụ trách đang hoạt động theo vai trò quản lý."
        />
      </Card>
    )
  return (
    <>
      {context.data.needs_department_configuration && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Một số phòng phụ trách theo vai trò chưa được cấu hình hoặc đã ngừng hoạt động. Dữ liệu
          của các phòng đã sẵn sàng được hiển thị.
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
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Số bản ghi theo nguồn">
      <table className="w-full min-w-[360px] text-left text-xs">
        <thead>
          <tr>
            <th scope="col" className="px-3 py-2">
              Loại dữ liệu
            </th>
            <th scope="col" className="px-3 py-2">
              Bộ dữ liệu và nguồn
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Bản ghi
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={JSON.stringify([item.scope, item.entity, item.metric, item.dimensions])}>
              <th scope="row" className="px-3 py-2.5 font-medium">
                {label(item.entity)}
              </th>
              <td className="px-3 py-2.5">
                <p>{item.dataset_name}</p>
                <p className="break-all text-muted-foreground">Nguồn: {item.scope}</p>
                <p className="text-muted-foreground">
                  Cập nhật: {formatDateTime(item.finished_at)}
                </p>
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                {number(item.value)}
                <span className="sr-only"> bản ghi</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
