import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { SilverView } from './silver-view'

import type { InternalAxiosRequestConfig } from 'axios'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('SilverView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('liệt kê snapshot theo profile_id, xem dữ liệu bảng, kích hoạt kèm expected_current_snapshot và xử lý 409', async () => {
    const snap1 = '11111111-1111-1111-1111-111111111111'
    const snap2 = '22222222-2222-2222-2222-222222222222'
    let activatePayload: unknown = null
    let conflictOnActivate = false

    http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /pipeline/profiles') {
        return Promise.resolve({
          data: [
            {
              profile_id: 'hr_v1',
              revision: 1,
              storage: 'database',
              fingerprint: 'fp',
              definition: { scope: 'hr_scope', entity: 'employee' },
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /pipeline/silver/snapshots/active') {
        return Promise.resolve({
          data: { snapshot_id: snap1, scope: 'production:hr_scope', manifest: null },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /pipeline/silver/snapshots') {
        return Promise.resolve({
          data: {
            scope: 'production:hr_scope',
            active_snapshot_id: snap1,
            items: [
              { snapshot_id: snap1, scope: 'production:hr_scope' },
              { snapshot_id: snap2, scope: 'production:hr_scope' },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /pipeline/silver/snapshots/${snap2}`) {
        return Promise.resolve({
          data: { snapshot_id: snap2, tables: { employee: { rows: 2 } } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /pipeline/silver/snapshots/${snap2}/data`) {
        return Promise.resolve({
          data: {
            snapshot_id: snap2,
            entity: 'employee',
            total: 1,
            limit: 20,
            offset: 0,
            items: [{ employee_code: 'NV001', full_name: 'Trần Văn B' }],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `post /pipeline/silver/snapshots/${snap2}/activate`) {
        activatePayload = JSON.parse(String(config.data))
        if (conflictOnActivate) {
          return Promise.reject(
            new AxiosError('conflict', 'ERR_BAD_RESPONSE', config, undefined, {
              status: 409,
              statusText: 'Conflict',
              headers: new AxiosHeaders(),
              config,
              data: { error: { code: 'ACTIVE_SNAPSHOT_CHANGED' } },
            })
          )
        }
        return Promise.resolve({
          data: { snapshot_id: snap2, scope: 'production:hr_scope', previous_snapshot_id: snap1 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <SilverView />
        </QueryClientProvider>
      )

      // 1. Xem dữ liệu bảng trong snapshot 2
      await user.click(await screen.findByRole('button', { name: new RegExp(snap2) }))
      expect(await screen.findByText('Trần Văn B')).toBeInTheDocument()

      // 2. Kích hoạt snapshot 2 -> gửi expected_current_snapshot: snap1
      await user.click(screen.getByRole('button', { name: 'Kích hoạt' }))
      await user.click(await screen.findByRole('button', { name: 'Xác nhận kích hoạt' }))
      await waitFor(() => expect(activatePayload).toEqual({ expected_current_snapshot: snap1 }))

      // 3. Xử lý 409 ACTIVE_SNAPSHOT_CHANGED
      conflictOnActivate = true
      await user.click(screen.getByRole('button', { name: 'Kích hoạt' }))
      await user.click(await screen.findByRole('button', { name: 'Xác nhận kích hoạt' }))
      expect(await screen.findByText(/Phiên bản Silver hiện hành vừa thay đổi/)).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
