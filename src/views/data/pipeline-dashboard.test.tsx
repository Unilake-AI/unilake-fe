import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import type { IngestionFlow } from '@/api/admindata/auto-pipeline'
import { http } from '@/api/http'

import { PipelineDashboard } from './pipeline-dashboard'

const published: IngestionFlow = {
  ingestion_job_id: 21,
  dataset_id: 5,
  dataset_name: 'Đào tạo',
  domain: 'academic',
  filename: 'khoa-hoc.xlsx',
  uploaded_by: 'academic_staff',
  created_at: '2026-11-16T07:36:00Z',
  ingestion_status: 'SUCCESS',
  bronze_rows: 250,
  auto_job_id: 'silver-21',
  silver_status: 'SUCCESS',
  attempt_number: 1,
  next_attempt_at: null,
  error_code: null,
  run_id: 'run-21',
  snapshot_id: 'snapshot-21',
  records_read: 250,
  records_passed: 250,
  records_quarantined: 0,
  records_published: 250,
  steps: [
    { key: 'received', label: 'Tiếp nhận', state: 'done', detail: 'Đã tiếp nhận' },
    { key: 'bronze', label: 'Lưu Bronze', state: 'done', detail: 'Đã lưu Bronze' },
    { key: 'queue', label: 'Xếp hàng Silver', state: 'done', detail: 'Đã nhận lượt xử lý' },
    { key: 'cleaning', label: 'Làm sạch & kiểm tra', state: 'done', detail: 'Đã kiểm tra' },
    {
      key: 'publication',
      label: 'Công bố Silver',
      state: 'done',
      detail: 'Đã công bố phiên bản Silver',
    },
  ],
}
const failed: IngestionFlow = {
  ...published,
  ingestion_job_id: 22,
  filename: 'loi.csv',
  auto_job_id: null,
  silver_status: null,
  run_id: null,
  snapshot_id: null,
  ingestion_status: 'FAILED',
  steps: published.steps!.map((step) =>
    step.key === 'received'
      ? step
      : { ...step, state: step.key === 'bronze' ? 'failed' : 'pending' }
  ),
}
const original = http.defaults.adapter
const clients: QueryClient[] = []
afterEach(() => {
  http.defaults.adapter = original
  clients.forEach((c) => c.clear())
  clients.length = 0
})
function show(options: { healthy?: number; unavailable?: boolean; empty?: boolean } = {}) {
  const calls: string[] = []
  http.defaults.adapter = (config) => {
    calls.push(config.url ?? '')
    if (options.unavailable)
      return Promise.reject(
        new AxiosError('Unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
          status: 503,
          statusText: 'Unavailable',
          headers: new AxiosHeaders(),
          config,
          data: { error: { message: 'Dịch vụ chưa sẵn sàng' } },
        })
      )
    const data =
      config.url === '/pipeline/auto/overview'
        ? {
            automatic_enabled: true,
            total: 9,
            recipe_version: 'auto-source-v1',
            counts: { QUEUED: 2, RETRY_WAIT: 1, RUNNING: 1, SUCCESS: 4, QUARANTINED: 1 },
            paused_datasets: 0,
            healthy_workers: options.healthy ?? 1,
          }
        : { items: options.empty ? [] : [failed, published], next_offset: null }
    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <PipelineDashboard />
    </QueryClientProvider>
  )
  return { calls }
}

describe('PipelineDashboard', () => {
  it('tổng hợp hàng đợi tự động và hiển thị trạng thái từng file từ API', async () => {
    const { calls } = show()
    expect(await screen.findByText('khoa-hoc.xlsx')).toBeInTheDocument()
    expect(screen.getByText('Chờ / thử lại Silver')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    const row = screen.getByRole('button', { name: 'Xem tiến trình lần nạp #22' }).closest('tr')!
    expect(within(row).getByText('Thất bại')).toBeInTheDocument()
    expect(within(row).getAllByText('Chưa bắt đầu')).toHaveLength(3)
    expect(calls).toContain('/pipeline/auto/overview')
    expect(calls).toContain('/pipeline/auto/flows')
    expect(screen.getByRole('link', { name: 'Xem toàn bộ tiến trình' })).toHaveAttribute(
      'href',
      '/data/pipeline'
    )
  })
  it('mở đủ 5 bước tại dashboard và liên kết tới đúng lần nạp', async () => {
    show()
    const button = await screen.findByRole('button', { name: 'Xem tiến trình lần nạp #21' })
    fireEvent.click(button)
    expect(
      screen.getByRole('listitem', { name: 'Bước 5: Công bố Silver — Hoàn tất' })
    ).toBeInTheDocument()
    expect(screen.getByText('Phiên bản Silver: snapshot-21')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chi tiết lần nạp Bronze' })).toHaveAttribute(
      'href',
      '/data/ingestion?jobId=21'
    )
    expect(screen.getByRole('link', { name: 'Lịch sử & kết quả Silver' })).toHaveAttribute(
      'href',
      '/data/pipeline?jobId=21'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn' }))
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
  it('nói rõ worker dừng dù tính năng tự động đang bật', async () => {
    show({ healthy: 0 })
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa có bộ xử lý Silver hoạt động')
  })
  it('lỗi API không hiển thị số liệu giả bằng 0', async () => {
    show({ unavailable: true })
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Hoàn tất Silver tự động')).not.toBeInTheDocument()
  })
  it('hiển thị trạng thái chờ staff nạp khi chưa có file', async () => {
    show({ empty: true })
    expect(await screen.findByText('Chưa có file được tiếp nhận')).toBeInTheDocument()
  })
})
