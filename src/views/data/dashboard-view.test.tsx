import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { DataDashboardView } from './dashboard-view'

import type { InternalAxiosRequestConfig } from 'axios'

// Vite trả URL chuỗi; mô phỏng metadata ảnh tĩnh mà Next cung cấp khi build.
vi.mock('@/assets/login/duy-tan-campus-source.png', () => ({
  default: { src: '/campus-test.png', width: 1600, height: 900 },
}))

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <DataDashboardView />
      </QueryClientProvider>
    ),
  }
}

describe('DataDashboardView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('hiển thị đầy đủ thống kê từ API thực tế và không bịa phần trăm chất lượng tổng', async () => {
    const calls: string[] = []
    http.defaults.adapter = (config) => {
      calls.push(config.url ?? '')
      const key = `${config.method} ${config.url}`
      const map: Record<string, unknown> = {
        'get /ingestion/jobs/stats': {
          total: 25,
          queued: 2,
          running: 1,
          success: 18,
          failed: 3,
          retry_wait: 1,
        },
        'get /ingestion/jobs/metrics': {
          average_wait_seconds: 3.4,
          average_processing_seconds: 12.1,
          failure_rate_percent: 12.0,
          oldest_queued_seconds: 8.0,
        },
        'get /ingestion/jobs': [],
        'get /ingestion/workers': [
          {
            worker_id: 'w-1',
            status: 'HEALTHY',
            current_job_id: 99,
            last_heartbeat_at: '2026-11-10T10:00:00Z',
          },
          {
            worker_id: 'w-2',
            status: 'OFFLINE',
            current_job_id: null,
            last_heartbeat_at: '2026-11-10T09:00:00Z',
          },
        ],
        'get /data-quality-issues/stats': {
          total: 9,
          assigned: 4,
          pending_verification: 2,
          verified: 3,
        },
        'get /cleaning-runs': [],
        'get /pipeline/auto/overview': {
          automatic_enabled: true,
          healthy_workers: 1,
          counts: { SUCCESS: 4 },
          paused_datasets: 0,
          total: 4,
          recipe_version: 'auto-source-v1',
        },
        'get /pipeline/auto/flows': { items: [], next_offset: null },
      }
      return Promise.resolve({ data: map[key], status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderDashboard()
    try {
      expect(await screen.findByText('25')).toBeInTheDocument()
      expect(
        screen.getByRole('region', { name: 'Dashboard Bronze đến Silver' })
      ).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Tự cập nhật mỗi 5 giây' })).toBeChecked()
      expect(screen.getByText('12.0%')).toBeInTheDocument()
      expect(screen.getByText('1 (1 đang chạy job)')).toBeInTheDocument()
      expect(screen.getByText('9')).toBeInTheDocument()
      expect(screen.queryByText(/96,8%/)).not.toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Làm mới' })).not.toBeDisabled()
      )
      fireEvent.click(screen.getByRole('button', { name: 'Làm mới' }))
      await waitFor(() =>
        expect(calls.filter((url) => url === '/pipeline/auto/flows').length).toBeGreaterThan(1)
      )
      expect(calls.filter((url) => url === '/pipeline/auto/overview').length).toBeGreaterThan(1)
    } finally {
      client.clear()
    }
  })

  it('hiển thị trạng thái lỗi khi backend trả 503', async () => {
    http.defaults.adapter = (config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError('err', 'ERR_BAD_RESPONSE', config, undefined, {
          status: 503,
          statusText: 'Unavailable',
          headers: new AxiosHeaders(),
          config,
          data: {},
        })
      )

    const { client } = renderDashboard()
    try {
      const alerts = await screen.findAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    } finally {
      client.clear()
    }
  })
})
