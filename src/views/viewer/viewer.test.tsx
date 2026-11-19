import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'
import type { InternalAxiosRequestConfig } from 'axios'
import { DomainProvider } from '@/hooks/use-domain'

import { ViewerDomainsView } from './viewer-domains-view'
import { ViewerOverviewView } from './viewer-overview-view'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('domain=academic'),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const originalAdapter = http.defaults.adapter

const mockContext = {
  user_id: 99,
  username: 'executive_user',
  full_name: 'Người xem điều hành',
  roles: ['VIEWER'],
  domains: [
    { domain: 'academic', name: 'Đào tạo' },
    { domain: 'hr', name: 'Nhân sự' },
    { domain: 'admissions', name: 'Tuyển sinh' },
  ],
}

const mockOverview = {
  datasets: 12,
  sources: 18,
  ready_domains: 2,
  domains: {
    academic: { status: 'READY', datasets: 5, sources: 8, last_updated_at: '2026-11-18T10:00:00Z' },
    hr: { status: 'READY', datasets: 4, sources: 6, last_updated_at: '2026-11-17T08:00:00Z' },
    admissions: { status: 'PARTIAL', datasets: 3, sources: 4, last_updated_at: null },
  },
}

const mockQualityOverview = {
  quality: { total: 6, assigned: 2, pending_verification: 1, verified: 3 },
  publication: {
    total_sources: 18,
    gold_ready: 14,
    datasets_without_scope: 1,
    gold_job_failed: 1,
    sync_failed: 0,
  },
  freshness: {
    academic: '2026-11-18T10:00:00Z',
    hr: '2026-11-17T08:00:00Z',
    admissions: null,
  },
}

const mockIssues = {
  items: [
    {
      issue_id: 'ISSUE-101',
      dataset_id: 1,
      dataset_name: 'Dữ liệu sinh viên',
      department_id: 10,
      department_name: 'Phòng Đào tạo',
      domain: 'academic',
      title: 'Thiếu mã ngành học',
      description: 'Cần bổ sung mã ngành theo chuẩn mới',
      status: 'ASSIGNED',
      created_at: '2026-11-18T09:00:00Z',
      updated_at: '2026-11-18T09:00:00Z',
    },
  ],
  total: 1,
  limit: 10,
  offset: 0,
}

const mockDomainOverviewAcademic = {
  domain: 'academic',
  status: 'READY',
  last_updated_at: '2026-11-18T10:00:00Z',
  highlight_metric: {
    dataset_id: 1,
    scope: 'academic_core',
    entity: 'student',
    value: 14250,
    unit: 'records',
  },
  message: null,
}

const mockDomainAnalytics = {
  items: [
    {
      dataset_id: 1,
      dataset_name: 'Hồ sơ sinh viên',
      domain: 'academic',
      scope: 'academic_scope',
      entity: 'student',
      metric: 'record_count',
      dimensions: { program: 'Chính quy' },
      value: 12500,
      unit: 'records',
      finished_at: '2026-11-18T10:00:00Z',
    },
    {
      dataset_id: 1,
      dataset_name: 'Hồ sơ sinh viên',
      domain: 'academic',
      scope: 'academic_scope',
      entity: 'student',
      metric: 'record_count',
      dimensions: { program: 'Chất lượng cao' },
      value: 1750,
      unit: 'records',
      finished_at: '2026-11-18T10:00:00Z',
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
}

const mockDatasets = {
  items: [
    {
      dataset_id: 1,
      name: 'Bộ dữ liệu sinh viên',
      domain: 'academic',
      department_name: 'Phòng Đào tạo',
      department_id: 10,
      description: 'Toàn bộ sinh viên đang theo học',
      status: 'ACTIVE',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-18T10:00:00Z',
    },
  ],
  total: 1,
  limit: 10,
  offset: 0,
}

const mockDatasetDetail = {
  dataset_id: 1,
  name: 'Bộ dữ liệu sinh viên',
  domain: 'academic',
  department_name: 'Phòng Đào tạo',
  department_id: 10,
  description: 'Toàn bộ sinh viên đang theo học',
  status: 'ACTIVE',
  tables: [
    {
      table_name: 'dim_student',
      columns: [
        { name: 'student_id', type: 'varchar', nullable: false, description: 'Mã số sinh viên' },
        { name: 'full_name', type: 'varchar', nullable: false, description: 'Họ và tên' },
      ],
    },
  ],
}

function setupAdapter() {
  const calls: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = (config) => {
    calls.push(config)
    const url = config.url ?? ''
    let data: unknown = {}

    if (url === '/viewer/context') data = mockContext
    else if (url === '/viewer/overview') data = mockOverview
    else if (url === '/viewer/quality/overview') data = mockQualityOverview
    else if (url === '/viewer/quality/issues') data = mockIssues
    else if (url.includes('/viewer/domains/academic/overview')) data = mockDomainOverviewAcademic
    else if (url.includes('/viewer/domains/academic/analytics')) data = mockDomainAnalytics
    else if (url === '/viewer/datasets') data = mockDatasets
    else if (url === '/viewer/datasets/1') data = mockDatasetDetail

    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
  }
  return calls
}

afterEach(() => {
  http.defaults.adapter = originalAdapter
})

describe('Viewer UI & API Suite', () => {
  it('hiển thị đầy đủ tổng quan điều hành toàn trường với các số liệu từ API', async () => {
    const calls = setupAdapter()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <ViewerOverviewView />
      </QueryClientProvider>
    )

    // Kiểm tra tiêu đề trang
    expect(await screen.findByText('Tổng quan điều hành dữ liệu')).toBeInTheDocument()

    // 4 KPI cards
    expect(await screen.findByText('12')).toBeInTheDocument() // datasets
    expect(screen.getByText('18')).toBeInTheDocument() // sources
    expect(screen.getByText('2 / 3')).toBeInTheDocument() // ready_domains
    expect(screen.getAllByText('6').length).toBeGreaterThan(0) // total quality issues and sources

    // 3 Phân hệ
    expect(screen.getAllByText('Đào tạo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nhân sự').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tuyển sinh').length).toBeGreaterThan(0)

    // Yêu cầu chất lượng
    expect(screen.getByText('Thiếu mã ngành học')).toBeInTheDocument()

    // Kiểm tra API đã được gọi đúng đường dẫn
    expect(calls.some((c) => c.url === '/viewer/context')).toBe(true)
    expect(calls.some((c) => c.url === '/viewer/overview')).toBe(true)
    expect(calls.some((c) => c.url === '/viewer/quality/overview')).toBe(true)
    expect(calls.some((c) => c.url === '/viewer/quality/issues')).toBe(true)
  })

  it('hiển thị dashboard theo phân hệ, highlight_metric và xem chi tiết dataset', async () => {
    const calls = setupAdapter()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <ViewerDomainsView />
      </QueryClientProvider>
    )

    // Tiêu đề phân hệ
    expect(await screen.findByText('Phân tích dữ liệu Đào tạo')).toBeInTheDocument()

    // Highlight metric
    expect(await screen.findByText(/14.250/)).toBeInTheDocument()

    // Analytics data
    expect(await screen.findByText('program: Chính quy')).toBeInTheDocument()
    expect(screen.getByText('12.500')).toBeInTheDocument()

    // Metadata dataset
    expect(screen.getByText('Bộ dữ liệu sinh viên')).toBeInTheDocument()

    // Click xem bảng & cột
    const detailBtn = screen.getByRole('button', { name: /Xem bảng & cột/i })
    fireEvent.click(detailBtn)

    // Drawer xuất hiện và gọi API dataset detail
    expect(await screen.findByText('dim_student')).toBeInTheDocument()
    expect(screen.getByText('student_id')).toBeInTheDocument()
    expect(screen.getByText('Họ và tên')).toBeInTheDocument()

    expect(calls.some((c) => c.url === '/viewer/datasets/1')).toBe(true)
  })

  it('thay đổi giao diện khi chuyển đổi phân hệ (Đào tạo / Nhân sự / Tuyển sinh)', async () => {
    setupAdapter()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <DomainProvider>
          <ViewerOverviewView />
        </DomainProvider>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Tổng quan điều hành dữ liệu')).toBeInTheDocument()

    // Click vào nút chuyển phân hệ "Đào tạo" trên thanh phân hệ
    const academicBtns = screen.getAllByRole('button', { name: /Đào tạo/i })
    fireEvent.click(academicBtns[0])

    // Tiêu đề thay đổi sang phân hệ Đào tạo
    expect(await screen.findByText('Tổng quan phân hệ Đào tạo')).toBeInTheDocument()

    // Xuất hiện chỉ số tiêu điểm Gold của phân hệ Đào tạo
    expect(await screen.findByText('Chỉ số tiêu điểm Gold')).toBeInTheDocument()
    expect(screen.getByText(/14.250/)).toBeInTheDocument()
  })
})
