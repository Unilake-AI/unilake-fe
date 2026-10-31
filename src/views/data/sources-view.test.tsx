import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_ListDataSources, API_UpdateDataSource } from '@/api/api_data'
import type { DataSourceItem } from '@/types/data'

import { SourcesView } from './sources-view'

vi.mock('@/api/api_data', () => ({
  API_ListDataSources: vi.fn(),
  API_UpdateDataSource: vi.fn(),
}))

const listSources = vi.mocked(API_ListDataSources)
const updateSource = vi.mocked(API_UpdateDataSource)

function source(overrides: Partial<DataSourceItem>): DataSourceItem {
  return {
    data_source_id: 1,
    source_system_id: 1,
    source_system_name: 'Admissions System',
    source_name: 'Admissions CSV',
    source_type: 'CSV',
    connection_type: 'FILE',
    location: 's3://unilake-raw/admissions/applicants.csv',
    description: null,
    is_active: true,
    last_ingested_at: '2026-10-17T03:00:00',
    last_ingestion_status: 'SUCCESS',
    ingestion_count: 3,
    created_by: 1,
    created_at: '2026-10-01T00:00:00',
    updated_at: null,
    ...overrides,
  }
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SourcesView />
    </QueryClientProvider>
  )
}

describe('SourcesView', () => {
  const items = [
    source({}),
    source({
      data_source_id: 2,
      source_name: 'HR Employee API',
      source_type: 'REST_API',
      last_ingestion_status: 'FAILED',
      ingestion_count: 2,
      is_active: false,
    }),
  ]

  beforeEach(() => {
    listSources.mockReset()
    updateSource.mockReset()
    listSources.mockResolvedValue({ items, total: 2, page: 1, page_size: 10 })
  })

  it('hiển thị danh sách và số liệu tổng quan từ API', async () => {
    renderView()

    expect(await screen.findByText('Admissions CSV')).toBeInTheDocument()
    expect(screen.getByText('Hiển thị 2 / 2 nguồn')).toBeInTheDocument()
    expect(screen.getAllByText('HR Employee API').length).toBeGreaterThan(1) // KPI "lần nạp lỗi"
    expect(screen.getByText('5')).toBeInTheDocument() // tổng số lần nạp
    expect(listSources).toHaveBeenCalledWith({ page: 1, page_size: 10 })
  })

  it('gửi bộ lọc loại nguồn và trạng thái lên API', async () => {
    const user = userEvent.setup()
    renderView()
    await screen.findByText('Admissions CSV')

    await user.selectOptions(screen.getByLabelText('Loại nguồn:'), 'REST_API')
    await user.selectOptions(screen.getByLabelText('Trạng thái:'), 'inactive')

    await waitFor(() =>
      expect(listSources).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        source_type: 'REST_API',
        is_active: false,
      })
    )
  })

  it('bật/tắt nguồn bằng PATCH is_active', async () => {
    const user = userEvent.setup()
    updateSource.mockResolvedValue(source({ is_active: false }))
    renderView()

    await user.click(await screen.findByRole('button', { name: 'Tắt nguồn Admissions CSV' }))
    await waitFor(() => expect(updateSource).toHaveBeenCalledWith(1, { is_active: false }))
  })

  it('hiện lỗi và nút thử lại khi API lỗi', async () => {
    listSources.mockRejectedValue(new Error('network'))
    renderView()

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
