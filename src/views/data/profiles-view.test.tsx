import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { ProfilesView } from './profiles-view'

import type { InternalAxiosRequestConfig } from 'axios'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const sampleProfile = {
  profile_id: 'hr_emp_v1',
  revision: 3,
  storage: 'database',
  fingerprint: 'abc123',
  definition: {
    data_source_id: 1,
    dataset_id: 2,
    source_system_id: 3,
    source_type: 'CSV',
    source_table: 'employees.csv',
    domain: 'hr',
    entity: 'employee',
    version: '1.0',
    scope: 'hr_v1',
    source_schema_version: '1.0',
    source_schema: {},
    contracts: {},
    field_mapping: { ma_nv: 'employee_code' },
    ignored_columns: [],
    format_options: {},
    type_options: {},
    null_tokens: {},
    dictionaries: {},
    reference_namespaces: {},
    crosswalk_release: 'v1',
    effective_at: '2026-11-10T00:00:00Z',
    collapse_exact_duplicates: false,
    source_preview_columns: ['ma_nv'],
  },
}

describe('ProfilesView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('tạo profile mới và xử lý xung đột expected_revision 409 khi cập nhật', async () => {
    let createdPayload: unknown = null
    let updatedPayload: unknown = null
    let conflictOnPut = true

    http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /pipeline/profiles') {
        return Promise.resolve({
          data: [sampleProfile],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /pipeline/profiles/hr_emp_v1') {
        return Promise.resolve({
          data: { ...sampleProfile, revision: conflictOnPut ? 3 : 4 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasources') {
        return Promise.resolve({
          data: {
            items: [{ data_source_id: 1, source_name: 'HR CSV' }],
            total: 1,
            page: 1,
            page_size: 100,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets') {
        return Promise.resolve({
          data: [{ dataset_id: 2, dataset_name: 'Nhân sự thô' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /source-systems') {
        return Promise.resolve({
          data: [{ source_system_id: 3, source_name: 'HR System' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'post /pipeline/profiles') {
        createdPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: {
            ...(createdPayload as Record<string, unknown>),
            revision: 1,
            storage: 'database',
            fingerprint: 'new',
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        })
      }
      if (key === 'get /pipeline/profiles/acad_v1') {
        return Promise.resolve({
          data: {
            ...(createdPayload as Record<string, unknown>),
            revision: 1,
            storage: 'database',
            fingerprint: 'new',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'put /pipeline/profiles/hr_emp_v1') {
        updatedPayload = JSON.parse(String(config.data))
        if (conflictOnPut) {
          return Promise.reject(
            new AxiosError('conflict', 'ERR_BAD_RESPONSE', config, undefined, {
              status: 409,
              statusText: 'Conflict',
              headers: new AxiosHeaders(),
              config,
              data: { error: { code: 'SILVER_PROFILE_REVISION_CONFLICT' } },
            })
          )
        }
        return Promise.resolve({
          data: { ...sampleProfile, revision: 5 },
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
          <ProfilesView />
        </QueryClientProvider>
      )

      // 1. Tạo profile mới
      await user.click(await screen.findByRole('button', { name: 'Tạo profile mới' }))
      await user.type(screen.getByLabelText('Profile ID *'), 'acad_v1')
      await user.selectOptions(
        await screen.findByLabelText('Nguồn dữ liệu (data_source_id) *'),
        '1'
      )
      await user.selectOptions(screen.getByLabelText('Bộ dữ liệu (dataset_id) *'), '2')
      await user.selectOptions(screen.getByLabelText('Hệ thống nguồn *'), '3')
      await user.type(
        screen.getByLabelText('Tên tệp / bảng nguồn (source_table) *'),
        'students.csv'
      )
      await user.type(screen.getByLabelText('Thực thể (entity) *'), 'student')
      await user.type(screen.getByLabelText('Phạm vi snapshot (scope) *'), 'acad_scope')
      await user.type(screen.getByLabelText('Cột nguồn #1'), 'ma_sv')
      await user.type(screen.getByLabelText('Cột đích #1'), 'student_code')
      await user.click(screen.getByRole('button', { name: 'Tạo profile' }))
      await waitFor(() => expect(createdPayload).toMatchObject({ profile_id: 'acad_v1' }))

      // 2. Chọn profile cũ, chỉnh sửa -> gặp 409 với expected_revision: 3 -> bấm Tải lại bản mới nhất
      await user.click(await screen.findByRole('button', { name: /hr_emp_v1/ }))
      await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa' }))
      await user.click(screen.getByRole('button', { name: 'Lưu cập nhật' }))

      await waitFor(() => expect(updatedPayload).toMatchObject({ expected_revision: 3 }))
      expect(
        await screen.findByText(/Cấu hình Silver đã được thay đổi bởi thao tác khác/)
      ).toBeInTheDocument()
      conflictOnPut = false
      await user.click(screen.getByRole('button', { name: 'Tải lại bản mới nhất' }))
      expect(await screen.findByText(/rev 4/)).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
