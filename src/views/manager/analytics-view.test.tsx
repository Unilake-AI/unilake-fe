import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { ManagerAnalyticsView } from './analytics-view'

import type { InternalAxiosRequestConfig } from 'axios'

vi.mock('next/image', () => ({ default: () => null }))
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
})

describe('ManagerAnalyticsView', () => {
  it.each([
    {
      shape: 'danh sách theo thực thể',
      options: [
        {
          domain: 'hr',
          entity: 'employee',
          metrics: [
            { metric: 'record_count_by_employee_status', name: 'Phân bổ trạng thái' },
            { metric: 'record_count_by_gender', name: 'Phân bổ theo giới tính' },
          ],
        },
      ],
      metricLabel: 'Phân bổ theo giới tính',
    },
    {
      shape: 'danh sách phẳng từ backend',
      options: [
        { entity: 'employee', metric: 'record_count_by_employee_status' },
        { entity: 'employee', metric: 'record_count_by_gender' },
      ],
      metricLabel: 'Số bản ghi theo giới tính',
    },
  ])(
    'ManagerAnalyticsView tải chỉ số từ $shape và áp dụng bộ lọc',
    async ({ options, metricLabel }) => {
      const calls: InternalAxiosRequestConfig[] = []
      const filteredMetric = {
        dataset_id: 31,
        dataset_name: 'Báo cáo nhân sự',
        domain: 'hr',
        scope: 'nguon-nhan-su',
        gold_snapshot_id: 'gold-1',
        silver_snapshot_id: 'silver-1',
        recipe_version: 'group-counts-v1',
        finished_at: '2026-11-16T01:00:00Z',
        entity: 'employee',
        metric: 'record_count_by_gender',
        dimensions: { gender: 'NU' },
        value: 12,
        unit: 'records',
      }
      http.defaults.adapter = (config) => {
        calls.push(config)
        const items = config.params?.dimension_value === 'NU' ? [filteredMetric] : []
        const data =
          config.url === '/manager/context'
            ? hrContext
            : config.url === '/manager/analysis-options'
              ? options
              : { items, total: items.length, limit: 20, offset: 0 }
        return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
      }

      const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
      render(
        <QueryClientProvider client={client}>
          <ManagerAnalyticsView />
        </QueryClientProvider>
      )

      expect(await screen.findByRole('option', { name: metricLabel })).toBeInTheDocument()
      const metricSelect = screen.getByLabelText('Chỉ số')
      expect(metricSelect).toHaveValue('record_count_by_employee_status')
      fireEvent.change(metricSelect, {
        target: { value: 'record_count_by_gender' },
      })
      fireEvent.change(screen.getByLabelText('Lọc theo giá trị chiều'), {
        target: { value: 'NU' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Lọc' }))

      await waitFor(() =>
        expect(
          calls.some(
            (call) =>
              call.url === '/manager/analytics' &&
              call.params.metric === 'record_count_by_gender' &&
              call.params.dimension_value === 'NU'
          )
        ).toBe(true)
      )
      expect(await screen.findByText('Phân bổ số lượng bản ghi')).toBeInTheDocument()
      expect(screen.getByText('Cơ cấu tỷ lệ')).toBeInTheDocument()
      expect(screen.getByText('12 bản ghi')).toBeInTheDocument()
      client.clear()
    }
  )
})
