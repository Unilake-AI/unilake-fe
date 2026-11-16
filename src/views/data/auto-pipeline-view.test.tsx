import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { API_GetAutoSilverPolicy } from '@/api/admindata/auto-pipeline'
import { http } from '@/api/http'
import { AutoSilverForIngestion } from '@/components/data/auto-silver-jobs'

import { AutoPipelineView } from './auto-pipeline-view'

import type { InternalAxiosRequestConfig } from 'axios'

const jobId = '11111111-1111-4111-8111-111111111111'
const job = {
  job_id: jobId,
  ingestion_job_id: 20,
  dataset_id: 4,
  status: 'FAILED',
  attempt_number: 1,
  error_code: 'NETWORK',
  result: null,
  created_at: '2026-11-16T01:00:00Z',
  finished_at: '2026-11-16T01:01:00Z',
  next_attempt_at: null,
}
function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  code: string,
  message: string
): never {
  throw new AxiosError(message, 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: 'Error',
    headers: new AxiosHeaders(),
    config,
    data: { success: false, error: { code, message } },
  })
}

function environment(options: { automatic?: boolean; healthy?: number } = {}) {
  const calls: { method: string; url: string; body: unknown; params: unknown }[] = []
  let retryConflict = false
  let status = 'FAILED'
  http.defaults.adapter = async (config) => {
    await Promise.resolve()
    const url = config.url ?? ''
    calls.push({
      method: config.method ?? '',
      url,
      body: config.data ? JSON.parse(String(config.data)) : undefined,
      params: config.params,
    })
    let data: unknown = []
    if (url === '/pipeline/auto/overview')
      data = {
        automatic_enabled: options.automatic ?? true,
        recipe_version: 'auto-source-v1',
        total: 1,
        counts: { FAILED: 1 },
        paused_datasets: 0,
        healthy_workers: options.healthy ?? 1,
      }
    else if (url === '/pipeline/auto/jobs')
      data = [{ ...job, status, dataset_name: 'Nhân viên HR', source_table: 'employees.csv' }]
    else if (url === `/pipeline/auto/jobs/${jobId}`)
      data = { ...job, status, worker_id: 'silver-1', lease_expires_at: null }
    else if (url.endsWith('/attempts'))
      data = [
        {
          attempt_number: 1,
          worker_id: 'silver-1',
          status: 'FAILED',
          error_code: 'NETWORK',
          started_at: '2026-11-16T01:00:00Z',
          finished_at: '2026-11-16T01:01:00Z',
        },
      ]
    else if (url.endsWith('/retry')) {
      if (retryConflict)
        fail(config, 409, 'AUTO_PIPELINE_RETRY_CONFLICT', 'Cấu hình không còn hiệu lực để thử lại')
      status = 'QUEUED'
      data = { job_id: jobId, status, attempt_number: 1 }
    } else if (url === '/pipeline/auto/workers')
      data = [
        {
          worker_id: 'silver-1',
          current_job_id: null,
          last_heartbeat_at: '2026-11-16T01:02:00Z',
          healthy: true,
        },
      ]
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AutoPipelineView />
    </QueryClientProvider>
  )
  return {
    client,
    calls,
    user: userEvent.setup(),
    conflictRetry: () => {
      retryConflict = true
    },
    permitRetry: () => {
      retryConflict = false
    },
  }
}

describe('Gọi API xử lý Silver tự động', () => {
  const original = http.defaults.adapter
  afterEach(() => {
    http.defaults.adapter = original
  })

  it('tự giám sát mọi bộ dữ liệu ngay khi mở trang, không yêu cầu chọn hoặc lưu cấu hình', async () => {
    const { client, calls } = environment()
    try {
      expect(await screen.findByText('Đang tự động xử lý Bronze → Silver')).toBeInTheDocument()
      expect(await screen.findByText('silver-1')).toBeInTheDocument()
      expect(calls.some((call) => call.url === '/pipeline/auto/jobs')).toBe(true)
      expect(
        calls.some(
          (call) =>
            call.url === '/pipeline/profiles' || call.url === '/datasets' || call.method === 'put'
        )
      ).toBe(false)
      expect(screen.queryByLabelText('Bộ dữ liệu tự chạy')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Lưu cấu hình tự chạy' })).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  })

  it('nói rõ khi chưa áp dụng migration hoặc worker dừng, không báo tự động giả', async () => {
    const { client } = environment({ automatic: false, healthy: 0 })
    try {
      expect(await screen.findByText('Cần cập nhật hệ thống tự động')).toBeInTheDocument()
      expect(screen.queryByText('Đang tự động xử lý Bronze → Silver')).not.toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('Chưa có bộ xử lý Silver đang hoạt động')
    } finally {
      client.clear()
    }
  })

  it('bộ lọc tùy chọn chỉ lọc lượt chạy, không cấu hình dataset', async () => {
    const { client, calls, user } = environment()
    try {
      await screen.findByText('silver-1')
      await user.click(screen.getByText('Lọc lượt chạy (tùy chọn)'))
      await user.type(screen.getByLabelText('Lọc theo mã bộ dữ liệu'), '4')
      await user.type(screen.getByLabelText('Lọc theo lần nạp Bronze'), '20')
      await user.click(screen.getByRole('button', { name: 'Lọc lượt chạy' }))
      await waitFor(() =>
        expect(
          calls.filter((call) => call.url === '/pipeline/auto/jobs').at(-1)?.params
        ).toMatchObject({ dataset_id: 4, ingestion_job_id: 20 })
      )
      expect(calls.some((call) => call.method === 'put')).toBe(false)
    } finally {
      client.clear()
    }
  })

  it('gọi danh sách, chi tiết, lịch sử, worker và chỉ retry sau khi xác nhận', async () => {
    const { client, calls, user, conflictRetry, permitRetry } = environment()
    try {
      expect(await screen.findByText('silver-1')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Xem lượt 11111111' }))
      expect(
        await screen.findByRole('button', { name: 'Thử lại xử lý Silver' })
      ).toBeInTheDocument()
      await screen.findByText('Lịch sử xử lý Silver')
      expect(calls.some((call) => call.url.endsWith('/attempts'))).toBe(true)
      expect(calls.some((call) => call.url.endsWith('/retry'))).toBe(false)
      await user.click(screen.getByRole('button', { name: 'Thử lại xử lý Silver' }))
      conflictRetry()
      await user.click(screen.getByRole('button', { name: 'Xác nhận thử lại Silver' }))
      expect(
        await screen.findByText('Chỉ thử lại lượt thất bại có cấu hình đang bật và cùng phiên bản.')
      ).toBeInTheDocument()
      permitRetry()
      await user.click(screen.getByRole('button', { name: 'Xác nhận thử lại Silver' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findAllByText('Chờ xử lý Silver')).not.toHaveLength(0)
      expect(calls.filter((call) => call.url.endsWith('/retry'))).toHaveLength(2)
    } finally {
      client.clear()
    }
  })

  it.each([403, 404, 503])('không coi lỗi API %s là bộ dữ liệu chưa cấu hình', async (status) => {
    http.defaults.adapter = (config) =>
      Promise.reject(
        new AxiosError('error', 'ERR_BAD_RESPONSE', config, undefined, {
          status,
          statusText: 'Error',
          headers: new AxiosHeaders(),
          config,
          data: { error: { code: 'OTHER_ERROR' } },
        })
      )
    await expect(API_GetAutoSilverPolicy(4)).rejects.toBeInstanceOf(AxiosError)
  })

  it('phần theo dõi STAFF chỉ gọi API đọc và hiển thị chính xác công bố một phần', async () => {
    const calls: string[] = []
    const result = {
      status: 'PUBLISHED_WITH_QUARANTINE',
      records_read: 20,
      records_passed: 18,
      records_quarantined: 2,
      publication: { snapshot_id: 'snapshot-1', records_published: 18 },
    }
    http.defaults.adapter = (config) => {
      calls.push(`${config.method} ${config.url}`)
      if (config.url === '/pipeline/auto/jobs')
        expect(config.params).toEqual({ ingestion_job_id: 20, limit: 20, offset: 0 })
      const data =
        config.url === '/pipeline/auto/jobs'
          ? [{ ...job, status: 'SUCCESS', result }]
          : config.url?.endsWith('/attempts')
            ? []
            : { ...job, status: 'SUCCESS', result }
      return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      render(
        <QueryClientProvider client={client}>
          <AutoSilverForIngestion ingestionJobId={20} />
        </QueryClientProvider>
      )
      expect(
        await screen.findByText('Đã công bố một phần; các dòng lỗi được giữ trong hồ sơ cách ly.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Thử lại xử lý Silver' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Cấu hình tự chạy' })).not.toBeInTheDocument()
      expect(calls).toContain(`get /pipeline/auto/jobs/${jobId}`)
      expect(calls).toContain(`get /pipeline/auto/jobs/${jobId}/attempts`)
      expect(calls.every((call) => call.startsWith('get /pipeline/auto/jobs'))).toBe(true)
    } finally {
      client.clear()
    }
  })
})
