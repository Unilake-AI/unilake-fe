import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'
import type { QuarantineRecord } from '@/types/quarantine'

import { QuarantineView } from './quarantine-view'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function record(position: number, job = 20, owner: number | null = 7): QuarantineRecord {
  return {
    record_id: `00000000-0000-4000-8000-${String(position).padStart(12, '0')}`,
    cleaning_run_id:
      job === 20 ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    ingestion_job_id: job,
    dataset_id: 4,
    domain: 'hr',
    entity: 'employee',
    owner_department_id: owner,
    record_position: position,
    locator: `sheet:employees:row:${position + 1}`,
    bronze_version: 'version-1',
    error_codes: ['DATE_FORMAT_INVALID'],
  }
}

function environment(pages: QuarantineRecord[][], reject = false) {
  const calls: { method: string; url: string; body?: unknown; params?: unknown }[] = []
  http.defaults.adapter = async (config) => {
    await Promise.resolve()
    calls.push({
      method: config.method ?? '',
      url: config.url ?? '',
      body: config.data ? JSON.parse(String(config.data)) : undefined,
      params: config.params,
    })
    let data: unknown = []
    if (config.url === '/quarantine-records')
      data = pages[Math.floor(Number(config.params?.offset ?? 0) / 20)] ?? []
    else if (config.url === '/quarantine-records/summary')
      data = {
        total_records: pages.flat().length,
        by_dataset: [],
        by_owner_department: [],
        by_error_code: [],
      }
    else if (config.url === '/data-quality-issues/return-preview')
      data = {
        assignee: { user_id: 14, username: 'hr_staff', full_name: 'Nhân viên HR' },
        department: { department_id: 7, department_code: 'PNS', department_name: 'Phòng Nhân sự' },
        source_table: 'employees.csv',
        origin_upload_job_id: 20,
        existing_issue_id: 'old-issue',
        note: 'Chưa giao việc; cần quản trị duyệt gửi.',
      }
    else if (config.url === '/data-quality-issues/departments')
      data = [
        { department_id: 7, department_code: 'PNS', department_name: 'Phòng Nhân sự' },
        { department_id: 8, department_code: 'PDT', department_name: 'Phòng Đào tạo' },
      ]
    else if (config.url === '/data-quality-issues/assignees')
      data = [{ user_id: 14, username: 'hr_staff', full_name: 'Nhân viên HR' }]
    else if (
      (config.url === '/data-quality-issues' ||
        config.url === '/data-quality-issues/return-to-uploader') &&
      config.method === 'post'
    ) {
      if (reject)
        throw new AxiosError('forbidden', 'ERR_BAD_RESPONSE', config, undefined, {
          status: 403,
          statusText: 'Forbidden',
          headers: new AxiosHeaders(),
          config,
          data: {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Bạn không được giao yêu cầu này' },
          },
        })
      data = {
        ...JSON.parse(String(config.data)),
        issue_id: 'new-issue',
        status: 'ASSIGNED',
        assignment_mode: config.url.endsWith('/return-to-uploader')
          ? 'SOURCE_UPLOADER'
          : 'DEPARTMENT',
      }
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <QuarantineView />
    </QueryClientProvider>
  )
  return { client, calls, user: userEvent.setup() }
}

describe('Giao hồ sơ cách ly về phòng ban', () => {
  const adapter = http.defaults.adapter
  afterEach(() => {
    http.defaults.adapter = adapter
  })

  it('chọn đúng nhóm trên trang, lấy người nhận theo phòng và gửi API với các hồ sơ đã chọn', async () => {
    const { client, calls, user } = environment([[record(1), record(2), record(3, 21)]])
    try {
      const send = screen.getByRole('button', { name: 'Gửi yêu cầu sửa về phòng ban' })
      expect(send).toBeDisabled()
      await screen.findByRole('button', { name: 'Dòng 1' })
      await user.click(
        screen.getByRole('checkbox', { name: 'Chọn hồ sơ cùng lượt trên trang này' })
      )
      expect(screen.getByText('Đã chọn 2 hồ sơ cách ly')).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Chọn hồ sơ dòng 3, lần nạp 21' })).toBeDisabled()
      await user.click(send)
      await user.click(screen.getByRole('radio', { name: 'Chọn phòng ban và người phụ trách' }))
      expect(screen.getByLabelText('2. Phòng ban phụ trách *')).toHaveValue('7')
      expect(screen.queryByRole('option', { name: 'Phòng Đào tạo (PDT)' })).not.toBeInTheDocument()
      await screen.findByRole('option', { name: 'Nhân viên HR (@hr_staff)' })
      await user.selectOptions(screen.getByLabelText('3. Người phụ trách (tùy chọn)'), '14')
      await user.type(
        screen.getByLabelText('Mô tả chi tiết'),
        'Kiểm tra ngày vào làm theo file nguồn.'
      )
      await user.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }))
      expect(await screen.findByText(/Đã tạo yêu cầu.*và giao cho phòng ban/)).toBeInTheDocument()
      expect(calls.find((c) => c.url.endsWith('/assignees'))?.params).toEqual(
        expect.objectContaining({ department_id: 7, domain: 'hr' })
      )
      expect(
        calls.find((c) => c.url === '/data-quality-issues' && c.method === 'post')?.body
      ).toEqual({
        title: 'Kiểm tra và sửa dữ liệu nguồn',
        description: 'Kiểm tra ngày vào làm theo file nguồn.',
        department_id: 7,
        assignee_user_id: 14,
        quarantine_record_ids: [record(1).record_id, record(2).record_id],
      })
      expect(screen.getByText('Đã chọn 0 hồ sơ cách ly')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Theo dõi và phân công yêu cầu' })).toHaveAttribute(
        'href',
        '/data/quality'
      )
      expect(calls.filter((c) => c.url === '/quarantine-records')).toHaveLength(1)
    } finally {
      client.clear()
    }
  })

  it('giữ nguyên lựa chọn và thông tin khi API từ chối, không báo gửi thành công', async () => {
    const { client, calls, user } = environment([[record(1, 20, null)]], true)
    try {
      await user.click(
        await screen.findByRole('checkbox', { name: 'Chọn hồ sơ dòng 1, lần nạp 20' })
      )
      await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa về phòng ban' }))
      await user.click(screen.getByRole('radio', { name: 'Chọn phòng ban và người phụ trách' }))
      await user.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }))
      expect(await screen.findByText('Vui lòng chọn phòng ban phụ trách.')).toBeInTheDocument()
      expect(calls.some((c) => c.url === '/data-quality-issues' && c.method === 'post')).toBe(false)
      await user.selectOptions(screen.getByLabelText('2. Phòng ban phụ trách *'), '7')
      await user.type(screen.getByLabelText('Mô tả chi tiết'), 'Yêu cầu giữ lại khi gửi lỗi.')
      await user.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }))
      expect(
        await screen.findByText('Bạn không có quyền truy cập chức năng hoặc phạm vi dữ liệu này.')
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Mô tả chi tiết')).toHaveValue('Yêu cầu giữ lại khi gửi lỗi.')
      expect(screen.getByText('Đã chọn 1 hồ sơ cách ly')).toBeInTheDocument()
      expect(screen.queryByText(/Đã tạo yêu cầu.*và giao cho phòng ban/)).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  })

  it('giữ hồ sơ đã chọn qua trang và xóa lựa chọn khi đổi bộ lọc', async () => {
    const { client, calls, user } = environment([
      Array.from({ length: 20 }, (_, i) => record(i + 1)),
      [record(21)],
    ])
    try {
      await user.click(
        await screen.findByRole('checkbox', { name: 'Chọn hồ sơ dòng 1, lần nạp 20' })
      )
      await user.click(screen.getByRole('button', { name: 'Sau' }))
      await user.click(
        await screen.findByRole('checkbox', { name: 'Chọn hồ sơ dòng 21, lần nạp 20' })
      )
      expect(screen.getByText('Đã chọn 2 hồ sơ cách ly')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa về phòng ban' }))
      expect(await screen.findByText('1. Chọn hồ sơ cách ly (2 đã chọn) *')).toBeInTheDocument()
      expect(calls.filter((c) => c.url === '/quarantine-records')).toHaveLength(2)
      await user.type(screen.getByLabelText('Mã lỗi (error_code)'), 'INVALID_DATE')
      await waitFor(() => expect(screen.getByText('Đã chọn 0 hồ sơ cách ly')).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: 'Tạo yêu cầu' })).not.toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
  it('giới hạn chọn 100 hồ sơ khi chọn qua nhiều trang, vẫn cho bỏ chọn', async () => {
    const pages = Array.from({ length: 5 }, (_, page) =>
      Array.from({ length: 20 }, (_, row) => record(page * 20 + row + 1))
    )
    pages.push([record(101)])
    const { client, user } = environment(pages)
    try {
      for (let page = 0; page < 5; page++) {
        await screen.findByRole('checkbox', {
          name: `Chọn hồ sơ dòng ${page * 20 + 1}, lần nạp 20`,
        })
        await user.click(
          screen.getByRole('checkbox', { name: 'Chọn hồ sơ cùng lượt trên trang này' })
        )
        await user.click(screen.getByRole('button', { name: 'Sau' }))
      }
      const extra = await screen.findByRole('checkbox', { name: 'Chọn hồ sơ dòng 101, lần nạp 20' })
      expect(extra).toBeDisabled()
      expect(
        screen.getByRole('checkbox', { name: 'Chọn hồ sơ cùng lượt trên trang này' })
      ).toBeDisabled()
      expect(screen.getByText('Đã chọn 100 hồ sơ cách ly')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Bỏ chọn' }))
      expect(extra).toBeEnabled()
      expect(screen.getByText('Đã chọn 0 hồ sơ cách ly')).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
  it('tự điền người nạp, chờ bấm duyệt và không gửi mã người nhận từ trình duyệt', async () => {
    const { client, calls, user } = environment([[record(1), record(2)]])
    try {
      await screen.findByRole('button', { name: 'Dòng 1' })
      await user.click(
        screen.getByRole('checkbox', { name: 'Chọn hồ sơ cùng lượt trên trang này' })
      )
      await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa về phòng ban' }))
      expect(screen.getByRole('radio', { name: 'Trả về người nạp file' })).toBeChecked()
      expect(await screen.findByText(/Nhân viên HR.*hr_staff/)).toBeInTheDocument()
      expect(screen.getByText('Phòng phụ trách:').parentElement).toHaveTextContent('Phòng Nhân sự')
      expect(screen.queryByLabelText('3. Người phụ trách (tùy chọn)')).not.toBeInTheDocument()
      expect(screen.getByText(/Hồ sơ đã có yêu cầu/)).toBeInTheDocument()
      expect(calls.some((c) => c.url === '/data-quality-issues/return-to-uploader')).toBe(false)
      expect(calls.some((c) => c.url.endsWith('/assignees'))).toBe(false)
      await user.click(screen.getByRole('button', { name: 'Duyệt gửi về người nạp' }))
      expect(await screen.findByText(/Đã duyệt trả yêu cầu.*về người nạp file/)).toBeInTheDocument()
      expect(calls.find((c) => c.url === '/data-quality-issues/return-to-uploader')?.body).toEqual({
        title: 'Kiểm tra và sửa dữ liệu nguồn',
        description: '',
        quarantine_record_ids: [record(1).record_id, record(2).record_id],
      })
    } finally {
      client.clear()
    }
  })
})
