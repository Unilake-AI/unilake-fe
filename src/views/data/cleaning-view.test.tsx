import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'
import type { ManualCleaningResponse } from '@/types/cleaning'

import { CleaningExecutionOutcome, CleaningView } from './cleaning-view'

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
              definition: {
                dataset_id: 5,
                data_source_id: 1,
                source_table: 'hr.csv',
                domain: 'hr',
                entity: 'employee',
                identity_mode: 'source',
                field_mapping: { employee_code: 'ma_nv' },
                ignored_columns: [],
              },
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /pipeline/cleaning/ingestion-jobs/15/setup') {
        return Promise.resolve({
          data: {
            ingestion_job_id: 15,
            dataset_id: 5,
            source_table: 'hr.csv',
            records_read: 10,
            analysis_fingerprint: 'a'.repeat(64),
            columns: [{ name: 'ma_nv', empty_count: 0, leading_zero_count: 0 }],
            entities: [],
            suggested_entity: null,
            reference_sources: [],
            crosswalk_releases: [],
            notes: [],
          },
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
      await user.selectOptions(screen.getByLabelText('1. Chọn Bronze Job (SUCCESS) *'), '15')
      await screen.findByRole('option', { name: /employee · Giữ mã nguồn · Bản 1/ })
      expect(screen.getByLabelText('2. Cách xử lý đã lưu')).toHaveValue('hr_v1')

      // Kiểm tra kết quả xem trước.
      await user.click(screen.getByRole('button', { name: 'Xem trước (Preview)' }))
      await waitFor(() => expect(previewPayload).toEqual({ profile_id: 'hr_v1' }))
      expect(await screen.findByText('publication_checked: false')).toBeInTheDocument()
      expect(screen.getAllByText('NV01').length).toBeGreaterThan(0)

      // Dữ liệu bị cách ly không được hiển thị như đã lưu Silver thành công.
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
  it('hiển thị đúng PUBLISHED dù publication chưa có status và tách 99 ghi nhận hợp lệ khỏi lỗi', () => {
    const result: ManualCleaningResponse = {
      run_id: 'published-1',
      ingestion_job_id: 18,
      requested_by: '1',
      domain: 'hr',
      entity: 'file_4',
      input_version: 'v1',
      status: 'PUBLISHED',
      records_read: 20000,
      records_passed: 20000,
      records_quarantined: 0,
      records_collapsed: 0,
      publication: { snapshot_id: 'snapshot-1', records_published: 20000 },
      issues: Array.from({ length: 99 }, () => ({
        code: 'NULL_VALUE_PRESERVED',
        severity: 'INFO',
        disposition: 'PRESERVED',
        field: 'manager_code',
        locator: 'record:2',
      })),
    }
    render(<CleaningExecutionOutcome result={result} />)
    expect(
      screen.getByText(/Đã làm sạch và xuất bản phiên bản Silver thành công/)
    ).toBeInTheDocument()
    expect(screen.queryByText(/Dữ liệu chưa được công bố/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Vấn đề phát hiện/)).not.toBeInTheDocument()
    expect(screen.getByText(/Lỗi cần kiểm tra: 0/)).toBeInTheDocument()
    expect(screen.getByText('Ghi nhận xử lý hợp lệ (99)')).toBeInTheDocument()
  })

  it('nút tải CSV và JSON tải file thật từ báo cáo cuối cùng của lượt được chọn', async () => {
    const create = vi.fn(() => 'blob:download-report')
    const revoke = vi.fn()
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = create
        static override revokeObjectURL = revoke
      }
    )
    const filenames: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      filenames.push(this.download)
    })
    const row = {
      run_id: 'published-1',
      ingestion_job_id: 18,
      dataset_id: 4,
      domain: 'hr',
      entity: 'file_4',
      cleaning_status: 'COMPLETED',
      publication_status: 'PUBLISHED',
      report_available: true,
      records_read: 20000,
      records_passed: 20000,
      records_quarantined: 0,
      records_collapsed: 0,
      records_published: 20000,
      started_at: '2026-11-15T16:50:00Z',
    }
    http.defaults.adapter = (config) =>
      Promise.resolve({
        data:
          config.url === '/cleaning-runs'
            ? [row]
            : config.url === '/cleaning-runs/published-1'
              ? row
              : config.url === '/cleaning-runs/published-1/report'
                ? { ...row, status: 'PUBLISHED', issues: [] }
                : [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <CleaningView />
        </QueryClientProvider>
      )
      await user.click(await screen.findByRole('button', { name: 'Báo cáo' }))
      await user.click(await screen.findByRole('button', { name: 'Tải CSV (Excel)' }))
      await waitFor(() => expect(filenames).toContain('cleaning-report-published-1.csv'))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Tải JSON' })).toBeEnabled())
      await user.click(screen.getByRole('button', { name: 'Tải JSON' }))
      await waitFor(() => expect(filenames).toContain('cleaning-report-published-1.json'))
      expect(create).toHaveBeenCalledTimes(2)
    } finally {
      client.clear()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    }
  })
})
