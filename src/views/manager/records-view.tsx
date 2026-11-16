'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ManagerRecord,
  API_ManagerRecords,
  API_ManagerRecordTypes,
} from '@/api/manager/records'
import type {
  DatabaseSyncStats,
  ManagerDomain,
  RecordFilters,
  RecordType,
} from '@/api/manager/records'
import { API_ManagerDatasets, API_ManagerOverview } from '@/api/manager/reports'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  formatDateTime,
} from '@/components/page/page-parts'

import { Paging, inputClass, label, number } from './report-parts'

const polling = { refetchInterval: 15_000 } as const
const size = 20
const fieldNames: Record<string, string> = {
  full_name: 'Họ và tên',
  employee_code: 'Mã nhân viên',
  employee_id: 'Mã nhân viên trong hệ thống',
  student_code: 'Mã sinh viên',
  student_id: 'Mã sinh viên trong hệ thống',
  applicant_id: 'Mã thí sinh',
  hire_date: 'Ngày vào làm',
  start_date: 'Ngày bắt đầu',
  end_date: 'Ngày kết thúc',
  credit_hours: 'Số tín chỉ',
  is_primary: 'Phân công chính',
  is_active: 'Đang hoạt động',
  position_level: 'Cấp chức vụ',
  research_field: 'Lĩnh vực nghiên cứu',
  room: 'Phòng học',
  max_capacity: 'Sĩ số tối đa',
  midterm_score: 'Điểm giữa kỳ',
  final_score: 'Điểm cuối kỳ',
  total_score: 'Điểm tổng kết',
  grade_value: 'Điểm quy đổi',
  letter_grade: 'Điểm chữ',
  registration_date: 'Ngày ghi nhận điểm',
  enrollment_date: 'Ngày đăng ký',
  department_type: 'Loại đơn vị',
  parent_department_id: 'Đơn vị cấp trên',
  teaching_role: 'Vai trò giảng dạy',
  assigned_from: 'Phân công từ',
  assigned_to: 'Phân công đến',
  qualification_type: 'Loại văn bằng',
  version: 'Phiên bản',
  effective_from: 'Hiệu lực từ',
  effective_to: 'Hiệu lực đến',
  semester_no: 'Học kỳ trong chương trình',
  course_type: 'Loại học phần',
  is_required: 'Bắt buộc',
  prerequisite_course_id: 'Học phần tiên quyết',
  duration_years: 'Thời gian đào tạo (năm)',
  tuition_fee_per_credit: 'Học phí mỗi tín chỉ',
  high_school_name: 'Trường THPT',
  preference_rank: 'Thứ tự nguyện vọng',
  application_date: 'Ngày đăng ký xét tuyển',
  admission_score: 'Điểm xét tuyển',
  year_label: 'Năm tuyển sinh',
  method_code: 'Mã phương thức',
  method_name: 'Tên phương thức',
  max_score: 'Điểm tối đa',
  description: 'Mô tả',
}
const values: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  Active: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  Inactive: 'Ngừng hoạt động',
  Male: 'Nam',
  Female: 'Nữ',
  MALE: 'Nam',
  FEMALE: 'Nữ',
  RESIGNED: 'Đã nghỉ việc',
  RETIRED: 'Đã nghỉ hưu',
  ENDED: 'Đã kết thúc',
  STUDYING: 'Đang học',
  GRADUATED: 'Đã tốt nghiệp',
  ADMITTED: 'Trúng tuyển',
  REJECTED: 'Không trúng tuyển',
}
export function fieldLabel(field: string): string {
  if (fieldNames[field]) return fieldNames[field]
  if (field.endsWith('_name')) return `Tên ${label(field.slice(0, -5)).toLowerCase()}`
  if (field.endsWith('_code')) return `Mã ${label(field.slice(0, -5)).toLowerCase()}`
  if (field.endsWith('_id') && label(field) === field)
    return `Mã ${label(field.slice(0, -3)).toLowerCase()}`
  return label(field)
}
function valueLabel(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return 'Chưa có thông tin'
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'number') return field.endsWith('_id') ? String(value) : number(value)
  if (typeof value === 'string') {
    if (field === 'status' || field.endsWith('_status') || field === 'gender')
      return values[value] ?? value
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      (field.endsWith('_date') || field.endsWith('_from') || field.endsWith('_to'))
    )
      return value.split('-').reverse().join('/')
    return value
  }
  return JSON.stringify(value)
}
export function databaseStatus(status?: string | null): string {
  return (
    (
      {
        SYNCED: 'Đã ghi vào DB',
        BLOCKED: 'Cần bổ sung dữ liệu',
        QUEUED: 'Chờ ghi vào DB',
        RUNNING: 'Đang ghi vào DB',
        FAILED: 'Ghi DB thất bại',
        SUPERSEDED: 'Đã có bản mới',
      } as Record<string, string>
    )[status ?? ''] ?? 'Chưa đồng bộ DB'
  )
}
export function databaseError(code: string): string {
  return (
    (
      {
        GOLD_SYNC_REFERENCE_MISSING: 'Thiếu dữ liệu liên kết. Liên hệ quản trị dữ liệu để bổ sung.',
        GOLD_SYNC_REQUIRED_FIELD: 'Thiếu trường bắt buộc trong nguồn dữ liệu.',
        GOLD_SYNC_ENTITY_MAPPING_REQUIRED: 'Nguồn dữ liệu cần được cấu hình ánh xạ nghiệp vụ.',
        GOLD_SYNC_SOURCE_CONFLICT: 'Mã nghiệp vụ bị trùng giữa các nguồn.',
      } as Record<string, string>
    )[code] ?? 'Đồng bộ dữ liệu chưa hoàn tất. Liên hệ quản trị dữ liệu để kiểm tra.'
  )
}
export function BusinessSync({ stats }: { stats: DatabaseSyncStats }) {
  return (
    <Card title="Dữ liệu nghiệp vụ" subtitle="Trạng thái lưu dữ liệu chi tiết vào cơ sở dữ liệu.">
      <div className="flex flex-wrap gap-5 text-sm" role="status">
        <span>
          <strong>
            {number(stats.synced ?? 0)}/{number(stats.total ?? 0)}
          </strong>{' '}
          nguồn đã ghi vào DB
        </span>
        <span>{number((stats.queued ?? 0) + (stats.running ?? 0))} nguồn đang chờ hoặc xử lý</span>
        <span>{number(stats.not_started ?? 0)} nguồn chưa bắt đầu</span>
        <span className="text-amber-800">
          {number(stats.blocked ?? 0)} nguồn cần bổ sung dữ liệu
        </span>
        <span className="text-rose-700">{number(stats.failed ?? 0)} nguồn ghi DB thất bại</span>
      </div>
      {Boolean((stats.not_started ?? 0) + (stats.blocked ?? 0) + (stats.failed ?? 0)) && (
        <p className="mt-3 text-sm text-slate-600">
          Một số nguồn chưa sẵn sàng để xem bản ghi chi tiết. Xem trạng thái từng nguồn tại Bộ dữ
          liệu phòng ban.
        </p>
      )}
    </Card>
  )
}

export function ManagerRecords({ domain, userId }: { domain: ManagerDomain; userId: number }) {
  const [entity, setEntity] = useState('')
  const types = useQuery({
    queryKey: ['manager', 'record-types', userId, domain],
    queryFn: () => API_ManagerRecordTypes(domain),
    ...polling,
  })
  const overview = useQuery({
    queryKey: ['manager', 'records-readiness', userId, domain],
    queryFn: () => API_ManagerOverview({ domain }),
    ...polling,
  })
  if (types.isPending) return <LoadingState label="Đang tải các loại dữ liệu được phép xem…" />
  if (types.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(types.error, 'Không thể tải loại dữ liệu.')}
        onRetry={() => void types.refetch()}
      />
    )
  const selected = types.data.find((item) => item.entity === entity) ?? types.data[0]
  return (
    <div className="space-y-5">
      {overview.isError ? (
        <ErrorState
          message={getApiErrorMessage(overview.error, 'Không thể tải trạng thái đồng bộ.')}
          onRetry={() => void overview.refetch()}
        />
      ) : overview.data?.database_sync ? (
        <BusinessSync stats={overview.data.database_sync} />
      ) : null}
      {!selected ? (
        <EmptyState title="Chưa có loại dữ liệu được phép xem" />
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Loại dữ liệu nghiệp vụ
            <select
              className={inputClass}
              value={selected.entity}
              onChange={(event) => setEntity(event.target.value)}
            >
              {types.data.map((item) => (
                <option key={item.entity} value={item.entity}>
                  {label(item.entity)}
                </option>
              ))}
            </select>
          </label>
          <RecordsList
            key={`${domain}:${selected.entity}`}
            domain={domain}
            userId={userId}
            spec={selected}
          />
        </>
      )}
    </div>
  )
}

function RecordsList({
  domain,
  spec,
  userId,
}: {
  domain: ManagerDomain
  spec: RecordType
  userId: number
}) {
  const [draftSearch, setDraftSearch] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const [draftDataset, setDraftDataset] = useState('')
  const [applied, setApplied] = useState<RecordFilters>({})
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const params = { ...applied, limit: size, offset: page * size }
  const datasets = useInfiniteQuery({
    queryKey: ['manager', 'record-datasets', userId, domain],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => API_ManagerDatasets({ domain, limit: 100, offset: pageParam }),
    getNextPageParam: (last) =>
      last.offset + last.limit < last.total ? last.offset + last.limit : undefined,
  })
  const query = useQuery({
    queryKey: ['manager', 'records', userId, domain, spec.entity, params],
    queryFn: () => API_ManagerRecords(domain, spec.entity, params),
    ...polling,
  })
  const columns = spec.fields.slice(0, 6)
  return (
    <div className="space-y-5">
      <Card
        title={`Danh sách ${label(spec.entity).toLowerCase()}`}
        subtitle="Chỉ hiển thị dữ liệu Gold đã lưu vào DB và thuộc phòng được phép quản lý."
      >
        <form
          className="mb-5 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setApplied({
              search: spec.search_fields.length ? draftSearch.trim() || undefined : undefined,
              status: spec.status_field ? draftStatus.trim() || undefined : undefined,
              dataset_id: draftDataset ? Number(draftDataset) : undefined,
            })
            setPage(0)
            setSelected(null)
          }}
        >
          {Boolean(spec.search_fields.length) && (
            <label className="flex flex-col gap-1 text-xs">
              Tìm theo mã hoặc tên
              <input
                className={inputClass}
                maxLength={100}
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Nhập mã hoặc tên"
              />
            </label>
          )}
          {spec.status_field && (
            <label className="flex flex-col gap-1 text-xs">
              Trạng thái bản ghi
              <input
                className={inputClass}
                maxLength={30}
                value={draftStatus}
                onChange={(event) => setDraftStatus(event.target.value)}
                placeholder="Ví dụ: ACTIVE"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs">
            Bộ dữ liệu
            <select
              className={inputClass}
              value={draftDataset}
              onChange={(event) => setDraftDataset(event.target.value)}
            >
              <option value="">Tất cả bộ dữ liệu được phép xem</option>
              {!datasets.isError &&
                datasets.data?.pages
                  .flatMap((item) => item.items)
                  .map((item) => (
                    <option key={item.dataset_id} value={item.dataset_id}>
                      {item.dataset_name}
                    </option>
                  ))}
            </select>
          </label>
          <Button type="submit">Áp dụng bộ lọc</Button>
          <Button
            type="button"
            onClick={() => {
              setDraftSearch('')
              setDraftStatus('')
              setDraftDataset('')
              setApplied({})
              setPage(0)
              setSelected(null)
            }}
          >
            Xóa bộ lọc
          </Button>
        </form>
        {datasets.hasNextPage && (
          <Button
            disabled={datasets.isFetchingNextPage}
            onClick={() => void datasets.fetchNextPage()}
          >
            Tải thêm bộ dữ liệu
          </Button>
        )}
        {datasets.isError && (
          <ErrorState
            message={getApiErrorMessage(datasets.error, 'Không thể tải bộ lọc bộ dữ liệu.')}
            onRetry={() => void datasets.refetch()}
          />
        )}
        {query.isPending ? (
          <LoadingState label="Đang tải bản ghi…" />
        ) : query.isError ? (
          <ErrorState
            message={getApiErrorMessage(query.error, 'Không thể tải dữ liệu nghiệp vụ.')}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {!query.data.items.length ? (
              <EmptyState
                title="Chưa có bản ghi phù hợp"
                description="Kiểm tra bộ lọc và trạng thái đồng bộ. Nguồn đang chờ hoặc bị chặn chưa có dữ liệu chi tiết để hiển thị."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {columns.map((field) => (
                        <th key={field} className="px-3 py-2">
                          {fieldLabel(field)}
                        </th>
                      ))}
                      <th className="px-3 py-2">Nguồn dữ liệu</th>
                      <th className="px-3 py-2">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((item) => (
                      <tr key={item.record_id} className="border-t">
                        {columns.map((field) => (
                          <td key={field} className="p-3">
                            {valueLabel(item.values[field], field)}
                          </td>
                        ))}
                        <td className="p-3">{item.source.dataset_name}</td>
                        <td className="p-3">
                          <Button onClick={() => setSelected(item.record_id)}>
                            Xem bản ghi #{item.record_id}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Paging
              page={page}
              setPage={(next) => {
                setPage(next)
                setSelected(null)
              }}
              total={query.data.total}
            />
            {selected !== null && query.data.items.some((item) => item.record_id === selected) && (
              <RecordDetail
                key={selected}
                domain={domain}
                userId={userId}
                spec={spec}
                id={selected}
                onClose={() => setSelected(null)}
              />
            )}
          </>
        )}
      </Card>
      <p className="text-sm text-slate-600">
        Theo dõi dữ liệu chưa đồng bộ tại{' '}
        <Link className="font-semibold text-indigo-700 underline" href="/manager/datasets">
          Bộ dữ liệu phòng ban
        </Link>
        .
      </p>
    </div>
  )
}
function RecordDetail({
  domain,
  spec,
  id,
  userId,
  onClose,
}: {
  domain: ManagerDomain
  spec: RecordType
  id: number
  userId: number
  onClose: () => void
}) {
  const query = useQuery({
    queryKey: ['manager', 'record', userId, domain, spec.entity, id],
    queryFn: () => API_ManagerRecord(domain, spec.entity, id),
    ...polling,
  })
  return (
    <Card title={`Chi tiết bản ghi #${id}`} right={<Button onClick={onClose}>Đóng bản ghi</Button>}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={getApiErrorMessage(
            query.error,
            'Bản ghi không còn khả dụng trong phạm vi được xem.'
          )}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            {spec.fields.map((field) => (
              <div key={field}>
                <dt className="text-xs text-slate-500">{fieldLabel(field)}</dt>
                <dd className="mt-1 break-words text-sm">
                  {valueLabel(query.data.values[field], field)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p>Nguồn: {query.data.source.dataset_name}</p>
            <p>
              Công bố: {formatDateTime(query.data.source.published_at)} · Lưu vào DB:{' '}
              {formatDateTime(query.data.source.synced_at)}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer">Phiên bản nguồn</summary>
              <p className="mt-2 break-all font-mono">Gold: {query.data.source.gold_job_id}</p>
              <p className="break-all font-mono">Silver: {query.data.source.silver_snapshot_id}</p>
            </details>
          </div>
        </>
      )}
    </Card>
  )
}
