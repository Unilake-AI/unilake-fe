import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { WorkersView } from './workers-view'

import type { AxiosAdapter } from 'axios'

describe('WorkersView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('phân biệt worker đang xử lý job, worker rảnh (idle) và worker ngoại tuyến', async () => {
    const loadWorkers = vi.fn<AxiosAdapter>((config) =>
      Promise.resolve({
        data: [
          {
            worker_id: 'worker-busy',
            status: 'HEALTHY',
            current_job_id: 77,
            last_heartbeat_at: '2026-11-10T10:00:00Z',
          },
          {
            worker_id: 'worker-idle',
            status: 'HEALTHY',
            current_job_id: null,
            last_heartbeat_at: '2026-11-10T10:00:00Z',
          },
          {
            worker_id: 'worker-dead',
            status: 'OFFLINE',
            current_job_id: null,
            last_heartbeat_at: '2026-11-10T08:00:00Z',
          },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    )
    http.defaults.adapter = loadWorkers

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      render(
        <QueryClientProvider client={client}>
          <WorkersView />
        </QueryClientProvider>
      )

      expect(await screen.findByText('worker-busy')).toBeInTheDocument()
      expect(screen.getByText('Đang rảnh (Idle)')).toBeInTheDocument()
      expect(screen.getByText('Không phản hồi')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Job #77' })).toHaveAttribute(
        'href',
        '/data/ingestion?jobId=77'
      )
      expect(screen.queryByRole('checkbox', { name: /tự động làm mới/i })).not.toBeInTheDocument()
      expect(loadWorkers).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('button', { name: /làm mới/i })).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
