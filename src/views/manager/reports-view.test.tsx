import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { ManagerReportsView } from './reports-view'

import type { InternalAxiosRequestConfig } from 'axios'

vi.mock('next/image', () => ({ default: () => null }))

const originalAdapter = http.defaults.adapter
const context = (domain = 'hr', code = 'PNS') => ({
  user_id: 11,
  roles: [`${domain.toUpperCase()}_MANAGER`],
  domains: [
    {
      domain,
      name: domain === 'hr' ? 'Nhân sự' : domain === 'academic' ? 'Đào tạo' : 'Tuyển sinh',
    },
  ],
  departments: [{ department_id: 7, department_code: code, department_name: 'Phòng phụ trách' }],
  default_domain: domain,
  needs_department_configuration: false,
  data_layer: 'GOLD',
  note: '',
})
const metric = {
  dataset_id: 31,
  dataset_name: 'Báo cáo nhân sự',
  domain: 'hr',
  scope: 'nguon-nhan-su',
  gold_snapshot_id: 'gold-1',
  silver_snapshot_id: 'silver-1',
  recipe_version: 'group-counts-v1',
  finished_at: '2026-11-16T01:00:00Z',
  entity: 'employee',
  metric: 'record_count',
  dimensions: {},
  value: 1234,
  unit: 'records',
}
const page = (items: unknown[], total = items.length) => ({ items, total, limit: 20, offset: 0 })
const overview = {
  data_layer: 'GOLD',
  status: 'READY',
  datasets: 1,
  sources: { total: 1, current: 1, failed: 0 },
  last_updated_at: '2026-11-16T01:00:00Z',
  kpis: page([metric]),
  issues: { total: 3, assigned: 1, pending_verification: 1, verified: 1 },
}
const issue = {
  issue_id: 'issue-1',
  dataset_id: 31,
  department_id: 7,
  domain: 'hr',
  department_name: 'Phòng nhân sự',
  title: 'Sửa hồ sơ nhân sự',
  description: 'Thiếu trạng thái nhân sự',
  status: 'ASSIGNED',
  created_by: 1,
  assignee_user_id: 12,
  assignment_mode: 'DEPARTMENT',
  origin_upload_job_id: null,
  resolution_job_id: null,
  verification_run_id: null,
  created_at: '2026-11-16T01:00:00Z',
  updated_at: '2026-11-16T01:00:00Z',
}

function setup(
  mode: 'overview' | 'issues' = 'overview',
  handler?: (config: InternalAxiosRequestConfig) => unknown
) {
  const calls: InternalAxiosRequestConfig[] = []
  const responses: Record<string, unknown> = {
    '/manager/context': context(),
    '/manager/overview': overview,
    '/manager/analytics': page([metric]),
    '/manager/issues': [issue],
    '/manager/issues/stats': { total: 1, assigned: 1, pending_verification: 0, verified: 0 },
    '/manager/issues/issue-1': {
      ...issue,
      quarantine_records: [
        {
          record_id: 'qr-1',
          cleaning_run_id: 'run-1',
          ingestion_job_id: 105,
          locator: 'hr_employees_q4.csv:row:18',
          record_position: 17,
          bronze_version: 'v1',
          error_codes: ['REQUIRED_VALUE_MISSING'],
          entity: 'employee',
          source_table: 'hr_employees_q4.csv',
        },
      ],
      quarantine_record_ids: ['qr-1'],
      history: [
        {
          event_id: 1,
          actor_id: 1,
          event_type: 'ASSIGNED',
          from_status: null,
          to_status: 'ASSIGNED',
          details: {},
          created_at: issue.created_at,
        },
      ],
    },
  }
  http.defaults.adapter = (config) => {
    calls.push(config)
    const data = handler ? handler(config) : responses[config.url ?? '']
    if (data instanceof AxiosError) return Promise.reject(data)
    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const view = render(
    <QueryClientProvider client={client}>
      <ManagerReportsView mode={mode} />
    </QueryClientProvider>
  )
  return { calls, client, ...view }
}

afterEach(() => {
  http.defaults.adapter = originalAdapter
})

describe('ManagerReportsView', () => {
  it.each([
    ['hr', 'PNS'],
    ['academic', 'PDT'],
    ['admissions', 'PTS'],
  ])('dùng phạm vi %s do backend trả, hiển thị số liệu thật', async (domain, code) => {
    const { calls, client } = setup('overview', (config) =>
      config.url === '/manager/context'
        ? context(domain, code)
        : config.url === '/manager/analytics'
          ? page([])
          : overview
    )
    expect(await screen.findByText('1.234')).toBeInTheDocument()
    expect(calls.find((call) => call.url === '/manager/overview')?.params).toMatchObject({ domain })
    expect(screen.queryByText('4.520')).not.toBeInTheDocument()
    client.clear()
  })

  it('role xác định phòng và không yêu cầu phân công nhân sự', async () => {
    const { client } = setup('overview', (config) =>
      config.url === '/manager/context'
        ? { ...context(), needs_department_assignment: true, needs_department_configuration: false }
        : config.url === '/manager/analytics'
          ? page([])
          : overview
    )
    expect(await screen.findByText('1.234')).toBeInTheDocument()
    expect(screen.queryByText('Cần cấu hình phòng theo vai trò')).not.toBeInTheDocument()
    expect(screen.queryByText(/Một số lĩnh vực chưa có phân công/)).not.toBeInTheDocument()
    client.clear()
  })

  it('không gọi API dữ liệu khi phòng theo vai trò chưa được cấu hình', async () => {
    const { calls, client } = setup('overview', () => ({
      ...context(),
      departments: [],
      needs_department_configuration: true,
    }))
    expect(await screen.findByText('Cần cấu hình phòng theo vai trò')).toBeInTheDocument()
    expect(calls.map((call) => call.url)).toEqual(['/manager/context'])
    client.clear()
  })

  it('hiển thị trạng thái chờ và danh sách rỗng, không giả KPI bằng 0', async () => {
    const { client } = setup('overview', (config) =>
      config.url === '/manager/context'
        ? context()
        : config.url === '/manager/analytics'
          ? page([])
          : {
              ...overview,
              status: 'PENDING',
              last_updated_at: null,
              kpis: page([]),
              sources: { total: 1, current: 0, failed: 0 },
            }
    )
    expect(await screen.findByText('Chưa có báo cáo hiện hành')).toBeInTheDocument()
    expect(screen.getByText('Chưa có chỉ số phù hợp')).toBeInTheDocument()
    expect(screen.queryByText('1.234')).not.toBeInTheDocument()
    client.clear()
  })

  it('phân trang theo total từ API', async () => {
    const { calls, client } = setup('overview', (config) =>
      config.url === '/manager/context'
        ? context()
        : config.url === '/manager/analytics'
          ? page([])
          : { ...overview, kpis: page([metric], 21) }
    )
    await screen.findByText('1.234')
    fireEvent.click(screen.getAllByRole('button', { name: 'Trang sau' })[0]!)
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.url === '/manager/overview' && (call.params as { offset: number }).offset === 20
        )
      ).toBe(true)
    )
    client.clear()
  })

  it('gộp biểu đồ cố định vào tổng quan và không gọi API quản trị hoặc hồ sơ chi tiết', async () => {
    const { calls, client } = setup('overview')
    expect(await screen.findByText('Nhân sự theo trạng thái')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.url === '/manager/analytics' &&
            call.params.metric === 'record_count_by_employee_status'
        )
      ).toBe(true)
    )
    expect(
      calls.every(
        (call) =>
          !call.url?.includes('/datasets') &&
          !call.url?.includes('/records') &&
          !call.url?.includes('/recipes')
      )
    ).toBe(true)
    expect(screen.queryByText('Phân tích sâu hơn với AI')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Hỏi UniLake AI để phân tích thêm' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Theo dõi chất lượng dữ liệu' })).toHaveAttribute(
      'href',
      '/manager/quality-issues'
    )
    client.clear()
  })

  it('tải yêu cầu sửa, thống kê, hồ sơ cách ly và lọc theo assignee_user_id từ manager API', async () => {
    const { calls, client } = setup('issues')
    fireEvent.click(await screen.findByRole('button', { name: 'Xem yêu cầu' }))
    expect(await screen.findByText('Thiếu trạng thái nhân sự')).toBeInTheDocument()
    expect(screen.getByText('hr_employees_q4.csv')).toBeInTheDocument()
    expect(screen.getByText('hr_employees_q4.csv:row:18')).toBeInTheDocument()
    expect(screen.getByText('Lịch sử xử lý')).toBeInTheDocument()
    expect(calls.some((call) => call.url === '/manager/issues/stats')).toBe(true)
    expect(calls.some((call) => call.url === '/manager/issues/issue-1')).toBe(true)

    fireEvent.change(screen.getByLabelText('Lọc theo ID nhân viên phụ trách'), {
      target: { value: '12' },
    })
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.url === '/manager/issues' &&
            (call.params as { assignee_user_id?: number }).assignee_user_id === 12
        )
      ).toBe(true)
    )
    client.clear()
  })

  it('không tiếp tục hiển thị số liệu khi API trả 403', async () => {
    const { client } = setup('overview', (config) =>
      config.url === '/manager/context'
        ? context()
        : new AxiosError('forbidden', 'ERR_BAD_REQUEST', config, undefined, {
            status: 403,
            statusText: 'Forbidden',
            config,
            headers: new AxiosHeaders(),
            data: { error: { code: 'MANAGER_SCOPE_REQUIRED' } },
          })
    )
    const alert = await screen.findByRole('alert')
    expect(
      within(alert).getByText(/Vai trò quản lý hoặc cấu hình phòng phụ trách chưa phù hợp/)
    ).toBeInTheDocument()
    expect(screen.queryByText('1.234')).not.toBeInTheDocument()
    client.clear()
  })
})
