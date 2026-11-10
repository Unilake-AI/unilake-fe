import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { http } from '@/api/http'

import { IngestionView } from './ingestion-view'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function baseAdapterResponses() {
  return {
    'get /ingestion/jobs/stats': {
      total: 2,
      queued: 0,
      running: 0,
      success: 1,
      failed: 1,
      retry_wait: 0,
    },
    'get /ingestion/jobs/metrics': {
      average_wait_seconds: 1.0,
      average_processing_seconds: 2.5,
      failure_rate_percent: 50,
      oldest_queued_seconds: null,
    },
    'get /datasets': [
      {
        dataset_id: 8,
        dataset_code: 'ADM_RAW',
        dataset_name: 'Tuyển sinh thô',
        domain: 'admissions',
        data_layer_id: 1,
        status: 'ACTIVE',
        created_at: '2026-11-10T00:00:00Z',
      },
    ],
    'get /datasources': {
      items: [
        {
          data_source_id: 3,
          source_system_id: 1,
          source_system_name: 'Admissions System',
          source_name: 'Admissions CSV',
          source_type: 'CSV',
          connection_type: 'FILE',
          location: 's3://raw/input.csv',
          description: null,
          is_active: true,
          last_ingested_at: null,
          last_ingestion_status: null,
          ingestion_count: 1,
          created_by: 1,
          created_at: '2026-11-10T00:00:00Z',
          updated_at: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
    },
  }
}

describe('DATA_ADMIN IngestionView', () => {
  it('tải chi tiết khi mở job và chỉ chạy Cleaning sau khi người dùng bấm nút', async () => {
    const job = {
      ingestion_job_id: 42,
      data_source_id: 3,
      dataset_id: 8,
      status: 'SUCCESS',
      job_type: 'EXECUTION_V1',
      source_table: 'input.csv',
    }
    const trackRequest = vi.fn<(endpoint: string) => void>()
    const trackCleaningBody = vi.fn<(body: unknown) => void>()
    const originalAdapter = http.defaults.adapter
    http.defaults.adapter = (config) => {
      const endpoint = `${config.method} ${config.url}`
      trackRequest(endpoint)
      if (endpoint === 'post /pipeline/cleaning/ingestion-jobs/42') {
        trackCleaningBody(JSON.parse(String(config.data)))
      }
      const responses: Record<string, unknown> = {
        ...baseAdapterResponses(),
        'get /ingestion/jobs': [job],
        'get /ingestion/jobs/42': { ...job, requested_by: '42' },
        'get /ingestion/jobs/42/attempts': [],
        'post /pipeline/cleaning/ingestion-jobs/42': {
          run_id: 'run-1',
          status: 'QUARANTINED',
          records_passed: 8,
          records_quarantined: 2,
          publication: null,
        },
      }
      return Promise.resolve({
        data: responses[endpoint],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <IngestionView />
        </QueryClientProvider>
      )
      const detail = await screen.findByRole('button', { name: 'Chi tiết lần nạp #42' })
      expect(trackRequest.mock.calls.some(([c]) => c === 'get /ingestion/jobs/42')).toBe(false)

      await user.click(detail)
      const run = await screen.findByRole('button', { name: 'Làm sạch dữ liệu' })
      expect(trackRequest).toHaveBeenCalledWith('get /ingestion/jobs/42')
      expect(run).toBeDisabled()
      await user.type(screen.getByLabelText('Mã cấu hình làm sạch'), 'admissions-cleaning')

      await user.click(run)
      expect(await screen.findByText(/2 dòng cần kiểm tra · Chưa lưu kết quả/)).toBeInTheDocument()
      expect(trackRequest).toHaveBeenCalledWith('post /pipeline/cleaning/ingestion-jobs/42')
      expect(trackCleaningBody).toHaveBeenCalledWith({ profile_id: 'admissions-cleaning' })
    } finally {
      client.clear()
      http.defaults.adapter = originalAdapter
    }
  })

  it('hỗ trợ chạy nạp từ nguồn đăng ký, tải tệp lên và chỉ cho Manual Retry với UPLOAD_V1 thất bại', async () => {
    let startPayload: unknown = null
    let uploadForm: FormData | null = null
    let retried = false
    const file = new File(['id,name\n1,An'], 'upload.csv', { type: 'text/csv' })

    const originalAdapter = http.defaults.adapter
    http.defaults.adapter = (config) => {
      const endpoint = `${config.method} ${config.url}`
      if (endpoint === 'post /ingestion/jobs') {
        startPayload = JSON.parse(String(config.data))
        return Promise.resolve({
          data: { ingestion_job_id: 50, data_source_id: 3, dataset_id: 8, status: 'QUEUED' },
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
        })
      }
      if (endpoint === 'post /ingestion/uploads') {
        uploadForm = config.data as FormData
        return Promise.resolve({
          data: { ingestion_job_id: 51, data_source_id: 3, dataset_id: 8, status: 'QUEUED' },
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
        })
      }
      if (endpoint === 'post /ingestion/jobs/60/retry') {
        retried = true
        return Promise.resolve({
          data: { ingestion_job_id: 61, data_source_id: 3, dataset_id: 8, status: 'QUEUED' },
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config,
        })
      }
      const responses: Record<string, unknown> = {
        ...baseAdapterResponses(),
        'get /ingestion/jobs': [
          {
            ingestion_job_id: 60,
            data_source_id: 3,
            dataset_id: 8,
            status: 'FAILED',
            job_type: 'UPLOAD_V1',
            source_table: 'failed_upload.csv',
          },
          {
            ingestion_job_id: 70,
            data_source_id: 3,
            dataset_id: 8,
            status: 'FAILED',
            job_type: 'EXECUTION_V1',
            source_table: 'exec.csv',
          },
        ],
        'get /ingestion/jobs/60': {
          ingestion_job_id: 60,
          data_source_id: 3,
          dataset_id: 8,
          status: 'FAILED',
          job_type: 'UPLOAD_V1',
          source_table: 'failed_upload.csv',
          error_message: 'WORKER_LEASE_EXPIRED',
        },
        'get /ingestion/jobs/60/attempts': [
          {
            ingestion_job_id: 60,
            root_job_id: 60,
            attempt_number: 1,
            status: 'FAILED',
            stage: 'READING',
            error_message: 'WORKER_LEASE_EXPIRED',
            created_at: '2026-11-10T01:00:00Z',
            started_at: null,
            finished_at: null,
          },
        ],
        'get /ingestion/jobs/70': {
          ingestion_job_id: 70,
          data_source_id: 3,
          dataset_id: 8,
          status: 'FAILED',
          job_type: 'EXECUTION_V1',
          source_table: 'exec.csv',
        },
        'get /ingestion/jobs/70/attempts': [],
        'get /ingestion/jobs/61': {
          ingestion_job_id: 61,
          data_source_id: 3,
          dataset_id: 8,
          status: 'SUCCESS',
          job_type: 'UPLOAD_V1',
          source_table: 'failed_upload.csv',
        },
        'get /ingestion/jobs/61/attempts': [],
        'get /ingestion/jobs/50': {
          ingestion_job_id: 50,
          data_source_id: 3,
          dataset_id: 8,
          status: 'SUCCESS',
          job_type: 'EXECUTION_V1',
          source_table: 'applicants.csv',
        },
        'get /ingestion/jobs/50/attempts': [],
        'get /ingestion/jobs/51': {
          ingestion_job_id: 51,
          data_source_id: 3,
          dataset_id: 8,
          status: 'SUCCESS',
          job_type: 'UPLOAD_V1',
          source_table: 'upload.csv',
        },
        'get /ingestion/jobs/51/attempts': [],
      }
      return Promise.resolve({
        data: responses[endpoint] ?? [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <IngestionView />
        </QueryClientProvider>
      )

      // 1. EXECUTION_V1 FAILED không được có nút Chạy lại thủ công
      await user.click(await screen.findByRole('button', { name: 'Chi tiết lần nạp #70' }))
      expect(
        await screen.findByText(/chỉ hỗ trợ cho các job tải tệp lên \(UPLOAD_V1\)/)
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Chạy lại thủ công' })).not.toBeInTheDocument()

      // 2. UPLOAD_V1 FAILED có nút Chạy lại thủ công + xác nhận
      await user.click(screen.getByRole('button', { name: 'Chi tiết lần nạp #60' }))
      await user.click(await screen.findByRole('button', { name: 'Chạy lại thủ công' }))
      await user.click(await screen.findByRole('button', { name: 'Xác nhận chạy lại' }))
      await waitFor(() => expect(retried).toBe(true))

      // 3. Method B: Chạy nạp từ nguồn đăng ký
      await user.click(screen.getByRole('button', { name: 'Chạy từ nguồn' }))
      await user.selectOptions(await screen.findByLabelText('Nguồn dữ liệu *'), '3')
      await user.selectOptions(screen.getByLabelText('Bộ dữ liệu đích *'), '8')
      await user.type(screen.getByLabelText('File / bảng nguồn *'), 'applicants.csv')
      await user.click(screen.getByRole('button', { name: 'Chạy nạp dữ liệu' }))
      await waitFor(() =>
        expect(startPayload).toEqual({
          data_source_id: 3,
          dataset_id: 8,
          source_table: 'applicants.csv',
        })
      )

      // 4. Method A: Tải tệp lên
      await user.click(screen.getByRole('button', { name: 'Tải tệp lên' }))
      await user.selectOptions(await screen.findByLabelText('Bộ dữ liệu đích *'), '8')
      await user.upload(screen.getByLabelText(/Tệp dữ liệu/), file)
      await user.click(screen.getByRole('button', { name: 'Tải lên và tạo job' }))
      await waitFor(() => expect(uploadForm).not.toBeNull())
      expect(uploadForm!.get('file')).toBe(file)
      expect(uploadForm!.get('dataset_id')).toBe('8')
    } finally {
      client.clear()
      http.defaults.adapter = originalAdapter
    }
  })
})
