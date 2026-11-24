import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { GoldView } from './gold-view'

const adapter = http.defaults.adapter
const clients: QueryClient[] = []
afterEach(() => {
  http.defaults.adapter = adapter
  clients.forEach((client) => client.clear())
  clients.length = 0
  vi.restoreAllMocks()
})
const id = '11111111-1111-4111-8111-111111111111'
const silver = '22222222-2222-4222-8222-222222222222'
function environment(options: { failed?: boolean; unavailable?: boolean; blocked?: boolean } = {}) {
  const calls: { method: string; url: string; params: unknown; body: unknown }[] = []
  let ready = options.blocked ?? false
  let blocked = options.blocked ?? false
  let failed = options.failed ?? false
  http.defaults.adapter = async (config) => {
    await Promise.resolve()
    const url = config.url ?? ''
    calls.push({
      method: config.method ?? '',
      url,
      params: config.params,
      body: config.data ? JSON.parse(String(config.data)) : undefined,
    })
    if (options.unavailable)
      throw new AxiosError('error', 'ERR_BAD_RESPONSE', config, undefined, {
        status: 503,
        statusText: 'Error',
        headers: new AxiosHeaders(),
        config,
        data: { error: { code: 'GOLD_METADATA_UNAVAILABLE', message: 'Gold chưa sẵn sàng' } },
      })
    let data: unknown = []
    if (config.method === 'post' && url === '/pipeline/gold/refresh') {
      ready = true
      data = { job_id: id, status: 'SUCCEEDED' }
    } else if (config.method === 'post' && url.endsWith('/database-sync/retry')) {
      blocked = false
      data = { gold_job_id: id, status: 'QUEUED' }
    } else if (config.method === 'post' && url.endsWith('/retry')) {
      failed = false
      data = { job_id: id, status: 'QUEUED' }
    } else if (url === '/pipeline/gold/workers')
      data = [{ worker_id: 'gold-local', healthy: true, heartbeat_at: '2026-11-16T10:00:00Z' }]
    else if (url === '/pipeline/gold/sources')
      data = [
        {
          scope: 'test',
          silver_snapshot_id: silver,
          dataset_id: 4,
          dataset_name: 'Nhân sự kiểm thử',
          domain: 'hr',
          job_id: ready || failed ? id : null,
          status: ready ? 'SUCCEEDED' : failed ? 'FAILED' : null,
          sync_status: ready ? 'CURRENT' : failed ? 'FAILED' : 'NOT_STARTED',
          error_code: failed ? 'GOLD_NETWORK' : null,
          database_sync_status: ready ? (blocked ? 'BLOCKED' : 'SYNCED') : null,
          database_sync_error: blocked ? 'GOLD_SYNC_REFERENCE_MISSING' : null,
          database_sync_report: blocked
            ? { code: 'GOLD_SYNC_REFERENCE_MISSING', entity: 'assignment', field: 'position_id' }
            : null,
        },
      ]
    const job = {
      job_id: id,
      scope: 'test',
      domain: 'hr',
      dataset_id: 4,
      silver_snapshot_id: silver,
      recipe_version: 'group-counts-v1',
      generation: 1,
      status: failed ? 'FAILED' : ready ? 'SUCCEEDED' : 'QUEUED',
      attempt_number: 1,
      error_code: failed ? 'GOLD_NETWORK' : null,
      database_sync_status: ready ? (blocked ? 'BLOCKED' : 'SYNCED') : null,
      database_sync_error: blocked ? 'GOLD_SYNC_REFERENCE_MISSING' : null,
      database_sync_report: blocked
        ? { code: 'GOLD_SYNC_REFERENCE_MISSING', entity: 'assignment', field: 'position_id' }
        : null,
      created_at: '2026-11-16T10:00:00Z',
      finished_at: null,
      result: ready ? { records_read: 20, aggregate_rows: 1 } : null,
    }
    if (url === '/pipeline/gold/jobs') data = ready || failed ? [job] : []
    else if (url === '/pipeline/gold/metrics')
      data = ready
        ? [
            {
              ...job,
              gold_snapshot_id: id,
              entity: 'employee',
              metric: 'record_count',
              dimensions: {},
              value: 20,
            },
          ]
        : []
    else if (url === `/pipeline/gold/jobs/${id}`) data = job
    else if (url.endsWith('/attempts'))
      data = [
        {
          attempt_number: 1,
          status: job.status,
          started_at: job.created_at,
          finished_at: null,
          error_code: job.error_code,
        },
      ]
    else if (url.endsWith('/report'))
      data = new Blob(['Loại dữ liệu,Chỉ số,Nhóm,Số lượng\nemployee,record_count,{},20'], {
        type: 'text/csv',
      })
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
  return calls
}
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <GoldView />
    </QueryClientProvider>
  )
  return userEvent.setup()
}

describe('Giao diện Gold dùng API thật qua client chung', () => {
  it('gọi API nguồn, chỉ số, worker; tạo lượt và tải báo cáo kèm nguồn Silver', async () => {
    const calls = environment()
    const user = show()
    expect(await screen.findByText('Nhân sự kiểm thử')).toBeInTheDocument()
    expect(screen.getByText('Chưa có số liệu Gold hiện hành')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tạo Gold' }))
    expect(await screen.findByText('Gold hiện hành')).toBeInTheDocument()
    expect(await screen.findByText('Tổng số bản ghi')).toBeInTheDocument()
    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'post',
        url: '/pipeline/gold/refresh',
        body: { silver_snapshot_id: silver },
      })
    )
    expect(await screen.findByText('group-counts-v1', { exact: false })).toBeInTheDocument()
    await waitFor(() => expect(calls.some((call) => call.url.endsWith('/attempts'))).toBe(true))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:gold'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    await user.click(screen.getByRole('button', { name: 'Tải báo cáo CSV' }))
    await waitFor(() => expect(calls.some((call) => call.url.endsWith('/report'))).toBe(true))
    for (const path of ['sources', 'jobs', 'metrics', 'workers'])
      expect(calls.some((call) => call.url === `/pipeline/gold/${path}`)).toBe(true)
  })

  it('chỉ gửi chạy lại sau khi xác nhận và giữ lịch sử trên giao diện', async () => {
    const calls = environment({ failed: true })
    const user = show()
    await user.click(await screen.findByRole('button', { name: 'Thử lại' }))
    expect(calls.some((call) => call.url.endsWith('/retry'))).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Xác nhận thử lại' }))
    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({ method: 'post', url: `/pipeline/gold/jobs/${id}/retry` })
      )
    )
    expect(await screen.findByText('Đã yêu cầu thử lại.')).toBeInTheDocument()
  })

  it('phân biệt Gold đã công bố và DB bị chặn, chỉ thử lại DB sau xác nhận', async () => {
    const calls = environment({ blocked: true })
    const user = show()
    expect(await screen.findByText('Gold hiện hành')).toBeInTheDocument()
    expect((await screen.findAllByText('Cần bổ sung dữ liệu')).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Chi tiết' }))
    expect(await screen.findByText(/assignment.position_id/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Đồng bộ lại vào DB' }))
    expect(calls.some((call) => call.url.endsWith('/database-sync/retry'))).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Xác nhận đồng bộ' }))
    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          method: 'post',
          url: `/pipeline/gold/jobs/${id}/database-sync/retry`,
        })
      )
    )
    expect(
      await screen.findByText('Đã yêu cầu đồng bộ lại dữ liệu Gold vào DB.')
    ).toBeInTheDocument()
  })

  it('đổi lĩnh vực gửi bộ lọc tới cả nguồn, lịch sử và số liệu', async () => {
    const calls = environment()
    const user = show()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Lĩnh vực Gold' }), 'academic')
    await waitFor(() => {
      for (const path of ['sources', 'jobs', 'metrics'])
        expect(calls).toContainEqual(
          expect.objectContaining({
            url: `/pipeline/gold/${path}`,
            params: expect.objectContaining({ domain: 'academic', offset: 0 }),
          })
        )
    })
  })

  it('lỗi thiếu hạ tầng Gold được báo rõ, không giả làm báo cáo rỗng', async () => {
    environment({ unavailable: true })
    show()
    expect(
      (await screen.findAllByText('Hệ thống đang gặp sự cố. Vui lòng thử lại sau.')).length
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Chưa có số liệu Gold hiện hành')).not.toBeInTheDocument()
  })
})
