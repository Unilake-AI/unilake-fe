import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_CreateDataSource, API_GetDataSource, API_UpdateDataSource } from '@/api/api_data'
import type { DataSourceItem } from '@/types/data'

import { SourceEditView, SourceFormView } from './source-form-view'

const push = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('@/api/api_data', () => ({
  API_CreateDataSource: vi.fn(),
  API_GetDataSource: vi.fn(),
  API_UpdateDataSource: vi.fn(),
}))

const createSource = vi.mocked(API_CreateDataSource)
const getSource = vi.mocked(API_GetDataSource)
const updateSource = vi.mocked(API_UpdateDataSource)

const existing: DataSourceItem = {
  data_source_id: 7,
  source_system_id: 3,
  source_system_name: 'Human Resources System',
  source_name: 'HR Employee API',
  source_type: 'REST_API',
  connection_type: 'REST',
  location: 'https://api.uni.edu.vn/hr/employees',
  description: 'Nhân sự',
  is_active: true,
  last_ingested_at: null,
  last_ingestion_status: null,
  ingestion_count: 0,
  created_by: 1,
  created_at: '2026-10-01T00:00:00',
  updated_at: null,
}

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('SourceFormView (thêm mới)', () => {
  beforeEach(() => {
    createSource.mockReset()
    push.mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it('báo lỗi trường bắt buộc và không gọi API', async () => {
    const user = userEvent.setup()
    renderWithClient(<SourceFormView />)

    await user.clear(screen.getByLabelText('delimiter *'))
    await user.click(screen.getByRole('button', { name: 'Lưu nguồn dữ liệu' }))

    expect(await screen.findByText('Vui lòng nhập tên nguồn dữ liệu.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập vị trí của nguồn.')).toBeInTheDocument()
    expect(screen.getByText('delimiter là bắt buộc với CSV.')).toBeInTheDocument()
    expect(screen.getByText('3 trường chưa hợp lệ')).toBeInTheDocument()
    expect(createSource).not.toHaveBeenCalled()
  })

  it('gửi payload đúng kiểu, báo thành công và quay về danh sách', async () => {
    const user = userEvent.setup()
    createSource.mockResolvedValue({ ...existing, source_name: 'Applicants CSV' })
    renderWithClient(<SourceFormView />)

    await user.type(screen.getByLabelText('Tên nguồn dữ liệu *'), ' Applicants CSV ')
    await user.type(
      screen.getByLabelText('Vị trí (đường dẫn / bucket / endpoint) *'),
      's3://unilake-raw/a.csv'
    )
    await user.click(screen.getByRole('button', { name: 'Lưu nguồn dữ liệu' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/data'))
    expect(createSource).toHaveBeenCalledWith({
      source_system_id: 1,
      source_name: 'Applicants CSV',
      source_type: 'CSV',
      connection_type: 'FILE',
      location: 's3://unilake-raw/a.csv',
      configuration: { delimiter: ',', encoding: 'utf-8', has_header: true, quote_char: '"' },
      description: null,
      is_active: true,
    })
    expect(toast.success).toHaveBeenCalledWith('Đã thêm nguồn “Applicants CSV”.')
  })

  it('hiện lỗi chi tiết backend trả về', async () => {
    const user = userEvent.setup()
    const headers = new AxiosHeaders()
    createSource.mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', { headers }, undefined, {
        status: 422,
        statusText: '',
        headers,
        config: { headers },
        data: {
          success: false,
          error: {
            code: 'CONFIGURATION_INVALID',
            message: 'Configuration không hợp lệ',
            details: { errors: ["Configuration 'encoding' must not be empty"] },
          },
        },
      })
    )
    renderWithClient(<SourceFormView />)

    await user.type(screen.getByLabelText('Tên nguồn dữ liệu *'), 'A')
    await user.type(screen.getByLabelText('Vị trí (đường dẫn / bucket / endpoint) *'), 's3://a')
    await user.click(screen.getByRole('button', { name: 'Lưu nguồn dữ liệu' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Configuration không hợp lệ')
    expect(alert).toHaveTextContent("Configuration 'encoding' must not be empty")
    expect(push).not.toHaveBeenCalled()
  })
})

describe('SourceEditView (chỉnh sửa)', () => {
  beforeEach(() => {
    getSource.mockReset()
    updateSource.mockReset()
    push.mockReset()
    vi.mocked(toast.success).mockReset()
    getSource.mockResolvedValue(existing)
  })

  it('điền sẵn dữ liệu, khoá loại nguồn và không gửi cấu hình nếu không nhập lại', async () => {
    const user = userEvent.setup()
    updateSource.mockResolvedValue({ ...existing, source_name: 'HR API v2' })
    renderWithClient(<SourceEditView id={7} />)

    const name = await screen.findByLabelText('Tên nguồn dữ liệu *')
    expect(name).toHaveValue('HR Employee API')
    expect(screen.getByLabelText('Loại nguồn * (không đổi được sau khi lưu)')).toBeDisabled()
    expect(screen.queryByLabelText('method *')).not.toBeInTheDocument()

    await user.clear(name)
    await user.type(name, 'HR API v2')
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/data'))
    expect(getSource).toHaveBeenCalledWith(7)
    expect(updateSource).toHaveBeenCalledWith(7, {
      source_system_id: 3,
      source_name: 'HR API v2',
      connection_type: 'REST',
      location: 'https://api.uni.edu.vn/hr/employees',
      description: 'Nhân sự',
      is_active: true,
    })
    expect(toast.success).toHaveBeenCalledWith('Đã cập nhật nguồn “HR API v2”.')
  })

  it('gửi cấu hình mới khi chọn nhập lại cấu hình', async () => {
    const user = userEvent.setup()
    updateSource.mockResolvedValue(existing)
    renderWithClient(<SourceEditView id={7} />)

    await user.click(await screen.findByLabelText(/Nhập lại cấu hình/))
    await user.clear(screen.getByLabelText('timeout_seconds *'))
    await user.type(screen.getByLabelText('timeout_seconds *'), '60')
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(updateSource).toHaveBeenCalled())
    expect(updateSource.mock.calls[0]?.[1]).toMatchObject({
      configuration: {
        method: 'GET',
        timeout_seconds: 60,
        headers: {},
        pagination: { type: 'none' },
      },
    })
  })

  it('báo lỗi khi không tải được nguồn dữ liệu', async () => {
    getSource.mockRejectedValue(new Error('network'))
    renderWithClient(<SourceEditView id={99} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được nguồn dữ liệu.')
  })
})
