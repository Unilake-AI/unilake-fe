import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { DatasetsView } from './datasets-view'

import type { InternalAxiosRequestConfig } from 'axios'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderDatasets() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <DatasetsView />
      </QueryClientProvider>
    ),
  }
}

describe('DatasetsView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('tải hệ thống nguồn từ API, đăng ký bộ dữ liệu mới và xử lý xung đột 409', async () => {
    let createdPayload: unknown = null
    let conflict = false

    http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /source-systems') {
        return Promise.resolve({
          data: [
            {
              source_system_id: 12,
              source_code: 'HR_SYS',
              source_name: 'Human Resources System',
              source_type: 'POSTGRESQL',
              description: null,
              owner_department_id: 1,
              is_active: true,
              created_at: '2026-11-10T00:00:00Z',
            },
          ],
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
              dataset_id: 1,
              dataset_code: 'HR_EMP',
              dataset_name: 'Nhân viên hiện hữu',
              domain: 'hr',
              source_system_id: 12,
              data_layer_id: 1,
              status: 'ACTIVE',
              created_at: '2026-11-10T00:00:00Z',
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'post /datasets') {
        if (conflict) {
          return Promise.reject(
            new AxiosError('conflict', 'ERR_BAD_RESPONSE', config, undefined, {
              status: 409,
              statusText: 'Conflict',
              headers: new AxiosHeaders(),
              config,
              data: { error: { code: 'DATASET_CONFLICT' } },
            })
          )
        }
        createdPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: {
            dataset_id: 2,
            ...(createdPayload as Record<string, unknown>),
            data_layer_id: 1,
            status: 'ACTIVE',
            created_at: '2026-11-10T01:00:00Z',
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderDatasets()
    try {
      const user = userEvent.setup()

      expect(await screen.findByText('Nhân viên hiện hữu')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Đăng ký bộ dữ liệu' }))

      await user.type(screen.getByLabelText('Mã bộ dữ liệu (dataset_code) *'), 'HR_ATTENDANCE')
      await user.type(screen.getByLabelText('Tên bộ dữ liệu *'), 'Bảng chấm công')
      await user.selectOptions(await screen.findByLabelText('Hệ thống nguồn *'), '12')
      await user.type(screen.getByLabelText('Mô tả (tùy chọn)'), 'Dữ liệu chấm công')

      const submitBtn = screen.getAllByRole('button', { name: 'Đăng ký bộ dữ liệu' }).at(-1)
      expect(submitBtn).toBeDefined()
      await user.click(submitBtn!)

      await waitFor(() =>
        expect(createdPayload).toEqual({
          dataset_code: 'HR_ATTENDANCE',
          dataset_name: 'Bảng chấm công',
          domain: 'hr',
          source_system_id: 12,
          description: 'Dữ liệu chấm công',
        })
      )

      // Thử xung đột 409
      conflict = true
      await user.click(screen.getByRole('button', { name: 'Đăng ký bộ dữ liệu' }))
      await user.type(screen.getByLabelText('Mã bộ dữ liệu (dataset_code) *'), 'HR_EMP')
      await user.type(screen.getByLabelText('Tên bộ dữ liệu *'), 'Trùng mã')
      await user.selectOptions(await screen.findByLabelText('Hệ thống nguồn *'), '12')
      const submitBtns = screen.getAllByRole('button', { name: 'Đăng ký bộ dữ liệu' })
      await user.click(submitBtns[submitBtns.length - 1]!)
      expect(await screen.findByText(/Mã bộ dữ liệu đã tồn tại/)).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
