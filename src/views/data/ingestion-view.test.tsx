import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { IngestionView } from './ingestion-view'

it('tải chi tiết khi mở job và chỉ chạy Cleaning sau khi người dùng bấm nút', async () => {
  const job = {
    ingestion_job_id: 42,
    data_source_id: 3,
    dataset_id: 8,
    status: 'SUCCESS',
    source_table: 'input.csv',
  }
  const trackRequest = vi.fn<(endpoint: string) => void>()
  const originalAdapter = http.defaults.adapter
  http.defaults.adapter = (config) => {
    const endpoint = `${config.method} ${config.url}`
    trackRequest(endpoint)
    const responses: Record<string, unknown> = {
      'get /ingestion/jobs': [job],
      'get /ingestion/jobs/42': { ...job, requested_by: '42' },
      'post /pipeline/cleaning/ingestion-jobs/42': {
        status: 'QUARANTINED',
        records_passed: 8,
        records_quarantined: 2,
        publication: null,
      },
    }
    return Promise.resolve({
      data: responses[endpoint],
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })
  }

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={client}>
        <IngestionView />
      </QueryClientProvider>
    )
    const detail = await screen.findByRole('button', { name: 'Chi tiết lần nạp #42' })
    expect(trackRequest.mock.calls).toEqual([['get /ingestion/jobs']])

    await user.click(detail)
    const run = await screen.findByRole('button', { name: 'Làm sạch dữ liệu' })
    expect(trackRequest.mock.calls).toEqual([['get /ingestion/jobs'], ['get /ingestion/jobs/42']])

    await user.click(run)
    expect(await screen.findByText(/2 dòng cần kiểm tra · Chưa lưu kết quả/)).toBeInTheDocument()
    expect(trackRequest).toHaveBeenLastCalledWith('post /pipeline/cleaning/ingestion-jobs/42')
  } finally {
    client.clear()
    http.defaults.adapter = originalAdapter
  }
})
