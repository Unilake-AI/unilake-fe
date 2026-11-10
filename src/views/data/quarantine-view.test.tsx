import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { http } from '@/api/http'

import { QuarantineView } from './quarantine-view'

import type { InternalAxiosRequestConfig } from 'axios'

describe('QuarantineView', () => {
  const originalAdapter = http.defaults.adapter

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('hiển thị tóm tắt, chi tiết bản ghi và dữ liệu dòng nguồn theo allowlist hoặc lỗi 403', async () => {
    let forbidSource = false
    const recordId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

    http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      const key = `${config.method} ${config.url}`
      if (key === 'get /datasets') {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
      }
      if (key === 'get /data-quality-issues/departments') {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
      }
      if (key === 'get /quarantine-records/summary') {
        return Promise.resolve({
          data: {
            total_records: 5,
            by_dataset: [{ dataset_id: 2, records: 5 }],
            by_owner_department: [{ owner_department_id: 1, records: 5 }],
            by_error_code: [{ error_code: 'INVALID_CCCD', records: 5 }],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === 'get /quarantine-records') {
        return Promise.resolve({
          data: [
            {
              record_id: recordId,
              cleaning_run_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              ingestion_job_id: 14,
              dataset_id: 2,
              domain: 'admissions',
              entity: 'applicant',
              owner_department_id: 1,
              locator: 'row-9',
              record_position: 9,
              bronze_version: 'v2',
              error_codes: ['INVALID_CCCD'],
            },
          ],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /quarantine-records/${recordId}`) {
        return Promise.resolve({
          data: {
            record_id: recordId,
            cleaning_run_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            ingestion_job_id: 14,
            dataset_id: 2,
            domain: 'admissions',
            entity: 'applicant',
            owner_department_id: 1,
            locator: 'row-9',
            record_position: 9,
            bronze_version: 'v2',
            error_codes: ['INVALID_CCCD'],
            issues: [{ field: 'national_id', message: 'CCCD sai định dạng' }],
            source: { file_name: 'applicants.csv', source_type: 'CSV' },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      if (key === `get /quarantine-records/${recordId}/source`) {
        if (forbidSource) {
          return Promise.reject(
            new AxiosError('forbidden', 'ERR_BAD_RESPONSE', config, undefined, {
              status: 403,
              statusText: 'Forbidden',
              headers: new AxiosHeaders(),
              config,
              data: { error: { code: 'QUARANTINE_SOURCE_FORBIDDEN' } },
            })
          )
        }
        return Promise.resolve({
          data: {
            record_id: recordId,
            data: { full_name: 'Nguyen Van A', national_id: '123' },
            invalid_fields: ['national_id'],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
      }
      return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config })
    }

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    try {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={client}>
          <QuarantineView />
        </QueryClientProvider>
      )

      expect(await screen.findByText('5')).toBeInTheDocument()
      await user.click(await screen.findByRole('button', { name: 'Dòng 9' }))
      expect(await screen.findByText('applicants.csv')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Xem dòng dữ liệu nguồn' }))
      expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument()
      expect(screen.getByText('(Lỗi)')).toBeInTheDocument()

      // Nếu backend từ chối 403 vẫn không làm crash trang
      forbidSource = true
      await user.click(screen.getByRole('button', { name: 'Xem dòng dữ liệu nguồn' }))
      await client.invalidateQueries({ queryKey: ['quarantine-records', 'source', recordId] })
      expect(
        await screen.findByText(/Bộ dữ liệu này không cho phép xem dòng dữ liệu nguồn gốc/)
      ).toBeInTheDocument()
    } finally {
      client.clear()
    }
  })
})
