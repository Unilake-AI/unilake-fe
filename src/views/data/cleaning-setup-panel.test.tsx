import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CleaningSetupAnalysis } from '@/api/admindata/cleaning-setup'
import { http } from '@/api/http'

import { CleaningSetupPanel } from './cleaning-setup-panel'

const analysis: CleaningSetupAnalysis = {
  ingestion_job_id: 42,
  dataset_id: 31,
  source_table: 'people.csv',
  records_read: 1,
  analysis_fingerprint: 'a'.repeat(64),
  columns: [{ name: 'raw_id', empty_count: 0, leading_zero_count: 1 }],
  entities: [
    {
      entity: 'position',
      label: 'Chức vụ',
      matched_columns: 1,
      total_columns: 1,
      field_mapping: { position_id: 'raw_id' },
      fields: [
        {
          name: 'position_id',
          label: 'Mã chức vụ',
          kind: 'bigint',
          nullable: false,
          identifier: true,
          suggested_source: 'raw_id',
          date_formats: [],
          allowed_values: [],
        },
      ],
    },
  ],
  suggested_entity: 'position',
  reference_sources: [],
  crosswalk_releases: ['verified-v1'],
  notes: [],
}

describe('Thiết lập cách xử lý', () => {
  const originalAdapter = http.defaults.adapter
  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('cần xem trước lại sau khi đổi lựa chọn rồi mới xác nhận, không yêu cầu nhập mã cấu hình', async () => {
    const onSaved = vi.fn()
    let savedBody: Record<string, unknown> | undefined
    http.defaults.adapter = async (config) => {
      await Promise.resolve()
      if (config.url?.endsWith('/confirm')) {
        savedBody = JSON.parse(String(config.data))
        return {
          data: { profile_id: 'generated-by-server' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      }
      return {
        data: {
          records_read: 1,
          records_passed_cleaning: 1,
          records_quarantined: 0,
          records_collapsed: 0,
          records_normalized: 1,
          cleaning_issues: [],
          normalization_issues: [],
          cleaned_sample: [{ raw_id: '007' }],
          normalized_sample: [{ position_id: 1 }],
          confirmation_token: 'verified-preview',
          blocking_reasons: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <CleaningSetupPanel analysis={analysis} onSaved={onSaved} />
        </QueryClientProvider>
      )
      const save = screen.getByRole('button', { name: 'Xác nhận và lưu cách xử lý' })
      expect(save).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Xem trước cách xử lý' }))
      expect(await screen.findByText('007')).toBeInTheDocument()
      expect(save).toBeEnabled()
      await user.click(screen.getByRole('checkbox', { name: /Bỏ khoảng trắng/ }))
      expect(save).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Xem trước cách xử lý' }))
      await waitFor(() => expect(save).toBeEnabled())
      await user.click(save)
      await waitFor(() => expect(onSaved).toHaveBeenCalled())
      expect(savedBody).toEqual({
        choices: expect.objectContaining({
          entity: 'position',
          field_mapping: { position_id: 'raw_id' },
          trim_text: true,
        }),
        confirmation_token: 'verified-preview',
      })
    } finally {
      client.clear()
    }
  })

  it('chỉ yêu cầu đối chiếu khi người dùng chọn hợp nhất mã nâng cao', async () => {
    http.defaults.adapter = (config) =>
      Promise.resolve({
        data: {
          records_read: 1,
          records_passed_cleaning: 1,
          records_quarantined: 0,
          records_collapsed: 0,
          records_normalized: 0,
          normalization_issues: [],
          cleaned_sample: [{ raw_id: '007' }],
          normalized_sample: [],
          confirmation_token: null,
          blocking_reasons: ['Cần đối chiếu mã trước khi lưu Silver.'],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    const client = new QueryClient()
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <CleaningSetupPanel
            analysis={{ ...analysis, reference_sources: [], crosswalk_releases: [] }}
            onSaved={vi.fn()}
          />
        </QueryClientProvider>
      )
      expect(screen.queryByText(/Chưa có bản đối chiếu mã/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Bản đối chiếu mã đã lưu')).not.toBeInTheDocument()
      await user.selectOptions(screen.getByLabelText('Cách xử lý mã'), 'canonical')
      expect(screen.getByText(/Chưa có bản đối chiếu mã/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Xem trước cách xử lý' }))
      expect(await screen.findByText('007')).toBeInTheDocument()
      expect(screen.getByText('Cần đối chiếu mã trước khi lưu Silver.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Xác nhận và lưu cách xử lý' })).toBeDisabled()
    } finally {
      client.clear()
    }
  })
  it('file chưa có mẫu vẫn chọn được kiểu ngày và xác nhận mà không có đối chiếu mã', async () => {
    let previewBody: Record<string, unknown> | undefined
    const generic: CleaningSetupAnalysis = {
      ...analysis,
      suggested_entity: 'file_31',
      crosswalk_releases: [],
      columns: [
        { name: 'tracking_code', empty_count: 0, leading_zero_count: 1 },
        { name: 'day', empty_count: 0, leading_zero_count: 0 },
      ],
      entities: [
        {
          entity: 'file_31',
          label: 'Theo cấu trúc file',
          custom: true,
          matched_columns: 2,
          total_columns: 2,
          field_mapping: { tracking_code: 'tracking_code', day: 'day' },
          fields: [
            {
              name: 'tracking_code',
              label: 'tracking_code',
              kind: 'string',
              nullable: true,
              identifier: true,
              suggested_source: 'tracking_code',
              date_formats: [],
              allowed_values: [],
            },
            {
              name: 'day',
              label: 'day',
              kind: 'string',
              nullable: true,
              identifier: false,
              suggested_source: 'day',
              date_formats: ['DMY', 'MDY'],
              allowed_values: [],
            },
          ],
        },
      ],
    }
    http.defaults.adapter = async (config) => {
      await Promise.resolve()
      previewBody = JSON.parse(String(config.data))
      return {
        data: {
          records_read: 1,
          records_passed_cleaning: 1,
          records_quarantined: 0,
          records_collapsed: 0,
          records_normalized: 1,
          cleaned_sample: [{ tracking_code: '007', day: '2026-02-01' }],
          normalized_sample: [{ tracking_code: '007', day: '2026-02-01' }],
          normalization_issues: [],
          confirmation_token: 'source-preview',
          blocking_reasons: [],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
    const client = new QueryClient()
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <CleaningSetupPanel analysis={generic} onSaved={vi.fn()} />
        </QueryClientProvider>
      )
      expect(screen.getByLabelText('Cách xử lý mã')).toHaveValue('source')
      expect(screen.queryByLabelText('Bản đối chiếu mã đã lưu')).not.toBeInTheDocument()
      await user.selectOptions(screen.getByLabelText('Kiểu lưu cho day'), 'date')
      expect(screen.getByRole('button', { name: 'Xem trước cách xử lý' })).toBeDisabled()
      await user.selectOptions(screen.getByLabelText('Cách đọc ngày cho day'), 'DMY')
      await user.click(screen.getByRole('button', { name: 'Xem trước cách xử lý' }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Xác nhận và lưu cách xử lý' })).toBeEnabled()
      )
      expect(previewBody).toEqual(
        expect.objectContaining({
          identity_mode: 'source',
          crosswalk_release: null,
          field_types: { tracking_code: 'string', day: 'date' },
          identifier_fields: ['tracking_code'],
          date_formats: { day: 'DMY' },
          primary_key: [],
        })
      )
    } finally {
      client.clear()
    }
  })
})
