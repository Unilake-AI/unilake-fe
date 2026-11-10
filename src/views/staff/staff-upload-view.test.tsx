import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { StaffUploadView } from './staff-upload-view'

import type { InternalAxiosRequestConfig } from 'axios'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const singleDomainContext = {
  user_id: 21,
  username: 'hr_staff_1',
  roles: ['HR_STAFF'],
  domains: [{ domain: 'hr', name: 'Nhân sự' }],
  default_domain: 'hr',
  departments: [
    { department_id: 5, department_code: 'HR', department_name: 'Phòng Tổ chức Nhân sự' },
  ],
  can_upload: true,
  can_resolve_issues: true,
  can_manage_silver: false,
  needs_department_assignment: false,
  accepted_extensions: ['.csv', '.xlsx', '.xlsm'],
  max_file_bytes: 52428800,
  max_records: 1000000,
  note: 'Chỉ người được giao mới được báo đã sửa',
}

const multiDomainContext = {
  ...singleDomainContext,
  roles: ['HR_STAFF', 'ACADEMIC_STAFF'],
  domains: [
    { domain: 'academic', name: 'Đào tạo' },
    { domain: 'hr', name: 'Nhân sự' },
  ],
  default_domain: null,
}

function makeError(status: number, code: string, config: InternalAxiosRequestConfig) {
  return new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: 'Error',
    headers: new AxiosHeaders(),
    config,
    data: { error: { code } },
  })
}

function renderUpload() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <StaffUploadView />
      </QueryClientProvider>
    ),
  }
}

describe('StaffUploadView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('tự động chọn lĩnh vực cho STAFF một miền và gửi đúng FormData khi nạp vào dataset đã có', async () => {
    let capturedForm: FormData | null = null
    let jobCalls = 0
    const file = new File(['id,name\n1,Nguyen An'], 'employees.csv', { type: 'text/csv' })

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: singleDomainContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets') {
        return Promise.resolve({
          data: [
            {
              dataset_id: 7,
              dataset_code: 'hr_employees',
              dataset_name: 'Danh sách nhân viên',
              domain: 'hr',
              data_layer_id: 1,
              status: 'ACTIVE',
              created_at: '2026-11-10T09:00:00Z',
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'post /ingestion/uploads') {
        capturedForm = config.data as FormData
        return Promise.resolve({
          data: {
            ingestion_job_id: 88,
            data_source_id: 3,
            dataset_id: 7,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'employees.csv',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '21',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
          },
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/88') {
        jobCalls += 1
        return Promise.resolve({
          data: {
            ingestion_job_id: 88,
            data_source_id: 3,
            dataset_id: 7,
            status: jobCalls === 1 ? 'RUNNING' : 'SUCCESS',
            stage: jobCalls === 1 ? 'WRITING' : 'COMMITTING',
            job_type: 'UPLOAD_V1',
            source_table: 'employees.csv',
            created_at: '2026-11-10T10:00:00Z',
            started_at: '2026-11-10T10:00:01Z',
            finished_at: jobCalls === 1 ? null : '2026-11-10T10:00:03Z',
            requested_by: '21',
            rows_read: 1,
            rows_written: 1,
            rows_rejected: 0,
            error_message: null,
            output: null,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderUpload()
    try {
      const user = userEvent.setup()

      // Chọn dataset theo tên từ danh sách backend trả về
      const datasetRadio = await screen.findByRole('radio', { name: /Danh sách nhân viên/ })
      await user.click(datasetRadio)

      // Chọn file CSV
      const fileInput = screen.getByLabelText(/Tệp dữ liệu/)
      await user.upload(fileInput, file)

      // Tùy chỉnh CSV parser options (không hiển thị trường Excel)
      await user.click(screen.getByLabelText(/Tùy chỉnh cấu hình đọc tệp/))
      expect(screen.getByLabelText(/Dấu phân cách/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Tên sheet/)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Tải lên và nạp dữ liệu' }))

      // Kiểm tra FormData
      await waitFor(() => expect(capturedForm).not.toBeNull())
      expect(capturedForm!.get('file')).toBe(file)
      expect(capturedForm!.get('dataset_id')).toBe('7')
      expect(capturedForm!.get('dataset_name')).toBeNull()
      expect(capturedForm!.get('description')).toBeNull()
      expect(capturedForm!.get('domain')).toBeNull()
      expect(capturedForm!.get('parser_options')).toBe(
        JSON.stringify({ encoding: 'utf-8', delimiter: ',', quote_char: '"', skip_rows: 0 })
      )

      // Kiểm tra UI theo dõi job 202 -> QUEUED -> RUNNING -> SUCCESS
      expect(await screen.findByText(/Theo dõi lần nạp #88/)).toBeInTheDocument()

      // Chờ lần refetch thủ công hoặc query chuyển sang SUCCESS
      await waitFor(
        () => {
          expect(
            screen.getByText('Đã lưu dữ liệu vào Bronze. Đang chờ quản trị dữ liệu xử lý Silver.')
          ).toBeInTheDocument()
        },
        { timeout: 6000 }
      )
      expect(screen.queryByText(/Đã lưu Silver/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Đã hoàn tất làm sạch/)).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  }, 10000)

  it('tạo bộ dữ liệu mới không gửi dataset_id với STAFF 1 miền và xử lý xung đột 409', async () => {
    let capturedForm: FormData | null = null
    let shouldConflict = false
    const file = new File(['dummy'], 'nhan_su.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: singleDomainContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets') {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
      }
      if (key === 'post /ingestion/uploads') {
        capturedForm = config.data as FormData
        if (shouldConflict) {
          return Promise.reject(makeError(409, 'UPLOAD_DATASET_NAME_CONFLICT', config))
        }
        return Promise.resolve({
          data: {
            ingestion_job_id: 91,
            data_source_id: 4,
            dataset_id: 15,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'nhan_su.xlsx',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '21',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
          },
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/91') {
        return Promise.resolve({
          data: {
            ingestion_job_id: 91,
            data_source_id: 4,
            dataset_id: 15,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'nhan_su.xlsx',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '21',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/95') {
        return Promise.resolve({
          data: {
            ingestion_job_id: 95,
            data_source_id: 5,
            dataset_id: 20,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'multi.csv',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '21',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderUpload()
    try {
      const user = userEvent.setup()

      await user.click(await screen.findByRole('tab', { name: 'Tạo bộ dữ liệu mới và nạp' }))

      // Không yêu cầu chọn domain khi chỉ có 1 miền
      expect(screen.queryByLabelText(/Lĩnh vực \*/)).not.toBeInTheDocument()
      expect(screen.getByText('Nhân sự')).toBeInTheDocument()

      await user.type(screen.getByLabelText(/Tên bộ dữ liệu mới/), 'Hồ sơ nhân sự mới')
      await user.type(screen.getByLabelText(/Mô tả bộ dữ liệu/), 'Mô tả đợt 1')
      await user.upload(screen.getByLabelText(/Tệp dữ liệu/), file)

      // Kiểm tra parser Excel chỉ hiển thị trường Excel
      await user.click(screen.getByLabelText(/Tùy chỉnh cấu hình đọc tệp/))
      expect(screen.getByLabelText(/Tên sheet/)).toBeInTheDocument()
      expect(screen.queryByLabelText(/Dấu phân cách/)).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Tải lên và nạp dữ liệu' }))

      await waitFor(() => expect(capturedForm).not.toBeNull())
      expect(capturedForm!.get('dataset_id')).toBeNull()
      expect(capturedForm!.get('dataset_name')).toBe('Hồ sơ nhân sự mới')
      expect(capturedForm!.get('description')).toBe('Mô tả đợt 1')
      expect(capturedForm!.get('domain')).toBeNull()

      // Sau khi tải lên thành công, form được dọn sạch (tệp và tên bộ dữ liệu mới)
      await waitFor(() => {
        expect(screen.getByLabelText(/Tên bộ dữ liệu mới/)).toHaveValue('')
      })
      expect(screen.getByLabelText<HTMLInputElement>(/Tệp dữ liệu/).files?.length ?? 0).toBe(0)

      // Kiểm tra thông báo 409 khi tạo lại tên trùng
      shouldConflict = true
      await user.type(screen.getByLabelText(/Tên bộ dữ liệu mới/), 'Hồ sơ nhân sự mới')
      await user.upload(screen.getByLabelText(/Tệp dữ liệu/), file)
      await user.click(screen.getByRole('button', { name: 'Tải lên và nạp dữ liệu' }))
      expect(
        await screen.findByText(/Tên bộ dữ liệu đã tồn tại trong lĩnh vực này/)
      ).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })

  it('người dùng nhiều lĩnh vực chỉ chọn được các lĩnh vực được cấp phép', async () => {
    let capturedForm: FormData | null = null
    const file = new File(['a,b\n1,2'], 'multi.csv', { type: 'text/csv' })

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: multiDomainContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets') {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
      }
      if (key === 'post /ingestion/uploads') {
        capturedForm = config.data as FormData
        return Promise.resolve({
          data: {
            ingestion_job_id: 95,
            data_source_id: 5,
            dataset_id: 20,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'multi.csv',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '21',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
          },
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/91') {
        return Promise.resolve({
          data: {
            ingestion_job_id: 91,
            data_source_id: 4,
            dataset_id: 15,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'nhan_su.xlsx',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '21',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/95') {
        return Promise.resolve({
          data: {
            ingestion_job_id: 95,
            data_source_id: 5,
            dataset_id: 20,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'multi.csv',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '21',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderUpload()
    try {
      const user = userEvent.setup()
      await user.click(await screen.findByRole('tab', { name: 'Tạo bộ dữ liệu mới và nạp' }))

      const domainSelect = screen.getByLabelText(/Lĩnh vực \*/)
      const options = Array.from((domainSelect as HTMLSelectElement).options).map((o) => o.value)
      expect(options).toEqual(['', 'academic', 'hr'])
      expect(options).not.toContain('admissions')

      await user.type(screen.getByLabelText(/Tên bộ dữ liệu mới/), 'Dữ liệu đào tạo')
      await user.selectOptions(domainSelect, 'academic')
      await user.upload(screen.getByLabelText(/Tệp dữ liệu/), file)
      await user.click(screen.getByRole('button', { name: 'Tải lên và nạp dữ liệu' }))

      await waitFor(() => expect(capturedForm).not.toBeNull())
      expect(capturedForm!.get('domain')).toBe('academic')
      expect(capturedForm!.get('dataset_id')).toBeNull()
    } finally {
      client.clear()
    }
  })
})
