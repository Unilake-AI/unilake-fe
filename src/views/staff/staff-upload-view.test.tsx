import { usePathname } from 'next/navigation'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { StaffUploadDialog } from './staff-upload-view'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/staff'),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const singleDomainContext = {
  user_id: 21,
  username: 'hr_staff_1',
  roles: ['HR_STAFF'],
  domains: [{ domain: 'hr', name: 'Nhân sự' }],
  default_domain: 'hr',
  departments: [
    { department_id: 5, department_code: 'HR', department_name: 'Phòng Tổ chức Nhân sự' },
  ],
  can_upload: true,
  can_resolve_issues: true,
  can_manage_silver: false,
  needs_department_assignment: false,
  accepted_extensions: ['.csv', '.xlsx', '.xlsm'],
  max_file_bytes: 52428800,
  max_records: 1000000,
  note: 'Chỉ người được giao mới được báo đã sửa',
}

const multiDomainContext = {
  ...singleDomainContext,
  roles: ['HR_STAFF', 'ACADEMIC_STAFF'],
  domains: [
    { domain: 'academic', name: 'Đào tạo' },
    { domain: 'hr', name: 'Nhân sự' },
  ],
  default_domain: null,
}

function renderUpload() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <StaffUploadDialog />
      </QueryClientProvider>
    ),
  }
}

describe('StaffUploadDialog', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('ẩn nút nạp dữ liệu trên trang Hỏi AI của Staff', () => {
    vi.mocked(usePathname).mockReturnValueOnce('/staff/ask')
    const { client } = renderUpload()
    expect(screen.queryByRole('button', { name: 'Nạp dữ liệu' })).not.toBeInTheDocument()
    client.clear()
  })

  it.each([
    { domain: 'hr', role: 'HR_STAFF', type: 'hr_employee', label: 'Hồ sơ nhân viên' },
    {
      domain: 'academic',
      role: 'ACADEMIC_STAFF',
      type: 'academic_curriculum',
      label: 'Khung chương trình',
    },
    {
      domain: 'admissions',
      role: 'ADMISSIONS_STAFF',
      type: 'admissions_results',
      label: 'Cập nhật kết quả xét tuyển',
    },
  ])(
    'kiểm tra tệp và gửi đúng nghiệp vụ cho $domain',
    async ({ domain, role, type, label }) => {
      let capturedForm: FormData | null = null
      let jobCalls = 0
      const file = new File(['id,name\n1,Nguyen An'], 'employees.csv', { type: 'text/csv' })

      http.defaults.adapter = (config) => {
        const key = `${config.method} ${config.url}`
        if (key === 'get /staff/context') {
          return Promise.resolve({
            data: {
              ...singleDomainContext,
              default_domain: domain,
              roles: [role],
              domains: [{ domain, name: label }],
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        }
        if (key === 'get /datasets') {
          expect(config.params.domain).toBe(domain)
          return Promise.resolve({
            data: [
              {
                dataset_id: 7,
                dataset_code: 'hr_employees',
                dataset_name: 'Bộ dữ liệu kiểm thử',
                domain,
                data_layer_id: 1,
                status: 'ACTIVE',
                created_at: '2026-11-10T09:00:00Z',
              },
            ],
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        }
        if (key === 'get /ingestion/import-types') {
          const workflow = {
            version: '1',
            enabled: true,
            fields: [],
            domain,
            label,
            import_type: type,
          }
          return Promise.resolve({
            data: [
              workflow,
              { ...workflow, domain: 'other', label: 'Nghiệp vụ phòng khác', import_type: 'other' },
            ],
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        }
        if (key === 'post /ingestion/imports/file-layout') {
          expect(config.data.get('file')).toBe(file)
          expect(config.data.get('domain')).toBe(domain)
          return Promise.resolve({
            data: { columns: ['id', 'name'], sheet_names: [], sheet_name: null },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        }
        if (key === 'post /ingestion/imports/analyze') {
          expect(JSON.parse(config.data as string)).toMatchObject({
            domain,
            columns: ['id', 'name'],
            options: { import_type: type },
          })
          return Promise.resolve({
            data: { status: 'MAPPED', field_mapping: {} },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        }
        if (key === 'post /ingestion/uploads') {
          capturedForm = config.data as FormData
          return Promise.resolve({
            data: {
              ingestion_job_id: 88,
              data_source_id: 3,
              dataset_id: 7,
              status: 'QUEUED',
              stage: 'QUEUED',
              job_type: 'UPLOAD_V1',
              import_type: type,
              source_table: 'employees.csv',
              created_at: '2026-11-10T10:00:00Z',
              started_at: null,
              finished_at: null,
              requested_by: '21',
              rows_read: null,
              rows_written: null,
              rows_rejected: null,
              error_message: null,
              output: null,
            },
            status: 202,
            statusText: 'Accepted',
            headers: {},
            config,
          })
        }
        if (key === 'get /ingestion/jobs/88') {
          jobCalls += 1
          return Promise.resolve({
            data: {
              ingestion_job_id: 88,
              data_source_id: 3,
              dataset_id: 7,
              status: jobCalls === 1 ? 'RUNNING' : 'SUCCESS',
              stage: jobCalls === 1 ? 'WRITING' : 'COMMITTING',
              job_type: 'UPLOAD_V1',
              import_type: type,
              source_table: 'employees.csv',
              created_at: '2026-11-10T10:00:00Z',
              started_at: '2026-11-10T10:00:01Z',
              finished_at: jobCalls === 1 ? null : '2026-11-10T10:00:03Z',
              requested_by: '21',
              rows_read: 1,
              rows_written: 1,
              rows_rejected: 0,
              error_message: null,
              output: null,
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        }
        if (key === 'get /ingestion/jobs/88/business-import') {
          return Promise.resolve({
            data: {
              silver_status: 'SUCCESS',
              gold_status: 'SUCCEEDED',
              database_status: 'SYNCED',
              database_committed: true,
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          })
        }
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
      }

      const { client } = renderUpload()
      try {
        const user = userEvent.setup()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Nạp dữ liệu' }))
        expect(screen.getByRole('dialog', { name: 'Nạp dữ liệu' })).toBeVisible()

        // Chọn bộ dữ liệu tiếp nhận từ dropdown
        const option = await screen.findByRole('option', { name: 'Bộ dữ liệu kiểm thử' })
        const datasetSelect = screen.getByRole('combobox', { name: /Bộ dữ liệu tiếp nhận/ })
        expect(datasetSelect).toHaveValue('')
        await user.selectOptions(datasetSelect, option)
        await user.selectOptions(
          screen.getByLabelText(/Công việc cần thực hiện/),
          await screen.findByRole('option', { name: label })
        )
        expect(
          screen.queryByRole('option', { name: 'Nghiệp vụ phòng khác' })
        ).not.toBeInTheDocument()

        // Chọn file CSV
        const fileInput = screen.getByLabelText(/Tệp dữ liệu/)
        const openPicker = vi.spyOn(fileInput, 'click')
        await user.click(screen.getByText(/^Tệp dữ liệu/))
        expect(openPicker).not.toHaveBeenCalled()
        await user.click(screen.getByRole('button', { name: 'Chọn tệp' }))
        expect(openPicker).toHaveBeenCalledOnce()
        await user.upload(fileInput, file)
        expect(screen.getByText(file.name)).toBeVisible()
        openPicker.mockClear()
        await user.click(screen.getByText(file.name))
        expect(openPicker).not.toHaveBeenCalled()

        // Tùy chỉnh CSV parser options (không hiển thị trường Excel)
        await user.click(screen.getByText('Nâng cao'))
        await user.click(screen.getByLabelText(/Tùy chỉnh cấu hình đọc tệp/))
        expect(screen.getByLabelText(/Dấu phân cách/)).toBeInTheDocument()
        expect(screen.queryByLabelText(/Tên sheet/)).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Kiểm tra tệp' }))
        expect(capturedForm).toBeNull()
        await user.click(await screen.findByRole('button', { name: 'Tải lên' }))

        // Kiểm tra FormData
        await waitFor(() => expect(capturedForm).not.toBeNull())
        expect(capturedForm!.get('file')).toBe(file)
        expect(capturedForm!.get('dataset_id')).toBe('7')
        expect(capturedForm!.get('dataset_name')).toBeNull()
        expect(capturedForm!.get('description')).toBeNull()
        expect(capturedForm!.get('domain')).toBeNull()
        expect(capturedForm!.get('parser_options')).toBe(
          JSON.stringify({ encoding: 'utf-8', delimiter: ',', quote_char: '"', skip_rows: 0 })
        )
        expect(JSON.parse(capturedForm!.get('import_options') as string)).toMatchObject({
          import_type: type,
          version: '1',
        })

        // Kiểm tra UI theo dõi job 202 -> QUEUED -> RUNNING -> SUCCESS
        expect(await screen.findByText(/Theo dõi lần nạp #88/)).toBeInTheDocument()

        // Chờ lần refetch thủ công hoặc query chuyển sang SUCCESS
        await waitFor(
          () => {
            expect(screen.getByText('Đã lưu tệp vào Bronze')).toBeInTheDocument()
            expect(screen.getByText('Đã ghi DB')).toBeInTheDocument()
          },
          { timeout: 6000 }
        )
        expect(screen.queryByText(/Đã lưu Silver/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Đã hoàn tất làm sạch/)).not.toBeInTheDocument()
      } finally {
        client.clear()
      }
    },
    10000
  )

  it('không cho phép STAFF tự tạo bộ dữ liệu mới và yêu cầu chọn bộ dữ liệu trước khi tải lên', async () => {
    const file = new File(['dummy'], 'nhan_su.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: singleDomainContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets') {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderUpload()
    try {
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: 'Nạp dữ liệu' })
      await user.click(trigger)

      // Xác nhận không còn tab hay ô nhập tạo bộ dữ liệu mới
      expect(screen.queryByRole('tab', { name: /Tạo bộ dữ liệu mới/ })).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Tên bộ dữ liệu mới/)).not.toBeInTheDocument()

      // Tải tệp lên nhưng chưa chọn dataset -> Báo lỗi
      await user.upload(await screen.findByLabelText(/Tệp dữ liệu/), file)
      await user.click(screen.getByRole('button', { name: 'Kiểm tra tệp' }))

      expect(
        await screen.findByText(/Vui lòng chọn bộ dữ liệu tiếp nhận trước khi tải lên/)
      ).toBeInTheDocument()
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    } finally {
      client.clear()
    }
  })

  it('kiểm tra đúng sheet và giữ file tại form khi chọn sai nghiệp vụ hoặc cần ánh xạ lại', async () => {
    const file = new File(['workbook'], 'ket-qua.xlsx')
    const registration = { import_type: 'admissions_registration', label: 'Danh sách đăng ký' }
    const results = { import_type: 'admissions_results', label: 'Cập nhật kết quả xét tuyển' }
    const columns = ['Mã thí sinh', 'Điểm tổng']
    const field = { name: 'admission_score', aliases: ['Điểm xét tuyển'], kind: 'decimal' }
    const job = {
      ingestion_job_id: 27,
      dataset_id: 5,
      status: 'SUCCESS',
      import_type: results.import_type,
    }
    const uploads: FormData[] = []
    http.defaults.adapter = (config) => {
      const reply = (data: unknown, status = 200) => ({
        data,
        status,
        statusText: '',
        headers: {},
        config,
      })
      const fail = (details: unknown) =>
        Promise.reject(
          new AxiosError(
            'Invalid layout',
            undefined,
            config,
            undefined,
            reply({ error: { details } }, 422)
          )
        )
      switch (`${config.method} ${config.url}`) {
        case 'get /staff/context':
          return Promise.resolve(
            reply({
              ...singleDomainContext,
              roles: ['ADMISSIONS_STAFF'],
              default_domain: 'admissions',
              domains: [{ domain: 'admissions', name: 'Tuyển sinh' }],
            })
          )
        case 'get /datasets':
          return Promise.resolve(
            reply([{ dataset_id: 5, dataset_name: 'Tuyển sinh', domain: 'admissions' }])
          )
        case 'get /ingestion/import-types':
          return Promise.resolve(
            reply(
              [registration, results].map((item) => ({
                ...item,
                version: '1',
                enabled: true,
                domain: 'admissions',
                fields: [field],
              }))
            )
          )
        case 'post /ingestion/imports/file-layout': {
          const form = config.data as FormData
          const sheet = form.has('parser_options') ? 'Kết quả' : null
          if (sheet) expect(form.get('parser_options')).toBe('{"sheet_name":"Kết quả"}')
          return Promise.resolve(
            reply({
              sheet_names: ['Hướng dẫn', 'Kết quả'],
              sheet_name: sheet,
              columns: sheet ? columns : [],
            })
          )
        }
        case 'post /ingestion/imports/analyze': {
          const { options } = JSON.parse(config.data as string) as {
            options: { import_type: string; field_mapping: Record<string, string> }
          }
          if (options.import_type === registration.import_type) {
            return fail({ field_mapping: {}, issues: [], suggested_workflow: results.label })
          }
          if (options.field_mapping.admission_score !== 'Điểm tổng') {
            return fail({
              field_mapping: { applicant_code: 'Mã thí sinh' },
              issues: [{ code: 'IMPORT_MAPPING_REQUIRED', column: 'Điểm tổng' }],
            })
          }
          return Promise.resolve(reply({ status: 'MAPPED', field_mapping: options.field_mapping }))
        }
        case 'post /ingestion/uploads':
          uploads.push(config.data as FormData)
          return Promise.resolve(reply(job, 202))
        case 'get /ingestion/jobs/27':
          return Promise.resolve(reply(job))
        case 'get /ingestion/jobs/27/business-import':
          return Promise.resolve(
            reply({
              silver_status: 'SUCCESS',
              gold_status: 'SUCCEEDED',
              database_status: 'BLOCKED',
              database_committed: false,
              error_report: {
                code: 'IMPORT_REFERENCE_MISSING',
                issues: [
                  {
                    code: 'IMPORT_REFERENCE_MISSING',
                    locator: 'sheet:Kết quả:row:128',
                    column: 'Mã thí sinh',
                  },
                ],
              },
            })
          )
        default:
          throw new Error(`Unexpected request ${config.method} ${config.url}`)
      }
    }

    const { client } = renderUpload()
    const user = userEvent.setup()
    try {
      await user.click(screen.getByRole('button', { name: 'Nạp dữ liệu' }))
      await user.selectOptions(
        screen.getByLabelText(/Bộ dữ liệu tiếp nhận/),
        await screen.findByRole('option', { name: 'Tuyển sinh' })
      )
      const workflow = screen.getByLabelText(/Công việc cần thực hiện/)
      await user.selectOptions(
        workflow,
        await screen.findByRole('option', { name: registration.label })
      )
      await user.upload(screen.getByLabelText(/Tệp dữ liệu/), file)
      await user.click(screen.getByRole('button', { name: 'Kiểm tra tệp' }))
      await user.selectOptions(await screen.findByLabelText(/Sheet cần nạp/), 'Kết quả')
      await user.click(screen.getByRole('button', { name: 'Kiểm tra tệp' }))
      expect(await screen.findByText(/Tệp phù hợp với công việc/)).toBeVisible()
      expect(uploads).toHaveLength(0)

      await user.selectOptions(workflow, results.import_type)
      await user.click(screen.getByRole('button', { name: 'Kiểm tra tệp' }))
      await user.selectOptions(await screen.findByLabelText('Cột Điểm tổng'), 'admission_score')
      await user.click(screen.getByRole('button', { name: 'Kiểm tra tệp' }))
      await user.click(await screen.findByRole('button', { name: 'Tải lên' }))
      expect(await screen.findByText('Lần nạp chưa ghi được DB')).toBeVisible()
      expect(screen.getByText(/Sheet Kết quả, dòng 128 · Mã thí sinh/)).toBeVisible()
      expect(screen.queryByText('Đã ghi DB')).not.toBeInTheDocument()
      expect(uploads).toHaveLength(1)
      expect(uploads[0]?.get('import_options')).toContain('"admission_score":"Điểm tổng"')
      expect(uploads[0]?.get('parser_options')).toBe('{"sheet_name":"Kết quả"}')
    } finally {
      client.clear()
    }
  })

  it('hiển thị lĩnh vực và đưa bộ dữ liệu từ các trang API tiếp theo vào dropdown', async () => {
    const offsets: number[] = []
    http.defaults.adapter = (config) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /staff/context') {
        return Promise.resolve({
          data: multiDomainContext,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /datasets') {
        const { limit, offset } = config.params as { limit: number; offset: number }
        offsets.push(offset)
        const data =
          offset === 0
            ? Array.from({ length: limit }, (_, index) => ({
                dataset_id: index + 1,
                dataset_name: `Hồ sơ nhân viên ${index + 1}`,
                domain: 'hr',
              }))
            : [{ dataset_id: limit + 1, dataset_name: 'Hồ sơ sinh viên', domain: 'academic' }]
        return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    }

    const { client } = renderUpload()
    try {
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Nạp dữ liệu' }))
      expect(
        await screen.findByRole('option', { name: 'Hồ sơ sinh viên · Đào tạo' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('option', { name: 'Hồ sơ nhân viên 1 · Nhân sự' })
      ).toBeInTheDocument()
      expect(offsets).toEqual([0, 100])
    } finally {
      client.clear()
    }
  })
})
