import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { API_GetAutoSilverPolicy } from '@/api/admindata/auto-pipeline'
import { http } from '@/api/http'
import { AutoSilverForIngestion } from '@/components/data/auto-silver-jobs'
import type { AutoSilverPolicy } from '@/types/auto-pipeline'

import { AutoPipelineView } from './auto-pipeline-view'

import type { InternalAxiosRequestConfig } from 'axios'

const jobId = '11111111-1111-4111-8111-111111111111'
const job = {
  job_id: jobId,
  ingestion_job_id: 20,
  dataset_id: 4,
  status: 'FAILED',
  attempt_number: 1,
  error_code: 'NETWORK',
  result: null,
  created_at: '2026-11-16T01:00:00Z',
  finished_at: '2026-11-16T01:01:00Z',
  next_attempt_at: null,
}
function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  code: string,
  message: string
): never {
  throw new AxiosError(message, 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: 'Error',
    headers: new AxiosHeaders(),
    config,
    data: { success: false, error: { code, message } },
  })
}

function environment(options: { missingProfile?: boolean; existing?: boolean } = {}) {
  const calls: { method: string; url: string; body: unknown; params: unknown }[] = []
  let policy: AutoSilverPolicy | null = options.existing
    ? {
        dataset_id: 4,
        revision: 3,
        enabled: true,
        definition: {
          profile_id: 'removed-profile',
          max_attempts: 3,
          retry_delay_seconds: 30,
          allow_partial_publication: false,
        },
        updated_by: '1',
        updated_at: '2026-11-16T01:00:00Z',
      }
    : null
  let revisionConflict = false
  let retryConflict = false
  let status = 'FAILED'
  http.defaults.adapter = async (config) => {
    await Promise.resolve()
    const url = config.url ?? ''
    calls.push({
      method: config.method ?? '',
      url,
      body: config.data ? JSON.parse(String(config.data)) : undefined,
      params: config.params,
    })
    let data: unknown = []
    if (url === '/datasets') data = [{ dataset_id: 4, dataset_name: 'Nhân viên HR', domain: 'hr' }]
    else if (url === '/pipeline/profiles')
      data = options.missingProfile
        ? []
        : [
            {
              profile_id: 'hr-source',
              revision: 1,
              definition: {
                dataset_id: 4,
                entity: 'employee',
                source_table: 'employees.csv',
                identity_mode: 'source',
              },
            },
          ]
    else if (url === '/pipeline/auto/datasets/4') {
      if (config.method === 'put') {
        const body = JSON.parse(String(config.data))
        if (revisionConflict) {
          policy = { ...policy!, revision: policy!.revision + 1 }
          revisionConflict = false
          fail(
            config,
            409,
            'AUTO_PIPELINE_REVISION_CONFLICT',
            'Cấu hình đã được người khác thay đổi'
          )
        }
        expect(body.expected_revision).toBe(policy?.revision ?? 0)
        policy = {
          dataset_id: 4,
          revision: body.expected_revision + 1,
          enabled: body.enabled,
          definition: {
            profile_id: body.profile_id,
            max_attempts: body.max_attempts,
            retry_delay_seconds: body.retry_delay_seconds,
            allow_partial_publication: body.allow_partial_publication,
          },
          updated_by: '1',
          updated_at: '2026-11-16T01:01:00Z',
        }
      }
      if (!policy)
        fail(
          config,
          404,
          'AUTO_PIPELINE_POLICY_NOT_FOUND',
          'Chưa cấu hình tự chạy cho bộ dữ liệu này'
        )
      data = policy
    } else if (url === '/pipeline/auto/flows') data = { items: [], next_offset: null }
    else if (url === '/pipeline/auto/jobs') data = [{ ...job, status }]
    else if (url === `/pipeline/auto/jobs/${jobId}`)
      data = { ...job, status, worker_id: 'silver-1', lease_expires_at: null }
    else if (url.endsWith('/attempts'))
      data = [
        {
          attempt_number: 1,
          worker_id: 'silver-1',
          status: 'FAILED',
          error_code: 'NETWORK',
          started_at: '2026-11-16T01:00:00Z',
          finished_at: '2026-11-16T01:01:00Z',
        },
      ]
    else if (url.endsWith('/retry')) {
      if (retryConflict)
        fail(config, 409, 'AUTO_PIPELINE_RETRY_CONFLICT', 'Cấu hình không còn hiệu lực để thử lại')
      status = 'QUEUED'
      data = { job_id: jobId, status, attempt_number: 1 }
    } else if (url === '/pipeline/auto/workers')
      data = [
        { worker_id: 'silver-1', current_job_id: null, last_heartbeat_at: '2026-11-16T01:02:00Z' },
      ]
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AutoPipelineView />
    </QueryClientProvider>
  )
  return {
    client,
    calls,
    user: userEvent.setup(),
    conflict: () => {
      revisionConflict = true
    },
    conflictRetry: () => {
      retryConflict = true
    },
    permitRetry: () => {
      retryConflict = false
    },
  }
}

describe('Gọi API xử lý Silver tự động', () => {
  const original = http.defaults.adapter
  afterEach(() => {
    http.defaults.adapter = original
  })

  it('chỉ bật sau khi lưu, dùng đúng phiên bản khi sửa và tải lại khi xung đột', async () => {
    const { client, calls, user, conflict } = environment()
    try {
      await screen.findByRole('option', { name: 'Nhân viên HR · hr' })
      await user.selectOptions(screen.getByLabelText('Bộ dữ liệu tự chạy'), '4')
      const toggle = await screen.findByLabelText('Tự xử lý Silver cho các lần nạp mới')
      expect(toggle).not.toBeChecked()
      expect(calls.some((call) => call.method === 'put')).toBe(false)
      expect(screen.getByLabelText('Cách xử lý tự động')).toHaveValue('hr-source')
      await user.click(toggle)
      await user.click(screen.getByRole('button', { name: 'Lưu cấu hình tự chạy' }))
      expect(await screen.findByText('Đã lưu cấu hình tự chạy.')).toBeInTheDocument()
      expect(calls.find((call) => call.method === 'put')?.body).toEqual({
        expected_revision: 0,
        enabled: true,
        profile_id: 'hr-source',
        allow_partial_publication: false,
        max_attempts: 3,
        retry_delay_seconds: 30,
      })
      expect(calls.find((call) => call.url === '/pipeline/profiles')?.params).toEqual({
        dataset_id: 4,
        limit: 100,
        offset: 0,
      })
      conflict()
      await user.click(screen.getByLabelText('Tự xử lý Silver cho các lần nạp mới'))
      await user.click(screen.getByRole('button', { name: 'Lưu cấu hình tự chạy' }))
      expect(
        await screen.findByText(
          'Cấu hình đã được thay đổi. Hãy tải lại phiên bản mới nhất trước khi lưu.'
        )
      ).toBeInTheDocument()
      expect(calls.filter((call) => call.method === 'put')).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: 'Thử lại' }))
      await screen.findByText(/Cấu hình hiện tại: bản 2/)
      await user.click(screen.getByLabelText('Tự xử lý Silver cho các lần nạp mới'))
      await user.click(screen.getByRole('button', { name: 'Lưu cấu hình tự chạy' }))
      await waitFor(() => expect(calls.filter((call) => call.method === 'put')).toHaveLength(3))
      expect(calls.filter((call) => call.method === 'put')[2]?.body).toEqual(
        expect.objectContaining({ expected_revision: 2, enabled: false })
      )
    } finally {
      client.clear()
    }
  })

  it('cho tắt cấu hình cũ khi cách xử lý không còn trong danh sách', async () => {
    const { client, calls, user } = environment({ existing: true, missingProfile: true })
    try {
      await screen.findByRole('option', { name: 'Nhân viên HR · hr' })
      await user.selectOptions(screen.getByLabelText('Bộ dữ liệu tự chạy'), '4')
      await screen.findByText(/Cấu hình hiện tại: bản 3/)
      expect(screen.getByRole('button', { name: 'Lưu cấu hình tự chạy' })).toBeDisabled()
      await user.click(screen.getByLabelText('Tự xử lý Silver cho các lần nạp mới'))
      await user.click(screen.getByRole('button', { name: 'Lưu cấu hình tự chạy' }))
      expect(await screen.findByText('Đã lưu cấu hình tự chạy.')).toBeInTheDocument()
      expect(calls.find((call) => call.method === 'put')?.body).toEqual(
        expect.objectContaining({
          expected_revision: 3,
          enabled: false,
          profile_id: 'removed-profile',
        })
      )
    } finally {
      client.clear()
    }
  })

  it('gọi danh sách, chi tiết, lịch sử, worker và chỉ retry sau khi xác nhận', async () => {
    const { client, calls, user, conflictRetry, permitRetry } = environment()
    try {
      expect(await screen.findByText('silver-1')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Xem lượt 11111111' }))
      expect(
        await screen.findByRole('button', { name: 'Thử lại xử lý Silver' })
      ).toBeInTheDocument()
      await screen.findByText('Lịch sử xử lý Silver')
      expect(calls.some((call) => call.url.endsWith('/attempts'))).toBe(true)
      expect(calls.some((call) => call.url.endsWith('/retry'))).toBe(false)
      await user.click(screen.getByRole('button', { name: 'Thử lại xử lý Silver' }))
      conflictRetry()
      await user.click(screen.getByRole('button', { name: 'Xác nhận thử lại Silver' }))
      expect(
        await screen.findByText('Chỉ thử lại lượt thất bại có cấu hình đang bật và cùng phiên bản.')
      ).toBeInTheDocument()
      permitRetry()
      await user.click(screen.getByRole('button', { name: 'Xác nhận thử lại Silver' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findAllByText('Chờ xử lý Silver')).not.toHaveLength(0)
      expect(calls.filter((call) => call.url.endsWith('/retry'))).toHaveLength(2)
    } finally {
      client.clear()
    }
  })

  it.each([403, 404, 503])('không coi lỗi API %s là bộ dữ liệu chưa cấu hình', async (status) => {
    http.defaults.adapter = (config) =>
      Promise.reject(
        new AxiosError('error', 'ERR_BAD_RESPONSE', config, undefined, {
          status,
          statusText: 'Error',
          headers: new AxiosHeaders(),
          config,
          data: { error: { code: 'OTHER_ERROR' } },
        })
      )
    await expect(API_GetAutoSilverPolicy(4)).rejects.toBeInstanceOf(AxiosError)
  })

  it('phần theo dõi STAFF chỉ gọi API đọc và hiển thị chính xác công bố một phần', async () => {
    const calls: string[] = []
    const result = {
      status: 'PUBLISHED_WITH_QUARANTINE',
      records_read: 20,
      records_passed: 18,
      records_quarantined: 2,
      publication: { snapshot_id: 'snapshot-1', records_published: 18 },
    }
    http.defaults.adapter = (config) => {
      calls.push(`${config.method} ${config.url}`)
      if (config.url === '/pipeline/auto/jobs')
        expect(config.params).toEqual({ ingestion_job_id: 20, limit: 20, offset: 0 })
      const data =
        config.url === '/pipeline/auto/jobs'
          ? [{ ...job, status: 'SUCCESS', result }]
          : config.url?.endsWith('/attempts')
            ? []
            : { ...job, status: 'SUCCESS', result }
      return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      render(
        <QueryClientProvider client={client}>
          <AutoSilverForIngestion ingestionJobId={20} />
        </QueryClientProvider>
      )
      expect(
        await screen.findByText('Đã công bố một phần; các dòng lỗi được giữ trong hồ sơ cách ly.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Thử lại xử lý Silver' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Cấu hình tự chạy' })).not.toBeInTheDocument()
      expect(calls).toContain(`get /pipeline/auto/jobs/${jobId}`)
      expect(calls).toContain(`get /pipeline/auto/jobs/${jobId}/attempts`)
      expect(calls.every((call) => call.startsWith('get /pipeline/auto/jobs'))).toBe(true)
    } finally {
      client.clear()
    }
  })
})
