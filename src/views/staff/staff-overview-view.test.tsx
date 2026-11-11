import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { StaffOverviewView } from './staff-overview-view'

import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

function makeError(status: number, data: unknown, config: InternalAxiosRequestConfig) {
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: 'Error',
    headers: new AxiosHeaders(),
    config,
    data,
  })
}

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <StaffOverviewView />
      </QueryClientProvider>
    ),
  }
}

describe('StaffOverviewView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it.each([
    {
      role: 'HR_STAFF',
      domain: 'hr',
      domainName: 'Nhân sự',
      departmentName: 'Phòng Tổ chức Nhân sự',
      username: 'hr_staff_1',
    },
    {
      role: 'ACADEMIC_STAFF',
      domain: 'academic',
      domainName: 'Đào tạo',
      departmentName: 'Phòng Đào tạo',
      username: 'academic_staff_1',
    },
    {
      role: 'ADMISSIONS_STAFF',
      domain: 'admissions',
      domainName: 'Tuyển sinh',
      departmentName: 'Phòng Tuyển sinh',
      username: 'admissions_staff_1',
    },
  ])(
    'hiển thị đúng ngữ cảnh cho $role ($domain)',
    async ({ role, domain, domainName, departmentName, username }) => {
      http.defaults.adapter = (config) => {
        const key = `${config.method} ${config.url}`
        const map: Record<string, unknown> = {
          'get /staff/context': {
            user_id: 10,
            username,
            roles: [role],
            domains: [{ domain, name: domainName }],
            default_domain: domain,
            departments: [
              {
                department_id: 3,
                department_code: domain.toUpperCase(),
                department_name: departmentName,
              },
            ],
            can_upload: true,
            can_resolve_issues: true,
            can_manage_silver: false,
            needs_department_assignment: false,
            accepted_extensions: ['.csv', '.xlsx', '.xlsm'],
            max_file_bytes: 52428800,
            max_records: 1000000,
            note: 'Chỉ người được giao mới được báo đã sửa',
          },
          'get /ingestion/jobs/stats': {
            total: 12,
            queued: 1,
            running: 2,
            success: 7,
            failed: 1,
            retry_wait: 1,
          },
          'get /ingestion/jobs': [],
          'get /data-quality-issues/stats': {
            total: 4,
            assigned: 2,
            pending_verification: 1,
            verified: 1,
          },
          'get /data-quality-issues': [],
        }
        return Promise.resolve({
          data: map[key],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }

      const { client } = renderWithClient()
      try {
        expect(await screen.findByText(username)).toBeInTheDocument()
        expect(screen.getByText(domainName)).toBeInTheDocument()
        expect(screen.getByText(departmentName)).toBeInTheDocument()
        expect(await screen.findByText('12')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Nạp dữ liệu' })).toHaveAttribute(
          'href',
          '/staff/upload'
        )
        expect(screen.getByRole('link', { name: 'Yêu cầu dữ liệu lỗi' })).toHaveAttribute(
          'href',
          '/staff/quality-issues'
        )
      } finally {
        client.clear()
      }
    }
  )

  it('hiển thị thông báo phân công phòng ban khi needs_department_assignment=true', async () => {
    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: {
            user_id: 11,
            username: 'hr_unassigned',
            roles: ['HR_STAFF'],
            domains: [{ domain: 'hr', name: 'Nhân sự' }],
            default_domain: 'hr',
            departments: [],
            can_upload: true,
            can_resolve_issues: false,
            can_manage_silver: false,
            needs_department_assignment: true,
            accepted_extensions: ['.csv', '.xlsx', '.xlsm'],
            max_file_bytes: 52428800,
            max_records: 1000000,
            note: 'Cần phân công phòng ban đang hiệu lực để nhận và báo sửa dữ liệu',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key.includes('stats')) {
        return Promise.resolve({
          data: {
            total: 0,
            queued: 0,
            running: 0,
            success: 0,
            failed: 0,
            retry_wait: 0,
            assigned: 0,
            pending_verification: 0,
            verified: 0,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderWithClient()
    try {
      expect(
        await screen.findByText('Cần phân công phòng ban đang hiệu lực để nhận và báo sửa dữ liệu')
      ).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })

  it('hiển thị trạng thái từ chối truy cập khi /staff/context trả về 403', async () => {
    const adapter: AxiosAdapter = (config) =>
      Promise.reject(makeError(403, { error: { code: 'FORBIDDEN' } }, config))
    http.defaults.adapter = adapter

    const { client } = renderWithClient()
    try {
      expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })

  it('hiển thị lỗi và nút Thử lại khi máy chủ trả 503', async () => {
    const adapter: AxiosAdapter = (config) =>
      Promise.reject(makeError(503, { error: { code: 'STAFF_CONTEXT_UNAVAILABLE' } }, config))
    http.defaults.adapter = adapter

    const { client } = renderWithClient()
    try {
      expect(
        await screen.findByText(
          'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
          {},
          { timeout: 3000 }
        )
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
