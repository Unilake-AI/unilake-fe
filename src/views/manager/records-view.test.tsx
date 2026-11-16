import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { http } from '@/api/http'

import { ManagerReportsView } from './reports-view'

import type { InternalAxiosRequestConfig } from 'axios'

const originalAdapter = http.defaults.adapter
const clients: QueryClient[] = []
afterEach(() => {
  http.defaults.adapter = originalAdapter
  clients.forEach((client) => client.clear())
  clients.length = 0
})
const choices = {
  hr: {
    code: 'PNS',
    role: 'HR_MANAGER',
    entity: 'employee',
    title: 'Hồ sơ nhân viên thật',
    fields: ['employee_id', 'employee_code', 'full_name', 'employee_status'],
  },
  academic: {
    code: 'PDT',
    role: 'ACADEMIC_MANAGER',
    entity: 'course',
    title: 'Học phần từ API',
    fields: ['course_id', 'course_code', 'course_name', 'status'],
  },
  admissions: {
    code: 'PTS',
    role: 'ADMISSIONS_MANAGER',
    entity: 'applicant',
    title: 'Hồ sơ thí sinh thật',
    fields: ['applicant_id', 'full_name', 'province'],
  },
}
type Domain = keyof typeof choices
function environment(
  domain: Domain = 'hr',
  options: {
    total?: number
    blocked?: boolean
    unassigned?: boolean
    multiple?: boolean
    cachedOtherUser?: boolean
  } = {}
) {
  const calls: InternalAxiosRequestConfig[] = []
  const state = { fail: false }
  const source = {
    dataset_id: 31,
    dataset_name: 'Nguồn được phép xem',
    gold_job_id: 'gold-version',
    silver_snapshot_id: 'silver-version',
    published_at: '2026-11-16T10:00:00Z',
    synced_at: '2026-11-16T10:01:00Z',
  }
  http.defaults.adapter = async (config) => {
    calls.push(config)
    await Promise.resolve()
    const url = config.url ?? ''
    let data: unknown
    if (url === '/manager/context') {
      const domains: Domain[] = options.multiple ? ['hr', 'academic'] : [domain]
      data = {
        user_id: 11,
        roles: domains.map((key) => choices[key].role),
        domains: domains.map((key) => ({ domain: key, name: key })),
        departments: options.unassigned
          ? []
          : domains.map((key, index) => ({
              department_id: index + 1,
              department_code: choices[key].code,
              department_name: choices[key].code,
            })),
        default_domain: domain,
        needs_department_configuration: options.unassigned ?? false,
        data_layer: 'GOLD',
        note: '',
      }
    } else if (url === '/manager/datasets') {
      data = {
        items: [{ dataset_id: 31, dataset_name: source.dataset_name }],
        total: 1,
        limit: 100,
        offset: 0,
      }
    } else if (url === '/manager/overview') {
      data = {
        database_sync: {
          total: 1,
          synced: options.blocked ? 0 : 1,
          blocked: options.blocked ? 1 : 0,
          failed: 0,
          queued: 0,
          running: 0,
          not_started: 0,
        },
      }
    } else {
      const selected = (url.split('/')[2] ?? domain) as Domain
      const choice = choices[selected]
      const record = {
        record_id: 7,
        values: Object.fromEntries(
          choice.fields.map((field) => [
            field,
            field.endsWith('_id')
              ? 7
              : field.endsWith('_status') || field === 'status'
                ? 'ACTIVE'
                : field.endsWith('_code')
                  ? 'CODE007'
                  : choice.title,
          ])
        ),
        source,
      }
      const spec = {
        entity: choice.entity,
        primary_key: choice.fields[0],
        fields: choice.fields,
        search_fields: choice.fields.filter(
          (field) => field.endsWith('_name') || field.endsWith('_code')
        ),
        status_field:
          choice.fields.find((field) => field === 'status' || field.endsWith('_status')) ?? null,
      }
      if (url.endsWith('/record-types'))
        data = [
          spec,
          {
            entity: 'lecturer',
            primary_key: 'employee_id',
            fields: ['employee_id', 'academic_degree'],
            search_fields: [],
            status_field: null,
          },
        ]
      else if (url.endsWith('/7')) data = record
      else if (url.includes('/records/')) {
        if (state.fail)
          throw new AxiosError('error', 'ERR_BAD_RESPONSE', config, undefined, {
            status: 503,
            statusText: 'Unavailable',
            headers: new AxiosHeaders(),
            config,
            data: { error: { code: 'MANAGER_UNAVAILABLE', message: 'DB unavailable' } },
          })
        data = {
          data_layer: 'GOLD',
          domain: selected,
          entity: choice.entity,
          items: options.blocked ? [] : [record],
          total: options.blocked ? 0 : (options.total ?? 1),
          limit: 20,
          offset: config.params?.offset ?? 0,
        }
      }
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  if (options.cachedOtherUser) {
    client.setQueryData(['manager', 'context'], {
      user_id: 99,
      roles: ['HR_MANAGER'],
      domains: [{ domain: 'hr', name: 'Nhân sự' }],
      departments: [{ department_id: 1, department_code: 'PNS', department_name: 'PNS' }],
      default_domain: 'hr',
      needs_department_configuration: false,
    })
    client.setQueryData(
      ['manager', 'record-types', 99, 'hr'],
      [
        {
          entity: 'employee',
          primary_key: 'employee_id',
          fields: ['full_name'],
          search_fields: ['full_name'],
          status_field: null,
        },
      ]
    )
    client.setQueryData(['manager', 'records', 99, 'hr', 'employee', { limit: 20, offset: 0 }], {
      items: [{ record_id: 99, values: { full_name: 'NỘI DUNG TÀI KHOẢN KHÁC' }, source }],
      total: 1,
      limit: 20,
      offset: 0,
    })
  }
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <ManagerReportsView mode="records" />
    </QueryClientProvider>
  )
  return { calls, client, state, user: userEvent.setup() }
}

describe('Dữ liệu nghiệp vụ manager gọi API theo từng phòng', () => {
  it.each<Domain>(['hr', 'academic', 'admissions'])(
    'lấy loại dữ liệu, danh sách và chi tiết của %s',
    async (domain) => {
      const { calls, user } = environment(domain)
      const choice = choices[domain]
      expect((await screen.findAllByText(choice.title)).length).toBeGreaterThan(0)
      expect(calls.some((call) => call.url === `/manager/${domain}/record-types`)).toBe(true)
      expect(calls).toContainEqual(
        expect.objectContaining({
          url: `/manager/${domain}/records/${choice.entity}`,
          params: { limit: 20, offset: 0 },
        })
      )
      await user.click(screen.getByRole('button', { name: 'Xem bản ghi #7' }))
      expect(await screen.findByText('Chi tiết bản ghi #7')).toBeInTheDocument()
      await waitFor(() =>
        expect(
          calls.some((call) => call.url === `/manager/${domain}/records/${choice.entity}/7`)
        ).toBe(true)
      )
      await user.click(screen.getByText('Phiên bản nguồn'))
      expect(await screen.findByText('Gold: gold-version')).toBeInTheDocument()
      expect(screen.getByText('Silver: silver-version')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Đóng bản ghi' }))
      expect(screen.queryByText('Chi tiết bản ghi #7')).not.toBeInTheDocument()
    }
  )

  it('chỉ áp dụng bộ lọc khi gửi form và đưa phân trang về đầu', async () => {
    const { calls, user } = environment('hr', { total: 21 })
    await screen.findByRole('button', { name: 'Xem bản ghi #7' })
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          url: '/manager/hr/records/employee',
          params: { limit: 20, offset: 20 },
        })
      )
    )
    const count = calls.filter((call) => call.url === '/manager/hr/records/employee').length
    await user.type(screen.getByLabelText('Tìm theo mã hoặc tên'), 'NV%_007')
    await user.type(screen.getByLabelText('Trạng thái bản ghi'), 'ACTIVE')
    await user.selectOptions(screen.getByLabelText('Bộ dữ liệu'), '31')
    expect(calls.filter((call) => call.url === '/manager/hr/records/employee')).toHaveLength(count)
    await user.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          url: '/manager/hr/records/employee',
          params: { limit: 20, offset: 0, search: 'NV%_007', status: 'ACTIVE', dataset_id: 31 },
        })
      )
    )
    await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(screen.getByLabelText('Tìm theo mã hoặc tên')).toHaveValue('')
    expect(screen.getByLabelText('Bộ dữ liệu')).toHaveValue('')
  })

  it('đổi loại dữ liệu xóa bộ lọc không được hỗ trợ và đóng chi tiết', async () => {
    const { calls, user } = environment()
    await screen.findByRole('button', { name: 'Xem bản ghi #7' })
    await user.type(screen.getByLabelText('Trạng thái bản ghi'), 'ACTIVE')
    await user.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Xem bản ghi #7' }))
    await screen.findByText('Chi tiết bản ghi #7')
    await user.selectOptions(screen.getByLabelText('Loại dữ liệu nghiệp vụ'), 'lecturer')
    expect(screen.queryByLabelText('Trạng thái bản ghi')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tìm theo mã hoặc tên')).not.toBeInTheDocument()
    expect(screen.queryByText('Chi tiết bản ghi #7')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          url: '/manager/hr/records/lecturer',
          params: { limit: 20, offset: 0 },
        })
      )
    )
  })

  it('đổi lĩnh vực dùng endpoint của phòng mới và bỏ dữ liệu phòng cũ', async () => {
    const { calls, user } = environment('hr', { multiple: true })
    await screen.findAllByText(choices.hr.title)
    await user.selectOptions(screen.getByLabelText('Lĩnh vực'), 'academic')
    await screen.findAllByText(choices.academic.title)
    expect(screen.queryByText(choices.hr.title)).not.toBeInTheDocument()
    expect(calls.some((call) => call.url === '/manager/academic/records/course')).toBe(true)
    expect(calls.some((call) => call.url === '/manager/academic/records/employee')).toBe(false)
  })

  it('hiển thị DB bị chặn và danh sách rỗng rõ ràng', async () => {
    environment('hr', { blocked: true })
    expect(await screen.findByText('Chưa có bản ghi phù hợp')).toBeInTheDocument()
    expect(screen.getByText('1 nguồn cần bổ sung dữ liệu')).toBeInTheDocument()
    expect(screen.queryByText(choices.hr.title)).not.toBeInTheDocument()
  })

  it('không dùng cache của tài khoản trước khi mở màn hình manager', async () => {
    const { client } = environment('hr', { cachedOtherUser: true })
    expect(screen.queryByText('NỘI DUNG TÀI KHOẢN KHÁC')).not.toBeInTheDocument()
    await screen.findAllByText(choices.hr.title)
    expect(screen.queryByText('NỘI DUNG TÀI KHOẢN KHÁC')).not.toBeInTheDocument()
    expect(
      client.getQueryData(['manager', 'records', 11, 'hr', 'employee', { limit: 20, offset: 0 }])
    ).toBeDefined()
  })

  it('không gọi dữ liệu khi phòng theo vai trò chưa được cấu hình', async () => {
    const { calls } = environment('hr', { unassigned: true })
    expect(await screen.findByText('Cần cấu hình phòng theo vai trò')).toBeInTheDocument()
    expect(calls.map((call) => call.url)).toEqual(['/manager/context'])
  })

  it('không giữ danh sách hoặc chi tiết cũ khi lần làm mới bị lỗi', async () => {
    const { client, state, user } = environment()
    await screen.findAllByText(choices.hr.title)
    await user.click(screen.getByRole('button', { name: 'Xem bản ghi #7' }))
    await screen.findByText('Chi tiết bản ghi #7')
    state.fail = true
    await client.invalidateQueries({ queryKey: ['manager', 'records'] })
    expect(
      await screen.findByText('Hệ thống đang gặp sự cố. Vui lòng thử lại sau.')
    ).toBeInTheDocument()
    expect(screen.queryByText(choices.hr.title)).not.toBeInTheDocument()
    expect(screen.queryByText('Chi tiết bản ghi #7')).not.toBeInTheDocument()
  })
})
