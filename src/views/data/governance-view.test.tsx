import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { CatalogView } from './catalog-view'
import { LineageView } from './lineage-view'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('CatalogView CRUD & LineageView API', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('CatalogView hỗ trợ thêm mới, sửa và ẩn mềm có xác nhận', async () => {
    let created: unknown = null
    let updated: unknown = null
    let deleted = false

    const baseEntry = {
      domain_id: 'hr',
      dataset: 'hr_employees',
      layer: 'bronze',
      schema_version: '1.0',
      description: 'Hồ sơ nhân sự',
      fields: [{ name: 'emp_id', data_type: 'string', nullable: false, description: 'Mã NV' }],
      tables: [],
    }

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /governance/catalog') {
        return Promise.resolve({
          data: deleted ? [] : [baseEntry],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /governance/catalog/hr/hr_employees') {
        return Promise.resolve({
          data: baseEntry,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'post /governance/catalog') {
        created = JSON.parse(String(config.data))
        return Promise.resolve({
          data: created,
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        })
      }
      if (key === 'patch /governance/catalog/hr/hr_employees') {
        updated = JSON.parse(String(config.data))
        return Promise.resolve({
          data: { ...baseEntry, ...(updated as Record<string, unknown>) },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'delete /governance/catalog/hr/hr_employees') {
        deleted = true
        return Promise.resolve({
          data: '',
          status: 204,
          statusText: 'No Content',
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
          <CatalogView />
        </QueryClientProvider>
      )

      expect(await screen.findByText('emp_id')).toBeInTheDocument()

      // Thêm mới
      await user.click(screen.getByRole('button', { name: 'Thêm mục Catalog' }))
      await user.type(screen.getByLabelText('Dataset *'), 'hr_payroll')
      await user.type(screen.getByLabelText('Tên cột #1'), 'salary')
      await user.click(screen.getByRole('button', { name: 'Thêm vào Catalog' }))
      await waitFor(() => expect(created).toMatchObject({ domain_id: 'hr', dataset: 'hr_payroll' }))

      // Sửa
      await user.click(screen.getByRole('button', { name: 'Sửa' }))
      const desc = screen.getByLabelText('Mô tả')
      await user.clear(desc)
      await user.type(desc, 'Mô tả mới')
      await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
      await waitFor(() => expect(updated).toMatchObject({ description: 'Mô tả mới' }))

      // Ẩn mềm
      await user.click(screen.getByRole('button', { name: 'Ẩn mục catalog hr_employees' }))
      await user.click(await screen.findByRole('button', { name: 'Xác nhận ẩn' }))
      await waitFor(() => expect(deleted).toBe(true))
    } finally {
      client.clear()
    }
  })

  it('LineageView hiển thị node và cạnh từ API, không tự bịa node GOLD khi backend không trả về', async () => {
    http.defaults.adapter = (config) =>
      Promise.resolve({
        data: {
          nodes: [
            { id: 'src-1', name: 'hr_csv', layer: 'SOURCE', label: 'HR CSV', data: { rows: 100 } },
            { id: 'brz-1', name: 'hr_bronze', layer: 'BRONZE', label: 'HR Bronze', data: {} },
          ],
          edges: [
            {
              id: 'e-1',
              source: 'src-1',
              target: 'brz-1',
              source_layer: 'SOURCE',
              target_layer: 'BRONZE',
              label: 'UPLOAD_V1',
              created_at: '2026-11-10T09:00:00Z',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      render(
        <QueryClientProvider client={client}>
          <LineageView />
        </QueryClientProvider>
      )

      expect(await screen.findByText('HR CSV')).toBeInTheDocument()
      expect(screen.getByText('HR Bronze')).toBeInTheDocument()
      expect(screen.getByText('UPLOAD_V1')).toBeInTheDocument()
      expect(screen.queryByText('admissions_gold')).not.toBeInTheDocument()
      expect(screen.queryByText('GOLD', { selector: 'span' })).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
