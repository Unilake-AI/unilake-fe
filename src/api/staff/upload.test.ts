import { expect, it } from 'vitest'

import { http } from '@/api/http'

import { API_UploadIngestionFile } from './upload'

it('gửi tệp và tùy chọn đọc dưới dạng multipart', async () => {
  const originalAdapter = http.defaults.adapter
  const file = new File(['id,name\n1,An'], 'students.csv', { type: 'text/csv' })
  http.defaults.adapter = (config) => {
    expect(config.method).toBe('post')
    expect(config.url).toBe('/ingestion/uploads')
    expect(config.data).toBeInstanceOf(FormData)
    const form = config.data as FormData
    expect(form.get('file')).toBe(file)
    expect(form.get('dataset_id')).toBe('9')
    expect(form.get('parser_options')).toBe('{"delimiter":","}')
    return Promise.resolve({
      config,
      data: { ingestion_job_id: 42 },
      headers: {},
      status: 202,
      statusText: 'Accepted',
    })
  }

  try {
    const job = await API_UploadIngestionFile(file, 9, { delimiter: ',' })
    expect(job.ingestion_job_id).toBe(42)
  } finally {
    http.defaults.adapter = originalAdapter
  }
})
