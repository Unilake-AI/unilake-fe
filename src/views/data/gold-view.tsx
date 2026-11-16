'use client'

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  API_GoldSources,
  API_GoldJobs,
  API_GoldJob,
  API_GoldMetrics,
  API_GoldAttempts,
  API_GoldWorkers,
  API_GoldRecipes,
  API_RefreshGold,
  API_RetryGold,
  API_RetryGoldDatabaseSync,
  API_GoldReport,
} from '@/api/admindata/gold'
import type { GoldDomain } from '@/api/admindata/gold'
import { getApiErrorMessage } from '@/api/http'
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  formatDateTime,
} from '@/components/page/page-parts'

const statusNames: Record<string, string> = {
  QUEUED: 'Đang chờ',
  RUNNING: 'Đang tổng hợp',
  RETRY_WAIT: 'Chờ thử lại',
  SUCCEEDED: 'Đã công bố',
  FAILED: 'Có lỗi',
  SUPERSEDED: 'Đã có bản mới',
  CURRENT: 'Gold hiện hành',
  NOT_STARTED: 'Chưa tạo Gold',
}
const databaseStatuses: Record<string, string> = {
  QUEUED: 'Chờ ghi vào DB',
  RUNNING: 'Đang ghi vào DB',
  SYNCED: 'Đã ghi vào DB',
  BLOCKED: 'Cần bổ sung dữ liệu',
  FAILED: 'Ghi DB thất bại',
  SUPERSEDED: 'Đã có bản mới',
}
function databaseStatus(status: string | null) {
  return status ? (databaseStatuses[status] ?? status) : 'Chưa đồng bộ DB'
}
const syncReasons: Record<string, string> = {
  GOLD_SYNC_REQUIRED_FIELD: 'Thiếu trường bắt buộc',
  GOLD_SYNC_REFERENCE_MISSING: 'Thiếu dữ liệu liên kết',
  GOLD_SYNC_ENTITY_MAPPING_REQUIRED: 'Cần khai báo ánh xạ nghiệp vụ',
  GOLD_SYNC_SOURCE_CONFLICT: 'Mã nghiệp vụ trùng giữa các nguồn',
  GOLD_SYNC_FIELD_INVALID: 'Giá trị chưa hợp lệ',
}
const domains = { hr: 'Nhân sự', academic: 'Đào tạo', admissions: 'Tuyển sinh' }
const fields: Record<string, string> = {
  gender: 'Giới tính',
  employee_status: 'Trạng thái nhân viên',
  birth_year: 'Năm sinh',
  department_id: 'Đơn vị',
  position_id: 'Vị trí',
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
}
const size = 20
const inputClass = 'rounded-lg border border-slate-300 bg-white p-2 text-sm'

export function GoldView() {
  const client = useQueryClient()
  const [domain, setDomain] = useState<GoldDomain | ''>('')
  const [sourcePage, setSourcePage] = useState(0)
  const [jobPage, setJobPage] = useState(0)
  const [metricPage, setMetricPage] = useState(0)
  const [selected, setSelected] = useState('')
  const [retryId, setRetryId] = useState('')
  const [databaseRetryId, setDatabaseRetryId] = useState('')
  const [notice, setNotice] = useState('')
  const filter = domain ? { domain } : {}
  const sources = useQuery({
    queryKey: ['gold', 'sources', domain, sourcePage],
    queryFn: () => API_GoldSources({ ...filter, limit: size, offset: sourcePage * size }),
    refetchInterval: 5000,
  })
  const jobs = useQuery({
    queryKey: ['gold', 'jobs', domain, jobPage],
    queryFn: () => API_GoldJobs({ ...filter, limit: size, offset: jobPage * size }),
    refetchInterval: 5000,
  })
  const metrics = useQuery({
    queryKey: ['gold', 'metrics', domain, metricPage],
    queryFn: () => API_GoldMetrics({ ...filter, limit: size, offset: metricPage * size }),
    refetchInterval: 5000,
  })
  const workers = useQuery({
    queryKey: ['gold', 'workers'],
    queryFn: API_GoldWorkers,
    refetchInterval: 10000,
  })
  const recipes = useQuery({ queryKey: ['gold', 'recipes'], queryFn: API_GoldRecipes })
  const detail = useQuery({
    queryKey: ['gold', 'detail', selected],
    queryFn: () => API_GoldJob(selected),
    enabled: Boolean(selected),
    refetchInterval: 5000,
  })
  const attempts = useQuery({
    queryKey: ['gold', 'attempts', selected],
    queryFn: () => API_GoldAttempts(selected),
    enabled: Boolean(selected),
    refetchInterval: 5000,
  })
  const update = useMutation({
    mutationFn: API_RefreshGold,
    onSuccess: async (value) => {
      setSelected(value.job_id)
      setNotice('Đã ghi nhận lượt Gold. Kết quả sẽ cập nhật khi xử lý xong.')
      await client.invalidateQueries({ queryKey: ['gold'] })
    },
  })
  const retry = useMutation({
    mutationFn: API_RetryGold,
    onSuccess: async () => {
      setRetryId('')
      setNotice('Đã yêu cầu thử lại.')
      await client.invalidateQueries({ queryKey: ['gold'] })
    },
  })
  const retryDatabase = useMutation({
    mutationFn: API_RetryGoldDatabaseSync,
    onSuccess: async () => {
      setDatabaseRetryId('')
      setNotice('Đã yêu cầu đồng bộ lại dữ liệu Gold vào DB.')
      await client.invalidateQueries({ queryKey: ['gold'] })
    },
  })
  const download = useMutation({
    mutationFn: API_GoldReport,
    onSuccess: (blob, id) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gold-${id}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
  })
  function paging(page: number, setPage: (page: number) => void, count = 0) {
    return (
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button disabled={page === 0} onClick={() => setPage(page - 1)}>
          Trang trước
        </Button>
        <span className="text-xs text-slate-500">Trang {page + 1}</span>
        <Button disabled={count < size} onClick={() => setPage(page + 1)}>
          Trang sau
        </Button>
      </div>
    )
  }
  const errors = [update.error, retry.error, retryDatabase.error, download.error].filter(Boolean)
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Gold']}
        title="Tổng hợp & Báo cáo Gold"
        description="Silver công bố xong sẽ tự tạo lượt Gold. Theo dõi công bố Gold, đồng bộ dữ liệu vào DB và tải báo cáo theo từng nguồn."
        actions={
          <Button onClick={() => void client.invalidateQueries({ queryKey: ['gold'] })}>
            Làm mới
          </Button>
        }
      />
      <Card title="Phạm vi báo cáo">
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            Lĩnh vực
            <select
              aria-label="Lĩnh vực Gold"
              className={inputClass}
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value as GoldDomain | '')
                setSourcePage(0)
                setJobPage(0)
                setMetricPage(0)
                setSelected('')
              }}
            >
              <option value="">Cả ba lĩnh vực</option>
              {Object.entries(domains).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-slate-600">
            {recipes.data?.note ??
              'Đếm bản ghi trong từng nguồn Silver; không cộng thành số người duy nhất toàn trường.'}
          </p>
          <p className="text-xs text-slate-500">
            Gold chỉ nhận các dòng đã đạt chuẩn. File chưa xác định loại dữ liệu chỉ được đếm số
            dòng. Mã nhóm giữ nguyên giá trị từ Silver.
          </p>
          {recipes.isError && (
            <ErrorState
              message={getApiErrorMessage(
                recipes.error,
                'Chưa lấy được thông tin Gold. Vui lòng thử lại.'
              )}
            />
          )}
        </div>
      </Card>
      {notice && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </p>
      )}
      {errors.map((error, index) => (
        <ErrorState
          key={index}
          message={getApiErrorMessage(error, 'Chưa lấy được thông tin Gold. Vui lòng thử lại.')}
        />
      ))}
      <Card
        title="Nguồn Silver và tiến độ Gold"
        subtitle="Nguồn đã có trước khi triển khai Gold có thể cần bấm Tạo Gold một lần."
      >
        {sources.isPending ? (
          <LoadingState />
        ) : sources.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              sources.error,
              'Chưa lấy được thông tin Gold. Vui lòng thử lại.'
            )}
            onRetry={() => void sources.refetch()}
          />
        ) : !sources.data?.length ? (
          <EmptyState title="Chưa có Silver đã công bố" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Bộ dữ liệu</th>
                  <th>Lĩnh vực</th>
                  <th>Công bố Gold</th>
                  <th>Dữ liệu nghiệp vụ</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sources.data.map((item) => (
                  <tr key={item.scope} className="border-t">
                    <td className="py-3">
                      {item.dataset_name}
                      <div
                        className="max-w-xs truncate font-mono text-xs text-slate-500"
                        title={item.silver_snapshot_id}
                      >
                        Silver: {item.silver_snapshot_id}
                      </div>
                    </td>
                    <td>{domains[item.domain]}</td>
                    <td>
                      {statusNames[item.sync_status]}
                      {item.error_code && (
                        <div className="text-xs text-red-700">{item.error_code}</div>
                      )}
                    </td>
                    <td>
                      {databaseStatus(item.database_sync_status)}
                      {item.database_sync_error && (
                        <div className="text-xs text-red-700">
                          {syncReasons[item.database_sync_error] ?? item.database_sync_error}
                        </div>
                      )}
                    </td>
                    <td>
                      {item.sync_status === 'NOT_STARTED' ? (
                        <Button
                          disabled={update.isPending}
                          onClick={() => update.mutate(item.silver_snapshot_id)}
                        >
                          Tạo Gold
                        </Button>
                      ) : (
                        item.job_id && (
                          <Button onClick={() => setSelected(item.job_id!)}>Xem lượt Gold</Button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {paging(sourcePage, setSourcePage, sources.data?.length)}
      </Card>
      <Card
        title="Số liệu Gold hiện hành"
        subtitle="Khi Silver thay đổi, số liệu cũ được ẩn ở đây cho đến khi Gold cập nhật xong. Lịch sử vẫn được giữ lại."
      >
        {metrics.isPending ? (
          <LoadingState />
        ) : metrics.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              metrics.error,
              'Chưa lấy được thông tin Gold. Vui lòng thử lại.'
            )}
            onRetry={() => void metrics.refetch()}
          />
        ) : !metrics.data?.length ? (
          <EmptyState
            title="Chưa có số liệu Gold hiện hành"
            description="Xem tiến độ nguồn Silver phía trên; dữ liệu đang chờ hoặc có lỗi sẽ chưa xuất hiện trong báo cáo."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Bộ dữ liệu</th>
                  <th>Loại dữ liệu</th>
                  <th>Nhóm thống kê</th>
                  <th>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {metrics.data.map((item, index) => (
                  <tr key={`${item.gold_snapshot_id}-${index}`} className="border-t">
                    <td className="py-3">
                      {item.dataset_name || `Bộ dữ liệu #${item.dataset_id}`} ·{' '}
                      {domains[item.domain]}
                      <div className="text-xs text-slate-500" title={item.silver_snapshot_id}>
                        Silver: {item.silver_snapshot_id.slice(0, 8)}…
                      </div>
                    </td>
                    <td>{item.entity}</td>
                    <td>
                      {item.metric === 'record_count'
                        ? 'Tổng số bản ghi'
                        : Object.entries(item.dimensions)
                            .map(
                              ([key, value]) =>
                                `${fields[key] ?? key}: ${value === null ? 'Chưa có thông tin' : String(value)}`
                            )
                            .join(', ')}
                    </td>
                    <td className="font-semibold tabular-nums">
                      {item.value.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {paging(metricPage, setMetricPage, metrics.data?.length)}
      </Card>
      <Card title="Lịch sử xử lý Gold">
        {jobs.isPending ? (
          <LoadingState />
        ) : jobs.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              jobs.error,
              'Chưa lấy được thông tin Gold. Vui lòng thử lại.'
            )}
          />
        ) : !jobs.data?.length ? (
          <EmptyState title="Chưa có lượt Gold" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Bắt đầu</th>
                  <th>Bộ dữ liệu</th>
                  <th>Kết quả</th>
                  <th>Số lần thử</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobs.data.map((item) => (
                  <tr key={item.job_id} className="border-t">
                    <td className="py-3">{formatDateTime(item.created_at)}</td>
                    <td>
                      #{item.dataset_id} · {domains[item.domain]}
                    </td>
                    <td>
                      <div>{statusNames[item.status]}</div>
                      <div className="text-xs text-slate-600">
                        {databaseStatus(item.database_sync_status)}
                      </div>
                    </td>
                    <td>{item.attempt_number}</td>
                    <td className="space-x-2">
                      <Button onClick={() => setSelected(item.job_id)}>Chi tiết</Button>
                      {item.status === 'FAILED' && (
                        <Button onClick={() => setRetryId(item.job_id)}>Thử lại</Button>
                      )}
                      {item.status === 'SUCCEEDED' && (
                        <Button
                          disabled={download.isPending}
                          onClick={() => download.mutate(item.job_id)}
                        >
                          Tải CSV
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {paging(jobPage, setJobPage, jobs.data?.length)}
      </Card>
      {databaseRetryId && (
        <Card title="Đồng bộ lại vào DB">
          <p className="mb-3 text-sm">
            Sau khi bổ sung trường bắt buộc hoặc dữ liệu liên kết, chạy lại đồng bộ cho bản Gold
            này.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={retryDatabase.isPending}
              onClick={() => retryDatabase.mutate(databaseRetryId)}
            >
              Xác nhận đồng bộ
            </Button>
            <Button disabled={retryDatabase.isPending} onClick={() => setDatabaseRetryId('')}>
              Hủy
            </Button>
          </div>
        </Card>
      )}
      {retryId && (
        <Card title="Xác nhận thử lại">
          <p className="mb-3 text-sm">
            Chạy lại lượt Gold bị lỗi? Hệ thống chỉ chấp nhận nếu Silver nguồn vẫn đang được sử
            dụng.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={retry.isPending}
              variant="primary"
              onClick={() => retry.mutate(retryId)}
            >
              Xác nhận thử lại
            </Button>
            <Button disabled={retry.isPending} onClick={() => setRetryId('')}>
              Hủy
            </Button>
          </div>
        </Card>
      )}
      {selected && (
        <Card
          title="Chi tiết lượt Gold"
          right={<Button onClick={() => setSelected('')}>Đóng</Button>}
        >
          {detail.isPending ? (
            <LoadingState />
          ) : detail.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                detail.error,
                'Chưa lấy được thông tin Gold. Vui lòng thử lại.'
              )}
            />
          ) : (
            detail.data && (
              <div className="space-y-3 break-words text-sm">
                <p>
                  Trạng thái: <strong>{statusNames[detail.data.status]}</strong>
                </p>
                <p>
                  Phiên bản Gold: <span className="font-mono text-xs">{detail.data.job_id}</span>
                </p>
                <p>
                  Silver nguồn:{' '}
                  <span className="font-mono text-xs">{detail.data.silver_snapshot_id}</span>
                </p>
                <p>Quy định: {detail.data.recipe_version}</p>
                <p>
                  Dữ liệu nghiệp vụ:{' '}
                  <strong>{databaseStatus(detail.data.database_sync_status)}</strong>
                </p>
                {detail.data.database_sync_error && (
                  <p className="text-red-700">
                    {syncReasons[detail.data.database_sync_error] ??
                      detail.data.database_sync_error}
                    {detail.data.database_sync_report?.entity && (
                      <>
                        {' '}
                        · {detail.data.database_sync_report.entity}
                        {detail.data.database_sync_report.field
                          ? `.${detail.data.database_sync_report.field}`
                          : ''}
                      </>
                    )}
                  </p>
                )}
                {detail.data.database_sync_result && (
                  <p>
                    {Object.entries(detail.data.database_sync_result.entities)
                      .map(([table, count]) => `${table}: ${count.toLocaleString('vi-VN')} bản ghi`)
                      .join(' · ')}
                  </p>
                )}
                {['BLOCKED', 'FAILED'].includes(detail.data.database_sync_status ?? '') && (
                  <Button onClick={() => setDatabaseRetryId(selected)}>Đồng bộ lại vào DB</Button>
                )}
                {detail.data.error_code && (
                  <p className="text-red-700">Mã lỗi: {detail.data.error_code}</p>
                )}
                {detail.data.result && (
                  <p>
                    Đã đọc {detail.data.result.records_read.toLocaleString('vi-VN')} bản ghi ·{' '}
                    {detail.data.result.aggregate_rows.toLocaleString('vi-VN')} dòng tổng hợp
                  </p>
                )}
                {detail.data.status === 'SUCCEEDED' && (
                  <Button disabled={download.isPending} onClick={() => download.mutate(selected)}>
                    Tải báo cáo CSV
                  </Button>
                )}
              </div>
            )
          )}
          {attempts.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                attempts.error,
                'Chưa lấy được thông tin Gold. Vui lòng thử lại.'
              )}
            />
          ) : (
            attempts.data?.map((item) => (
              <p key={item.attempt_number} className="mt-3 text-sm">
                Lần {item.attempt_number}: {statusNames[item.status]} ·{' '}
                {formatDateTime(item.started_at)} {item.error_code ? `· ${item.error_code}` : ''}
              </p>
            ))
          )}
        </Card>
      )}
      <Card title="Bộ xử lý Gold">
        {workers.isError ? (
          <ErrorState
            message={getApiErrorMessage(
              workers.error,
              'Chưa lấy được thông tin Gold. Vui lòng thử lại.'
            )}
          />
        ) : workers.isPending ? (
          <LoadingState />
        ) : !workers.data?.length ? (
          <EmptyState
            title="Chưa ghi nhận bộ xử lý Gold"
            description="Khởi chạy gold-worker để nhận các lượt đang chờ."
          />
        ) : (
          workers.data.map((item) => (
            <p key={item.worker_id} className="text-sm">
              {item.worker_id} ·{' '}
              <span className={item.healthy ? 'text-green-700' : 'text-red-700'}>
                {item.healthy ? 'Đang hoạt động' : 'Chưa có tín hiệu mới'}
              </span>{' '}
              · {formatDateTime(item.heartbeat_at)}
            </p>
          ))
        )}
      </Card>
    </div>
  )
}
