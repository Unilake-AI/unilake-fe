import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { CleaningView } from './cleaning-view'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('CleaningView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('chạy Preview với publication_checked=false và hiển thị chính xác trạng thái QUARANTINED / BLOCKED khi chạy Cleaning', async () => {
    let previewPayload: unknown = null
    let runPayload: unknown = null

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /ingestion/jobs') {
        return Promise.resolve({
          data: [
            {
              ingestion_job_id: 15,
              data_source_id: 1,
              dataset_id: 5,
              status: 'SUCCESS',
              source_table: 'hr.csv',
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /pipeline/profiles') {
        return Promise.resolve({
          data: [
            {
              profile_id: 'hr_v1',
              revision: 1,
              storage: 'database',
              fingerprint: 'fp',
              definition: { dataset_id: 5, domain: 'hr', entity: 'employee' },
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /cleaning-runs') {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
      }
      if (key === 'post /pipeline/cleaning/ingestion-jobs/15/preview') {
        previewPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: {
            preview: true,
            ingestion_job_id: 15,
            profile_id: 'hr_v1',
            profile_fingerprint: 'fp',
            records_read: 10,
            records_passed_cleaning: 8,
            records_quarantined: 2,
            records_collapsed: 0,
            records_normalized: 8,
            cleaning_issues: [{ code: 'MISSING_ID' }],
            normalization_issues: [],
            cleaned_sample: [{ ma_nv: 'NV01' }],
            normalized_sample: [{ employee_code: 'NV01' }],
            publication_checked: false,
            note: 'Bản xem trước chưa kiểm tra liên kết Silver.',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'post /pipeline/cleaning/ingestion-jobs/15') {
        runPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: {
            run_id: 'run-blocked-1',
            status: 'QUARANTINED',
            ingestion_job_id: 15,
            requested_by: '1',
            domain: 'hr',
            entity: 'employee',
            input_version: 'v1',
            records_read: 10,
            records_passed: 0,
            records_quarantined: 10,
            records_collapsed: 0,
            issues: [],
            publication: { status: 'BLOCKED' },
            quarantine_report: { total: 10 },
          },
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
          <CleaningView />
        </QueryClientProvider>
      )

      await screen.findByRole('option', { name: /#15/ })
      await screen.findByRole('option', { name: /hr_v1/ })
      await user.selectOptions(screen.getByLabelText('1. Chọn Bronze Job (SUCCESS) *'), '15')
      await user.selectOptions(screen.getByLabelText('2. Chọn Silver Profile *'), 'hr_v1')

      // 1. Preview
      await user.click(screen.getByRole('button', { name: 'Xem trước (Preview)' }))
      await waitFor(() => expect(previewPayload).toEqual({ profile_id: 'hr_v1' }))
      expect(await screen.findByText('publication_checked: false')).toBeInTheDocument()
      expect(screen.getAllByText('NV01').length).toBeGreaterThan(0)

      // 2. Execute Cleaning -> QUARANTINED / BLOCKED không được báo thành công
      await user.click(screen.getByRole('button', { name: 'Chạy Cleaning & Xuất bản Silver' }))
      await user.click(await screen.findByRole('button', { name: 'Xác nhận chạy Cleaning' }))
      await waitFor(() =>
        expect(runPayload).toEqual({ profile_id: 'hr_v1', base_snapshot: 'active' })
      )
      expect(
        await screen.findByText(/Dữ liệu chưa được công bố thành phiên bản Silver hoàn chỉnh/)
      ).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
