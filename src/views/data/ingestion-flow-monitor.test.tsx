import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { IngestionFlow } from '@/api/admindata/ingestion-flows'
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
  error_code: null,
  run_id: 'run-22',
  snapshot_id: null,
  records_read: 10,
  records_passed: 8,
  records_quarantined: 2,
  records_published: 0,
  steps: [
    { key: 'received', label: 'Tiếp nhận', state: 'done', at: null, detail: 'Đã tiếp nhận' },
    {
      key: 'bronze',
      label: 'Lưu Bronze',
      state: 'done',
      at: null,
      detail: 'Đã lưu Bronze thành công',
    },
    {
      key: 'queue',
      label: 'Xếp hàng Silver',
      state: 'done',
      at: null,
      detail: 'Đã nhận lượt xử lý',
    },
    {
      key: 'cleaning',
      label: 'Làm sạch & kiểm tra',
      state: 'done',
      at: null,
      detail: 'Đã kiểm tra',
    },
    {
      key: 'publication',
      label: 'Công bố Silver',
      state: 'blocked',
      at: null,
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
function show(items: IngestionFlow[]) {
  http.defaults.adapter = (config) =>
    Promise.resolve({
      data: { items, next_offset: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <IngestionFlowMonitor refresh={false} />
    </QueryClientProvider>
  )
  return { client }
}

describe('IngestionFlowMonitor', () => {
  it('hiển thị người nạp và chi tiết Silver chưa được công bố', async () => {
    show([base])
    expect(await screen.findByText('nhan-vien.csv')).toBeInTheDocument()
    expect(screen.getByText(/hr_staff/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lần nạp #22' })).toHaveAttribute(
      'href',
      '/data/ingestion?jobId=22'
    )
    fireEvent.click(screen.getByRole('button', { name: /Silver/ }))
    const drawer = await screen.findByRole('dialog')
    expect(drawer).toHaveTextContent('Chất lượng chưa đạt điều kiện công bố')
    expect(drawer).toHaveTextContent('BLOCKED')
    expect(drawer).toHaveTextContent('Dòng cách ly')
  })

  it('file chưa vào Bronze không được coi là đã công bố Silver hoặc Gold', async () => {
    show([
      {
        ...base,
        auto_job_id: null,
        silver_status: null,
        run_id: null,
        ingestion_status: 'FAILED',
        steps: base.steps.map((s) =>
          s.key === 'received'
            ? s
            : {
                ...s,
                state: s.key === 'bronze' ? 'failed' : 'pending',
              }
        ),
      },
    ])
    await screen.findByText('nhan-vien.csv')
    expect(screen.getByRole('button', { name: /Bronze/ })).toHaveTextContent('Không thành công')
    fireEvent.click(screen.getByRole('button', { name: /Silver/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('NOT_STARTED')
  })

  it('tìm lần nạp đặt lại bộ lọc truy vấn theo nội dung đã nhập', async () => {
    const { client } = show([base])
    await screen.findByText('nhan-vien.csv')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm lần nạp' }), {
      target: { value: 'nhan-vien.csv' },
    })
    await waitFor(() =>
      expect(client.getQueryData(['ingestion-flow', 'list', 'nhan-vien.csv', 0])).toBeDefined()
    )
  })
})
