import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { IngestionFlow } from '@/api/admindata/auto-pipeline'
import { http } from '@/api/http'

import { IngestionFlowMonitor } from './ingestion-flow-monitor'

const base: IngestionFlow = {
  ingestion_job_id: 22,
  dataset_id: 4,
  dataset_name: 'Nhân sự',
  domain: 'hr',
  filename: 'nhan-vien.csv',
  uploaded_by: 'hr_staff',
  created_at: '2026-11-16T10:00:00Z',
  ingestion_status: 'SUCCESS',
  bronze_rows: 10,
  auto_job_id: 'silver-22',
  silver_status: 'QUARANTINED',
  next_attempt_at: null,
  error_code: null,
  run_id: 'run-22',
  snapshot_id: null,
  records_read: 10,
  records_passed: 8,
  records_quarantined: 2,
  records_published: 0,
  steps: [
    { key: 'received', label: 'Tiếp nhận', state: 'done', detail: 'Đã tiếp nhận' },
    { key: 'bronze', label: 'Lưu Bronze', state: 'done', detail: 'Đã lưu Bronze thành công' },
    { key: 'queue', label: 'Xếp hàng Silver', state: 'done', detail: 'Đã nhận lượt xử lý' },
    { key: 'cleaning', label: 'Làm sạch & kiểm tra', state: 'done', detail: 'Đã kiểm tra' },
    {
      key: 'publication',
      label: 'Công bố Silver',
      state: 'blocked',
      detail: 'Chất lượng chưa đạt điều kiện công bố',
    },
  ],
}

const original = http.defaults.adapter
const clients: QueryClient[] = []
afterEach(() => {
  http.defaults.adapter = original
  clients.forEach((c) => c.clear())
  clients.length = 0
})
function show(items: IngestionFlow[], initialJobId?: number) {
  http.defaults.adapter = (config) =>
    Promise.resolve({
      data: { items, next_offset: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
  const inspect = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <IngestionFlowMonitor refresh={false} initialJobId={initialJobId} inspectSilver={inspect} />
    </QueryClientProvider>
  )
  return { inspect, client }
}

describe('IngestionFlowMonitor', () => {
  it('hiển thị người nạp và từng bước; quarantine không được coi là đã công bố', async () => {
    const { inspect } = show([base])
    expect(await screen.findByText('nhan-vien.csv')).toBeInTheDocument()
    expect(screen.getByText(/Người gửi: hr_staff/)).toBeInTheDocument()
    expect(
      screen.getByRole('listitem', { name: 'Bước 5: Công bố Silver — Chưa thể tiếp tục' })
    ).toBeInTheDocument()
    expect(screen.getByText('Chất lượng chưa đạt điều kiện công bố')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chi tiết lần nạp Bronze' })).toHaveAttribute(
      'href',
      '/data/ingestion?jobId=22'
    )
    expect(screen.getByRole('link', { name: 'Báo cáo làm sạch & chất lượng' })).toHaveAttribute(
      'href',
      '/data/cleaning?jobId=22'
    )
    fireEvent.click(screen.getByRole('button', { name: /Lịch sử & kết quả Silver/ }))
    expect(inspect).toHaveBeenCalledWith('silver-22')
  })

  it('file chưa vào Bronze vẫn hiện, các bước Silver chưa bắt đầu', async () => {
    show([
      {
        ...base,
        auto_job_id: null,
        silver_status: null,
        run_id: null,
        ingestion_status: 'FAILED',
        steps: base.steps!.map((s) =>
          s.key === 'received' ? s : { ...s, state: s.key === 'bronze' ? 'failed' : 'pending' }
        ),
      },
    ])
    expect(
      await screen.findByRole('listitem', { name: 'Bước 2: Lưu Bronze — Thất bại' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('listitem', { name: 'Bước 5: Công bố Silver — Chưa bắt đầu' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Lịch sử & kết quả Silver/ })
    ).not.toBeInTheDocument()
  })

  it('link từ ingestion lọc đúng lần nạp, cho phép quay về toàn bộ', async () => {
    const { client } = show([base], 22)
    await screen.findByText('nhan-vien.csv')
    expect(client.getQueryData(['auto-silver', 'flows', '', 22, 0])).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Tất cả lần nạp' }))
    await waitFor(() =>
      expect(client.getQueryData(['auto-silver', 'flows', '', undefined, 0])).toBeDefined()
    )
  })
})
