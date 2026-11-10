import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { QualityView } from './quality-view'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const rec1 = {
  record_id: 'rec-1111',
  cleaning_run_id: 'run-1',
  ingestion_job_id: 20,
  dataset_id: 4,
  domain: 'hr',
  entity: 'employee',
  owner_department_id: 7,
  locator: 'row-3',
  record_position: 3,
  bronze_version: 'v1',
  error_codes: ['EMPTY_NAME'],
}

const rec2DifferentDataset = {
  ...rec1,
  record_id: 'rec-2222',
  dataset_id: 99,
  record_position: 5,
}

describe('DATA_ADMIN QualityView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('tạo yêu cầu từ hồ sơ tương thích, chặn hồ sơ lệch dataset, giao lại và xác minh bản sửa', async () => {
    let createdPayload: unknown = null
    let assignPayload: unknown = null
    let verifyPayload: unknown = null

    const issuePending = {
      issue_id: 'issue-pending-1',
      dataset_id: 4,
      department_id: 7,
      domain: 'hr',
      title: 'Thiếu họ tên nhân viên',
      description: 'Cần bổ sung họ tên',
      status: 'PENDING_VERIFICATION',
      created_by: 1,
      assignee_user_id: 12,
      resolution_job_id: 88,
      verification_run_id: null,
      created_at: '2026-11-10T08:00:00Z',
      updated_at: '2026-11-10T09:00:00Z',
      quarantine_record_ids: ['rec-1111'],
      quarantine_records: [{ ...rec1, issues: [], source_table: 'hr.csv' }],
      history: [],
    }

    const issueAssigned = {
      ...issuePending,
      issue_id: 'issue-assigned-2',
      title: 'Sai mã nhân viên',
      status: 'ASSIGNED',
      resolution_job_id: null,
    }

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /data-quality-issues/departments') {
        return Promise.resolve({
          data: [{ department_id: 7, department_code: 'HR', department_name: 'Phòng Nhân sự' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /data-quality-issues/assignees') {
        return Promise.resolve({
          data: [{ user_id: 12, username: 'hr_staff', full_name: 'Nguyễn Văn Nhân Sự' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /data-quality-issues/stats') {
        return Promise.resolve({
          data: { total: 2, assigned: 1, pending_verification: 1, verified: 0 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /data-quality-issues') {
        return Promise.resolve({
          data: [issuePending, issueAssigned],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /data-quality-issues/${issuePending.issue_id}`) {
        return Promise.resolve({
          data: issuePending,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /data-quality-issues/${issueAssigned.issue_id}`) {
        return Promise.resolve({
          data: issueAssigned,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /quarantine-records') {
        return Promise.resolve({
          data: [rec1, rec2DifferentDataset],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'post /data-quality-issues') {
        createdPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: issueAssigned,
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        })
      }
      if (key === `patch /data-quality-issues/${issueAssigned.issue_id}/assignment`) {
        assignPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: issueAssigned,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /ingestion/jobs/88') {
        return Promise.resolve({
          data: { ingestion_job_id: 88, status: 'SUCCESS', source_table: 'hr.csv' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /cleaning-runs') {
        return Promise.resolve({
          data: [
            {
              run_id: 'clean-run-88',
              ingestion_job_id: 88,
              dataset_id: 4,
              domain: 'hr',
              entity: 'employee',
              cleaning_status: 'COMPLETED',
              publication_status: 'PUBLISHED',
              records_passed: 10,
              records_quarantined: 0,
              records_published: 10,
              report_available: false,
              started_at: '2026-11-10T09:05:00Z',
              finished_at: '2026-11-10T09:06:00Z',
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `post /data-quality-issues/${issuePending.issue_id}/verification`) {
        verifyPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: { ...issuePending, status: 'VERIFIED' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
    }

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <QualityView />
        </QueryClientProvider>
      )

      // 1. Tạo yêu cầu xử lý & kiểm tra chặn chọn hồ sơ lệch dataset
      await user.click(await screen.findByRole('button', { name: 'Tạo yêu cầu xử lý' }))
      await user.click(await screen.findByLabelText(/Dòng 3/))
      await user.click(screen.getByLabelText(/Dòng 5/))
      expect(
        screen.getByText(/Các hồ sơ đã chọn không cùng bộ dữ liệu, lĩnh vực hoặc entity/)
      ).toBeInTheDocument()

      await user.click(screen.getByLabelText(/Dòng 5/)) // bỏ chọn hồ sơ lệch
      await user.selectOptions(screen.getByLabelText('2. Phòng ban phụ trách *'), '7')
      await user.selectOptions(await screen.findByLabelText('3. Người phụ trách (tùy chọn)'), '12')
      await user.type(screen.getByLabelText('Tiêu đề yêu cầu *'), 'Bổ sung tên')
      await user.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }))

      await waitFor(() =>
        expect(createdPayload).toEqual({
          title: 'Bổ sung tên',
          description: '',
          department_id: 7,
          assignee_user_id: 12,
          quarantine_record_ids: ['rec-1111'],
        })
      )

      // 2. Phân công lại trên issue ASSIGNED
      await user.click(await screen.findByRole('button', { name: 'Sai mã nhân viên' }))
      await user.selectOptions(await screen.findByLabelText('Chọn người phụ trách'), '12')
      await user.click(screen.getByRole('button', { name: 'Cập nhật phụ trách' }))
      await waitFor(() => expect(assignPayload).toEqual({ assignee_user_id: 12 }))

      // 3. Xác minh trên issue PENDING_VERIFICATION
      await user.click(screen.getByRole('button', { name: 'Thiếu họ tên nhân viên' }))
      await user.selectOptions(
        await screen.findByLabelText('Chọn Cleaning Run của Job sửa *'),
        'clean-run-88'
      )
      await user.click(screen.getByRole('button', { name: 'Chọn tất cả' }))
      await user.type(screen.getByLabelText('Ghi chú xác minh *'), 'Đạt chuẩn Silver')
      await user.click(screen.getByRole('button', { name: 'Xác nhận VERIFIED' }))
      await user.click(await screen.findByRole('button', { name: 'Xác nhận' }))

      await waitFor(() =>
        expect(verifyPayload).toEqual({
          cleaning_run_id: 'clean-run-88',
          verified: true,
          note: 'Đạt chuẩn Silver',
          confirmed_record_ids: ['rec-1111'],
        })
      )
    } finally {
      client.clear()
    }
  })
})
