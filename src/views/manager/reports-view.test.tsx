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
  needs_department_assignment: false,
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
const dataset = {
  dataset_id: 31,
  dataset_code: 'HR_31',
  dataset_name: 'Báo cáo nhân sự',
  domain: 'hr',
  owner_department_id: 7,
  description: 'Nguồn được cấp quyền',
  sources: [
    {
      scope: 'nguon-nhan-su',
      silver_snapshot_id: 'silver-1',
      job_id: 'gold-1',
      sync_status: 'CURRENT',
      finished_at: '2026-11-16T01:00:00Z',
      error_code: null,
    },
  ],
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
  mode: 'overview' | 'analytics' | 'datasets' | 'issues' = 'overview',
  handler?: (config: InternalAxiosRequestConfig) => unknown
) {
  const calls: InternalAxiosRequestConfig[] = []
  const responses: Record<string, unknown> = {
    '/manager/context': context(),
    '/manager/overview': overview,
    '/manager/analytics': page([metric]),
    '/manager/datasets': page([dataset]),
    '/manager/datasets/31': dataset,
    '/manager/issues': [issue],
    '/manager/issues/stats': { total: 1, assigned: 1, pending_verification: 0, verified: 0 },
    '/manager/issues/issue-1': {
      ...issue,
      quarantine_records: [],
      quarantine_record_ids: [],
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
    '/pipeline/gold/recipes': { dimensions: { hr: { employee: ['employee_status'] } } },
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
      config.url === '/manager/context' ? context(domain, code) : overview
    )
    expect(await screen.findByText('1.234')).toBeInTheDocument()
    expect(calls.find((call) => call.url === '/manager/overview')?.params).toMatchObject({ domain })
    expect(screen.queryByText('4.520')).not.toBeInTheDocument()
    client.clear()
  })

  it('không gọi API dữ liệu khi chưa có phân công', async () => {
    const { calls, client } = setup('overview', () => ({
      ...context(),
      departments: [],
      needs_department_assignment: true,
    }))
    expect(await screen.findByText('Cần phân công đang hiệu lực')).toBeInTheDocument()
    expect(calls.map((call) => call.url)).toEqual(['/manager/context'])
    client.clear()
  })

  it('hiển thị trạng thái chờ và danh sách rỗng, không giả KPI bằng 0', async () => {
    const { client } = setup('overview', (config) =>
      config.url === '/manager/context'
        ? context()
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
      config.url === '/manager/context' ? context() : { ...overview, kpis: page([metric], 21) }
    )
    await screen.findByText('1.234')
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
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

  it('đổi phép nhóm gọi đúng entity và metric, giữ nguyên nhóm thiếu thông tin', async () => {
    const { calls, client } = setup('analytics', (config) => {
      if (config.url === '/manager/context') return context()
      if (config.url === '/pipeline/gold/recipes')
        return { dimensions: { hr: { employee: ['employee_status'] } } }
      return page([{ ...metric, dimensions: { employee_status: null }, value: 7 }])
    })
    const entity = await screen.findByLabelText('Loại dữ liệu')
    await within(entity).findByRole('option', { name: 'Nhân sự' })
    fireEvent.change(entity, { target: { value: 'employee' } })
    fireEvent.change(screen.getByLabelText('Thống kê'), {
      target: { value: 'record_count_by_employee_status' },
    })
    expect(await screen.findByText('Chưa có thông tin')).toBeInTheDocument()
    expect(
      calls.some(
        (call) =>
          call.url === '/manager/analytics' &&
          (call.params as { metric: string }).metric === 'record_count_by_employee_status'
      )
    ).toBe(true)
    client.clear()
  })

  it('tải chi tiết bộ dữ liệu khi được chọn', async () => {
    const { calls, client } = setup('datasets')
    fireEvent.click(await screen.findByRole('button', { name: 'Xem Báo cáo nhân sự' }))
    expect(await screen.findByText('Đã đồng bộ')).toBeInTheDocument()
    expect(calls.some((call) => call.url === '/manager/datasets/31')).toBe(true)
    client.clear()
  })

  it('tải yêu cầu sửa và mở đúng trang chi tiết', async () => {
    const { calls, client } = setup('issues')
    expect(await screen.findByRole('link', { name: 'Xem yêu cầu' })).toHaveAttribute(
      'href',
      '/manager/quality-issues/issue-1'
    )
    expect(calls.some((call) => call.url === '/manager/issues/stats')).toBe(true)
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
    expect(within(alert).getByText(/Cần phân công đang hiệu lực/)).toBeInTheDocument()
    expect(screen.queryByText('1.234')).not.toBeInTheDocument()
    client.clear()
  })
})
