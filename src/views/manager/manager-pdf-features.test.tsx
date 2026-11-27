import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { ManagerAiView } from './ai-view'
import { ManagerAnalyticsView } from './analytics-view'
import { ManagerCatalogView } from './catalog-view'
import { ManagerCreateDatasetView } from './create-dataset-view'

import type { InternalAxiosRequestConfig } from 'axios'

let mockSearchParams = new URLSearchParams()
const push = vi.fn()

vi.mock('next/image', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('recharts', () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Box,
    BarChart: Box,
    Bar: () => null,
    PieChart: Box,
    Pie: () => null,
    Cell: () => null,
    Legend: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  }
})

const originalAdapter = http.defaults.adapter

const hrContext = {
  user_id: 4,
  roles: ['HR_MANAGER'],
  domains: [{ domain: 'hr', name: 'Nhân sự' }],
  departments: [
    { department_id: 1, department_code: 'PNS', department_name: 'Phòng Tổ chức Nhân sự' },
  ],
  default_domain: 'hr',
  needs_department_assignment: false,
  needs_department_configuration: false,
  data_layer: 'GOLD',
  note: '',
}

afterEach(() => {
  http.defaults.adapter = originalAdapter
  mockSearchParams = new URLSearchParams()
})

describe('Manager PDF API integration', () => {
  it('ManagerCatalogView gọi /manager/catalog, chi tiết cấu trúc bảng/cột và /lineage', async () => {
    const calls: InternalAxiosRequestConfig[] = []
    const dataset = {
      dataset_id: 5,
      dataset_code: 'hr_employees_raw',
      dataset_name: 'Hồ sơ Cán bộ - Giảng viên 2026',
      domain: 'hr',
      description: 'Bộ dữ liệu hồ sơ nhân sự',
      updated_at: '2026-11-15T09:30:00Z',
      layer: 'BRONZE',
      last_published_at: '2026-11-18T10:30:00Z',
      tables: [
        {
          name: 'employees',
          description: 'Bảng thông tin nhân viên',
          columns: [
            {
              name: 'employee_code',
              data_type: 'VARCHAR',
              nullable: false,
              description: 'Mã cán bộ',
            },
          ],
        },
      ],
    }

    http.defaults.adapter = (config) => {
      calls.push(config)
      const data =
        config.url === '/manager/context'
          ? hrContext
          : config.url === '/manager/catalog'
            ? { items: [dataset], total: 1, limit: 20, offset: 0 }
            : config.url === '/manager/catalog/5'
              ? dataset
              : config.url === '/manager/catalog/5/lineage'
                ? {
                    dataset_id: 5,
                    steps: [
                      {
                        id: 1,
                        source_layer: 'SOURCE',
                        target_layer: 'BRONZE',
                        source_label: 'Nguồn đã đăng ký',
                        target_label: 'Dữ liệu gốc',
                        created_at: '2026-11-18T08:00:00Z',
                        details: {},
                      },
                      {
                        id: 2,
                        source_layer: 'SILVER',
                        target_layer: 'GOLD',
                        source_label: 'Dữ liệu chuẩn hóa',
                        target_label: 'Báo cáo tổng hợp',
                        created_at: '2026-11-18T10:30:00Z',
                        details: { status: 'COMPLETED' },
                      },
                    ],
                    note: 'Chỉ hiển thị các bước có bằng chứng gắn với bộ dữ liệu này.',
                  }
                : null
      return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={client}>
        <ManagerCatalogView />
      </QueryClientProvider>
    )

    expect(await screen.findByText('Hồ sơ Cán bộ - Giảng viên 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết' }))
    expect(await screen.findByText('employee_code')).toBeInTheDocument()
    expect(screen.getByText('Mã cán bộ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))

    fireEvent.click(screen.getByRole('button', { name: 'Lineage' }))
    expect(await screen.findByText('Nguồn đã đăng ký → Dữ liệu gốc')).toBeInTheDocument()
    expect(screen.getByText('Dữ liệu chuẩn hóa → Báo cáo tổng hợp')).toBeInTheDocument()
    expect(screen.getByText('Đã ghi nhận')).toBeInTheDocument()

    expect(calls.map((c) => c.url)).toEqual(
      expect.arrayContaining([
        '/manager/catalog',
        '/manager/catalog/5',
        '/manager/catalog/5/lineage',
      ])
    )
    client.clear()
  })

  it.each(['hr', 'academic', 'admissions'] as const)(
    'Manager tạo dataset %s bằng hệ thống nguồn đã chọn',
    async (domain) => {
      const code = { hr: 'PNS', academic: 'PDT', admissions: 'PTS' }[domain]
      const calls: InternalAxiosRequestConfig[] = []
      http.defaults.adapter = (config) => {
        calls.push(config)
        const data =
          config.url === '/manager/context'
            ? {
                ...hrContext,
                default_domain: domain,
                roles: [`${domain.toUpperCase()}_MANAGER`],
                domains: [{ domain, name: domain }],
                departments: [
                  { department_id: 1, department_code: code, department_name: 'Phòng phụ trách' },
                ],
              }
            : config.url === '/source-systems'
              ? [{ source_system_id: 42, source_name: 'Nguồn đã đăng ký', owner_department_id: 1 }]
              : { dataset_id: 8, dataset_name: 'Hồ sơ năm 2026' }
        return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
      }
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={client}>
          <ManagerCreateDatasetView />
        </QueryClientProvider>
      )
      fireEvent.change(await screen.findByLabelText('Tên bộ dữ liệu *'), {
        target: { value: 'Hồ sơ năm 2026' },
      })
      const save = screen.getByRole('button', { name: 'Lưu bộ dữ liệu' })
      expect(save).toBeDisabled()
      await screen.findByRole('option', { name: 'Nguồn đã đăng ký' })
      fireEvent.change(screen.getByLabelText('Hệ thống nguồn *'), { target: { value: '42' } })
      fireEvent.click(save)
      await waitFor(() => {
        const call = calls.find((item) => item.method === 'post' && item.url === '/datasets')
        expect(call).toBeDefined()
        expect(JSON.parse(String(call?.data))).toMatchObject({
          domain,
          source_system_id: 42,
          dataset_name: 'Hồ sơ năm 2026',
        })
      })
      client.clear()
    }
  )

  it.each(['', 'Tại sao tỷ lệ đạt học kỳ này giảm?'])(
    'Hỏi AI gửi câu hỏi trong domain được cấp với nội dung điền sẵn %j',
    async (initialQuestion) => {
      const suggestedQuestion = 'Cơ cấu nhân sự theo trạng thái làm việc hiện tại?'
      if (initialQuestion) mockSearchParams.set('q', initialQuestion)
      const calls: InternalAxiosRequestConfig[] = []
      http.defaults.adapter = (config) => {
        calls.push(config)
        const data =
          config.url === '/manager/context'
            ? hrContext
            : config.url === '/manager/history'
              ? [
                  {
                    id: 'q-100',
                    question: 'Số lượng giảng viên là bao nhiêu?',
                    status: 'COMPLETED',
                    created_at: '2026-11-18T11:00:00Z',
                  },
                ]
              : {
                  sql: 'SELECT value FROM manager_metrics',
                  rows: [{ value: 12 }],
                  answer: 'Có 12 bản ghi.',
                  truncated: false,
                }
        return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
      }
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={client}>
          <ManagerAiView />
        </QueryClientProvider>
      )
      const send = await screen.findByRole('button', { name: 'Gửi câu hỏi' })
      expect(screen.getByRole('textbox', { name: 'Câu hỏi về dữ liệu' })).toHaveValue(
        initialQuestion
      )
      expect(screen.getByRole('button', { name: 'Chat mới' })).toBeVisible()
      expect(
        await screen.findByRole('button', { name: 'Số lượng giảng viên là bao nhiêu?' })
      ).toBeVisible()
      expect(screen.queryByRole('link', { name: 'Lịch sử' })).not.toBeInTheDocument()
      expect(screen.queryByText(/64,5%/)).toBeNull()
      expect(calls.some((call) => call.url === '/nlq/ask')).toBe(false)
      fireEvent.click(
        initialQuestion ? send : screen.getByRole('button', { name: suggestedQuestion })
      )
      expect(await screen.findByText('Có 12 bản ghi.')).toBeInTheDocument()
      expect(JSON.parse(String(calls.find((call) => call.url === '/nlq/ask')?.data))).toEqual({
        question: initialQuestion || suggestedQuestion,
        domain: 'hr',
      })
      client.clear()
    }
  )

  it('ManagerAnalyticsView gọi /manager/analysis-options và truyền dimension_value cho /manager/analytics', async () => {
    const calls: InternalAxiosRequestConfig[] = []
    http.defaults.adapter = (config) => {
      calls.push(config)
      const data =
        config.url === '/manager/context'
          ? hrContext
          : config.url === '/manager/analysis-options'
            ? [
                {
                  domain: 'hr',
                  entity: 'employee',
                  metrics: [
                    { metric: 'record_count_by_employee_status', name: 'Phân bổ trạng thái' },
                    { metric: 'record_count_by_title', name: 'Phân bổ theo chức danh' },
                  ],
                },
              ]
            : { items: [], total: 0, limit: 20, offset: 0 }
      return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={client}>
        <ManagerAnalyticsView />
      </QueryClientProvider>
    )

    expect(await screen.findByText('Phân bổ theo chức danh')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm theo giá trị' }), {
      target: { value: 'CHINH_THUC' },
    })

    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.url === '/manager/analytics' &&
            (call.params as { dimension_value?: string }).dimension_value === 'CHINH_THUC'
        )
      ).toBe(true)
    )
    client.clear()
  })

  it('ManagerAiView gửi domain tới /nlq/ask và gọi /manager/history + /manager/history/{id}', async () => {
    const calls: InternalAxiosRequestConfig[] = []
    mockSearchParams = new URLSearchParams('tab=history')
    http.defaults.adapter = (config) => {
      calls.push(config)
      const data =
        config.url === '/manager/context'
          ? hrContext
          : config.url === '/manager/history'
            ? {
                items: [
                  {
                    id: 'q-101',
                    question: 'Cơ cấu nhân sự theo trạng thái làm việc hiện tại?',
                    status: 'COMPLETED',
                    domain: 'hr',
                    duration_ms: 1420,
                    row_count: 2,
                    created_at: '2026-11-18T11:00:00Z',
                    error_code: null,
                  },
                ],
                total: 1,
                limit: 20,
                offset: 0,
              }
            : config.url === '/manager/history/q-101'
              ? {
                  id: 'q-101',
                  question: 'Cơ cấu nhân sự theo trạng thái làm việc hiện tại?',
                  status: 'COMPLETED',
                  domain: 'hr',
                  duration_ms: 1420,
                  row_count: 2,
                  created_at: '2026-11-18T11:00:00Z',
                  sql: 'SELECT employee_status, COUNT(*) FROM gold_hr GROUP BY 1',
                  answer: 'Nhân sự chính thức chiếm 290 người.',
                  rows: [{ employee_status: 'CHINH_THUC', total: 290 }],
                }
              : { sql: '', rows: [] }
      return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={client}>
        <ManagerAiView />
      </QueryClientProvider>
    )

    expect(
      await screen.findByText('Cơ cấu nhân sự theo trạng thái làm việc hiện tại?')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xem kết quả' }))
    expect(await screen.findByText('Nhân sự chính thức chiếm 290 người.')).toBeInTheDocument()
    expect(
      screen.getByText('SELECT employee_status, COUNT(*) FROM gold_hr GROUP BY 1')
    ).toBeInTheDocument()
    expect(calls.map((c) => c.url)).toEqual(
      expect.arrayContaining(['/manager/history', '/manager/history/q-101'])
    )
    client.clear()
  })
})
