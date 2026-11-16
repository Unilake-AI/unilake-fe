import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CleaningSetupAnalysis } from '@/api/admindata/cleaning-setup'
import { http } from '@/api/http'

import { CleaningView } from './cleaning-view'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('Chuẩn bị làm sạch file nhân sự có dòng lỗi', () => {
  const originalAdapter = http.defaults.adapter
  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('chỉ rõ ngày và cột chưa xác nhận, rồi bật chạy sau khi lưu dù còn 14 dòng lỗi', async () => {
    const fields = [
      ['employee_id', 'bigint', true],
      ['hire_date', 'date', false],
      ['birth_year', 'date', false],
    ] as const
    const mapping = {
      employee_id: 'employee_id',
      hire_date: 'hire_date',
      birth_year: 'date_of_birth',
    }
    const sourceColumns = [
      'employee_id',
      'hire_date',
      'date_of_birth',
      'full_name',
      'email',
      'phone',
    ]
    const analysis: CleaningSetupAnalysis = {
      ingestion_job_id: 20,
      dataset_id: 4,
      source_table: 'hr_staff_employees_errors.xlsx',
      records_read: 24,
      analysis_fingerprint: 'a'.repeat(64),
      columns: sourceColumns.map((name) => ({ name, empty_count: 0, leading_zero_count: 0 })),
      suggested_entity: 'employee',
      crosswalk_releases: [],
      reference_sources: [],
      notes: [],
      entities: [
        {
          entity: 'employee',
          label: 'Nhân viên',
          matched_columns: 3,
          total_columns: 3,
          field_mapping: mapping,
          fields: fields.map(([name, kind, identifier]) => ({
            name,
            kind,
            identifier,
            label: name,
            nullable: !identifier,
            suggested_source: mapping[name],
            date_formats: [],
            allowed_values: [],
          })),
        },
      ],
    }
    let saved = false
    let previewBody: Record<string, unknown> | undefined
    let saveBody: Record<string, unknown> | undefined
    const profile = {
      profile_id: 'employee-source',
      revision: 1,
      storage: 'database',
      fingerprint: 'fp',
      definition: {
        dataset_id: 4,
        data_source_id: 5,
        source_table: analysis.source_table,
        identity_mode: 'source',
        domain: 'hr',
        entity: 'employee',
        field_mapping: mapping,
        ignored_columns: ['full_name', 'email', 'phone'],
      },
    }
    http.defaults.adapter = async (config) => {
      await Promise.resolve()
      let data: unknown = []
      if (config.url === '/ingestion/jobs')
        data = [
          {
            ingestion_job_id: 20,
            dataset_id: 4,
            data_source_id: 5,
            source_table: analysis.source_table,
            status: 'SUCCESS',
          },
        ]
      else if (config.url === '/pipeline/profiles') data = saved ? [profile] : []
      else if (config.url?.endsWith('/setup')) data = analysis
      else if (config.url?.endsWith('/setup/preview')) {
        previewBody = JSON.parse(String(config.data))
        data = {
          records_read: 24,
          records_passed_cleaning: 9,
          records_normalized: 9,
          records_quarantined: 14,
          records_collapsed: 1,
          cleaning_issues: [{ code: 'DATE_FORMAT_INVALID' }],
          normalization_issues: [],
          cleaned_sample: [],
          normalized_sample: [],
          blocking_reasons: [],
          confirmation_token: 'reviewed-configuration',
          publication_checked: false,
          note: 'Chưa ghi dữ liệu vào Silver.',
        }
      } else if (config.url?.endsWith('/setup/confirm')) {
        saved = true
        saveBody = JSON.parse(String(config.data))
        data = profile
      }
      return { data, status: 200, statusText: 'OK', headers: {}, config }
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
      const jobs = screen.getByLabelText(/Chọn Bronze Job/)
      await waitFor(() => expect(screen.getByRole('option', { name: /#20/ })).toBeInTheDocument())
      await user.selectOptions(jobs, '20')
      expect(await screen.findByText('Chọn cách đọc ngày cho hire_date.')).toBeInTheDocument()
      expect(
        screen.getByText('Chọn cách đọc ngày cho date_of_birth → birth_year.')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Ghép vào cột cần lưu hoặc xác nhận bỏ qua: full_name, email, phone.')
      ).toBeInTheDocument()
      const run = screen.getByRole('button', { name: 'Chạy Cleaning & Xuất bản Silver' })
      const preview = screen.getByRole('button', { name: 'Xem trước cách xử lý' })
      expect(run).toBeDisabled()
      expect(preview).toBeDisabled()
      await user.selectOptions(screen.getByLabelText('Cách đọc ngày cho hire_date'), 'YMD')
      await user.selectOptions(screen.getByLabelText('Cách đọc ngày cho birth_year'), 'YMD')
      for (const name of ['full_name', 'email', 'phone'])
        await user.click(screen.getByRole('checkbox', { name: `Bỏ qua cột ${name}` }))
      await user.click(screen.getByRole('checkbox', { name: /Bỏ khoảng trắng/ }))
      await user.click(screen.getByRole('checkbox', { name: /Gộp những dòng trùng/ }))
      expect(preview).toBeEnabled()
      expect(screen.queryByText('Cần hoàn tất trước khi xem trước:')).not.toBeInTheDocument()
      await user.click(preview)
      const confirm = screen.getByRole('button', { name: 'Xác nhận và lưu cách xử lý' })
      await waitFor(() => expect(confirm).toBeEnabled())
      expect(previewBody).toEqual(
        expect.objectContaining({
          identity_mode: 'source',
          date_formats: { hire_date: 'YMD', birth_year: 'YMD' },
          ignored_columns: ['full_name', 'email', 'phone'],
          trim_text: true,
          collapse_exact_duplicates: true,
        })
      )
      expect(run).toBeDisabled()
      await user.click(confirm)
      await waitFor(() => expect(run).toBeEnabled())
      expect(saveBody).toEqual(
        expect.objectContaining({ confirmation_token: 'reviewed-configuration' })
      )
    } finally {
      client.clear()
    }
  })
})
