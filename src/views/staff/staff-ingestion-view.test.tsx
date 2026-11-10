import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { StaffIngestionView } from './staff-ingestion-view'

function renderIngestion(initialJobId?: number) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <StaffIngestionView initialJobId={initialJobId} />
      </QueryClientProvider>
    ),
  }
}

describe('StaffIngestionView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('hiển thị trạng thái FAILED, RETRY_WAIT, chuỗi attempts và không hiển thị nút Retry thủ công hay Làm sạch/Silver', async () => {
    const trackedParams: unknown[] = []
    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: {
            user_id: 30,
            username: 'academic_staff',
            roles: ['ACADEMIC_STAFF'],
            domains: [{ domain: 'academic', name: 'Đào tạo' }],
            default_domain: 'academic',
            departments: [
              { department_id: 2, department_code: 'ACAD', department_name: 'Phòng Đào tạo' },
            ],
            can_upload: true,
            can_resolve_issues: true,
            can_manage_silver: false,
            needs_department_assignment: false,
            accepted_extensions: ['.csv', '.xlsx', '.xlsm'],
            max_file_bytes: 52428800,
            max_records: 1000000,
            note: 'Chỉ người được giao mới được báo đã sửa',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/stats') {
        return Promise.resolve({
          data: { total: 5, queued: 0, running: 0, success: 2, failed: 2, retry_wait: 1 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/metrics') {
        return Promise.resolve({
          data: {
            average_wait_seconds: 1.5,
            average_processing_seconds: 3.2,
            failure_rate_percent: 40,
            oldest_queued_seconds: null,
          },
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
              dataset_id: 12,
              dataset_code: 'acad_grades',
              dataset_name: 'Bảng điểm học kỳ',
              domain: 'academic',
              data_layer_id: 1,
              status: 'ACTIVE',
              created_at: '2026-11-10T08:00:00Z',
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs') {
        trackedParams.push(config.params)
        return Promise.resolve({
          data: [
            {
              ingestion_job_id: 101,
              data_source_id: 2,
              dataset_id: 12,
              status: 'FAILED',
              stage: 'VALIDATING',
              job_type: 'UPLOAD_V1',
              source_table: 'grades.csv',
              created_at: '2026-11-10T09:00:00Z',
              started_at: '2026-11-10T09:00:01Z',
              finished_at: '2026-11-10T09:00:02Z',
              requested_by: '30',
              rows_read: 10,
              rows_written: 0,
              rows_rejected: 10,
              error_message: 'UPLOAD_PARSER_INVALID',
              output: null,
            },
            {
              ingestion_job_id: 102,
              data_source_id: 2,
              dataset_id: 12,
              status: 'RETRY_WAIT',
              stage: 'QUEUED',
              job_type: 'UPLOAD_V1',
              source_table: 'grades.csv',
              created_at: '2026-11-10T09:01:00Z',
              started_at: null,
              finished_at: null,
              requested_by: '30',
              rows_read: null,
              rows_written: null,
              rows_rejected: null,
              error_message: null,
              output: null,
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/101') {
        return Promise.resolve({
          data: {
            ingestion_job_id: 101,
            data_source_id: 2,
            dataset_id: 12,
            status: 'FAILED',
            stage: 'VALIDATING',
            job_type: 'UPLOAD_V1',
            source_table: 'grades.csv',
            created_at: '2026-11-10T09:00:00Z',
            started_at: '2026-11-10T09:00:01Z',
            finished_at: '2026-11-10T09:00:02Z',
            requested_by: '30',
            rows_read: 10,
            rows_written: 0,
            rows_rejected: 10,
            error_message: 'UPLOAD_PARSER_INVALID',
            output: null,
            attempt_number: 1,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/101/attempts') {
        return Promise.resolve({
          data: [
            {
              ingestion_job_id: 101,
              root_job_id: 101,
              attempt_number: 1,
              status: 'FAILED',
              stage: 'VALIDATING',
              error_message: 'WORKER_LEASE_EXPIRED',
              created_at: '2026-11-10T09:00:00Z',
              started_at: '2026-11-10T09:00:01Z',
              finished_at: '2026-11-10T09:00:02Z',
            },
            {
              ingestion_job_id: 102,
              root_job_id: 101,
              attempt_number: 2,
              status: 'RETRY_WAIT',
              stage: 'QUEUED',
              error_message: null,
              created_at: '2026-11-10T09:01:00Z',
              started_at: null,
              finished_at: null,
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderIngestion()
    try {
      const user = userEvent.setup()

      const detailBtn = await screen.findByRole('button', { name: 'Chi tiết #101' })
      expect(screen.getByText('Không thành công')).toBeInTheDocument()
      expect(screen.getAllByText('Chờ thử lại').length).toBeGreaterThanOrEqual(2)

      await user.click(detailBtn)
      expect(await screen.findByText('Chuỗi các lần chạy (Attempts)')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
      expect(screen.getByText(/Quá thời gian xử lý của worker/)).toBeInTheDocument()

      // Tuyệt đối không có nút Manual Retry hoặc Cleaning/Silver cho STAFF
      expect(
        screen.queryByRole('button', { name: /Retry|Thử lại thủ công/i })
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Làm sạch|Silver/i })).not.toBeInTheDocument()

      // Kiểm tra bộ lọc mine_only
      await user.click(screen.getByLabelText('Chỉ lần nạp của tôi'))
      expect(trackedParams.at(-1)).toMatchObject({ mine_only: true })
    } finally {
      client.clear()
    }
  })
})
