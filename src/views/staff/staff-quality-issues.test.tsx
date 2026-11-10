import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { StaffQualityIssueDetailView } from './staff-quality-issue-detail-view'
import { StaffQualityIssuesView } from './staff-quality-issues-view'

import type { InternalAxiosRequestConfig } from 'axios'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const staffContext = {
  user_id: 50,
  username: 'admissions_staff',
  roles: ['ADMISSIONS_STAFF'],
  domains: [{ domain: 'admissions', name: 'Tuyển sinh' }],
  default_domain: 'admissions',
  departments: [{ department_id: 9, department_code: 'ADM', department_name: 'Phòng Tuyển sinh' }],
  can_upload: true,
  can_resolve_issues: true,
  can_manage_silver: false,
  needs_department_assignment: false,
  accepted_extensions: ['.csv', '.xlsx', '.xlsm'],
  max_file_bytes: 52428800,
  max_records: 1000000,
  note: 'Chỉ người được giao mới được báo đã sửa',
}

const baseIssue = {
  issue_id: '11111111-1111-1111-1111-111111111111',
  dataset_id: 31,
  department_id: 9,
  domain: 'admissions',
  title: 'Thiếu số CCCD thí sinh',
  description: 'Một số hồ sơ bị trống hoặc sai định dạng CCCD.',
  status: 'ASSIGNED' as const,
  created_by: 1,
  assignee_user_id: 50,
  resolution_job_id: null as number | null,
  verification_run_id: null as string | null,
  created_at: '2026-11-10T08:00:00Z',
  updated_at: '2026-11-10T09:00:00Z',
  quarantine_record_ids: ['22222222-2222-2222-2222-222222222222'],
  quarantine_records: [
    {
      record_id: '22222222-2222-2222-2222-222222222222',
      cleaning_run_id: '33333333-3333-3333-3333-333333333333',
      ingestion_job_id: 70,
      locator: 'row-14',
      record_position: 14,
      bronze_version: 'v1',
      error_codes: ['INVALID_NATIONAL_ID'],
      issues: [{ field: 'national_id', message: 'CCCD phải đủ 12 chữ số' }],
      entity: 'applicant',
      source_table: 'applicants_2026.csv',
    },
  ],
  history: [
    {
      event_id: 1,
      actor_id: 1,
      event_type: 'ASSIGNED',
      from_status: null,
      to_status: 'ASSIGNED' as const,
      details: { department_id: 9, assignee_user_id: 50 },
      created_at: '2026-11-10T08:00:00Z',
    },
  ],
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

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  }
}

describe('STAFF Quality Issues workflow', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('hiển thị danh sách và thống kê yêu cầu với nhãn tiếng Việt chuẩn', async () => {
    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: staffContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /data-quality-issues/stats') {
        return Promise.resolve({
          data: { total: 3, assigned: 1, pending_verification: 1, verified: 1 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /data-quality-issues') {
        return Promise.resolve({
          data: [baseIssue],
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
              dataset_id: 31,
              dataset_code: 'adm_2026',
              dataset_name: 'Hồ sơ tuyển sinh 2026',
              domain: 'admissions',
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
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderWithClient(<StaffQualityIssuesView />)
    try {
      expect(await screen.findByText('Thiếu số CCCD thí sinh')).toBeInTheDocument()
      expect(screen.getByText('Hồ sơ tuyển sinh 2026')).toBeInTheDocument()
      expect(screen.getByText('Phòng Tuyển sinh')).toBeInTheDocument()
      expect(screen.getByText('Tôi (#50)')).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })

  it('người phụ trách hợp lệ tải tệp sửa -> 202 -> SUCCESS -> tự động nộp ingestion_job_id kèm xác nhận', async () => {
    let currentIssue = { ...baseIssue }
    let submittedPayload: unknown = null
    let uploadForm: FormData | null = null
    const file = new File(['id,national_id\n1,012345678901'], 'applicants_2026.csv', {
      type: 'text/csv',
    })

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: staffContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /data-quality-issues/${baseIssue.issue_id}`) {
        return Promise.resolve({
          data: currentIssue,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets/31') {
        return Promise.resolve({
          data: {
            dataset_id: 31,
            dataset_code: 'adm_2026',
            dataset_name: 'Hồ sơ tuyển sinh 2026',
            domain: 'admissions',
            data_layer_id: 1,
            status: 'ACTIVE',
            created_at: '2026-11-10T08:00:00Z',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `post /data-quality-issues/${baseIssue.issue_id}/uploads`) {
        uploadForm = config.data as FormData
        return Promise.resolve({
          data: {
            ingestion_job_id: 125,
            data_source_id: 4,
            dataset_id: 31,
            status: 'QUEUED',
            stage: 'QUEUED',
            job_type: 'UPLOAD_V1',
            source_table: 'applicants_2026.csv',
            created_at: '2026-11-10T10:00:00Z',
            started_at: null,
            finished_at: null,
            requested_by: '50',
            rows_read: null,
            rows_written: null,
            rows_rejected: null,
            error_message: null,
            output: null,
            quality_issue_id: baseIssue.issue_id,
          },
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/125') {
        return Promise.resolve({
          data: {
            ingestion_job_id: 125,
            data_source_id: 4,
            dataset_id: 31,
            status: 'SUCCESS',
            stage: 'COMMITTING',
            job_type: 'UPLOAD_V1',
            source_table: 'applicants_2026.csv',
            created_at: '2026-11-10T10:00:00Z',
            started_at: '2026-11-10T10:00:01Z',
            finished_at: '2026-11-10T10:00:02Z',
            requested_by: '50',
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
      if (key === `post /data-quality-issues/${baseIssue.issue_id}/resolution`) {
        submittedPayload = JSON.parse(String(config.data))
        currentIssue = {
          ...currentIssue,
          status: 'PENDING_VERIFICATION' as unknown as typeof currentIssue.status,
          resolution_job_id: 125,
        }
        return Promise.resolve({
          data: currentIssue,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderWithClient(
      <StaffQualityIssueDetailView issueId={baseIssue.issue_id} />
    )
    try {
      const user = userEvent.setup()

      expect(await screen.findByText('Bước 1. Tải lên tệp đã sửa')).toBeInTheDocument()
      expect(screen.getAllByText('applicants_2026.csv').length).toBeGreaterThan(0)

      // Nút gửi báo cáo bị vô hiệu hóa khi chưa có job SUCCESS
      expect(screen.getByRole('button', { name: 'Gửi báo cáo đã sửa' })).toBeDisabled()

      // Tải file sửa (không ghi đè parser_options)
      await user.upload(screen.getByLabelText(/Chọn tệp đã sửa/), file)
      await user.click(screen.getByRole('button', { name: 'Tải lên tệp đã sửa' }))

      await waitFor(() => expect(uploadForm).not.toBeNull())
      expect(uploadForm!.get('file')).toBe(file)
      expect(uploadForm!.get('parser_options')).toBeNull()
      expect(uploadForm!.get('dataset_id')).toBeNull()

      // Đợi job 125 chuyển sang SUCCESS
      await waitFor(
        () => {
          expect(screen.getByText(/Job #125 \(Đã lưu Bronze thành công\)/)).toBeInTheDocument()
        },
        { timeout: 6000 }
      )

      // Nhập ghi chú, bấm gửi, xác nhận trong Dialog
      await user.type(
        screen.getByLabelText(/Ghi chú nội dung đã khắc phục/),
        'Đã cập nhật và tải lại dữ liệu cần sửa.'
      )
      await user.click(screen.getByRole('button', { name: 'Gửi báo cáo đã sửa' }))
      await user.click(await screen.findByRole('button', { name: 'Xác nhận nộp' }))

      await waitFor(() =>
        expect(submittedPayload).toEqual({
          ingestion_job_id: 125,
          note: 'Đã cập nhật và tải lại dữ liệu cần sửa.',
        })
      )

      expect(await screen.findByText('Đang chờ quản trị dữ liệu xác minh')).toBeInTheDocument()
      expect(screen.queryByText('Bước 1. Tải lên tệp đã sửa')).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  }, 10000)

  it('không cho phép người không phải phụ trách sử dụng form tải tệp sửa hoặc nộp báo cáo', async () => {
    const otherAssigneeIssue = { ...baseIssue, assignee_user_id: 99 }

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: staffContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /data-quality-issues/${baseIssue.issue_id}`) {
        return Promise.resolve({
          data: otherAssigneeIssue,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets/31') {
        return Promise.resolve({
          data: {
            dataset_id: 31,
            dataset_code: 'adm_2026',
            dataset_name: 'Hồ sơ tuyển sinh 2026',
            domain: 'admissions',
            data_layer_id: 1,
            status: 'ACTIVE',
            created_at: '2026-11-10T08:00:00Z',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderWithClient(
      <StaffQualityIssueDetailView issueId={baseIssue.issue_id} />
    )
    try {
      expect(await screen.findByText('Chế độ chỉ xem')).toBeInTheDocument()
      expect(screen.queryByText('Bước 1. Tải lên tệp đã sửa')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Gửi báo cáo đã sửa' })).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  })

  it('khi bị từ chối xác minh sẽ yêu cầu tải bản mới và xử lý RESOLUTION_PARSER_REQUIRED', async () => {
    const rejectedIssue = {
      ...baseIssue,
      status: 'ASSIGNED' as const,
      resolution_job_id: 120,
      history: [
        ...baseIssue.history,
        {
          event_id: 2,
          actor_id: 2,
          event_type: 'VERIFICATION_REJECTED',
          from_status: 'PENDING_VERIFICATION' as const,
          to_status: 'ASSIGNED' as const,
          details: { note: 'Vẫn còn dòng thiếu CCCD' },
          created_at: '2026-11-10T11:00:00Z',
        },
      ],
    }

    const file = new File(['id,national_id\n1,012345678901'], 'applicants_2026.csv', {
      type: 'text/csv',
    })

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: staffContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /data-quality-issues/${baseIssue.issue_id}`) {
        return Promise.resolve({
          data: rejectedIssue,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets/31') {
        return Promise.resolve({
          data: {
            dataset_id: 31,
            dataset_code: 'adm_2026',
            dataset_name: 'Hồ sơ tuyển sinh 2026',
            domain: 'admissions',
            data_layer_id: 1,
            status: 'ACTIVE',
            created_at: '2026-11-10T08:00:00Z',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `post /data-quality-issues/${baseIssue.issue_id}/uploads`) {
        return Promise.reject(makeError(422, 'RESOLUTION_PARSER_REQUIRED', config))
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderWithClient(
      <StaffQualityIssueDetailView issueId={baseIssue.issue_id} />
    )
    try {
      const user = userEvent.setup()

      // Hiển thị thông báo từ chối và KHÔNG cho dùng lại job #120
      expect(
        await screen.findByText('Lần nộp trước đã bị từ chối xác minh — cần tải lên bản sửa mới')
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Gửi báo cáo đã sửa' })).toBeDisabled()

      // Khi backend trả RESOLUTION_PARSER_REQUIRED thì tự mở phần parser options và hiện lỗi tiếng Việt
      await user.upload(screen.getByLabelText(/Chọn tệp đã sửa/), file)
      await user.click(screen.getByRole('button', { name: 'Tải lên tệp đã sửa' }))

      expect(await screen.findByText(/Bản nguồn chưa lưu cấu hình đọc tệp/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Bảng mã \(Encoding\)/)).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
