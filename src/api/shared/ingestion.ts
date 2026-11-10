import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
export type IngestionJob = Schemas['IngestionJobRead']
export type IngestionJobStats = Schemas['IngestionJobStats']
export type IngestionJobMetrics = Schemas['IngestionJobMetrics']
export type IngestionAttempt = Schemas['IngestionAttemptRead']
export type IngestionJobFilters = paths['/api/v1/ingestion/jobs']['get']['parameters']['query']

export type UploadDomain = 'hr' | 'academic' | 'admissions'

export type UploadIngestionParams =
  | {
      mode: 'existing'
      file: File
      datasetId: number
      parserOptions?: Record<string, unknown>
      onUploadProgress?: (percent: number) => void
    }
  | {
      mode: 'new'
      file: File
      datasetName: string
      description?: string
      domain?: UploadDomain
      parserOptions?: Record<string, unknown>
      onUploadProgress?: (percent: number) => void
    }

// Quản trị viên xem toàn bộ. Nhân viên chỉ xem và tải tệp trong phân hệ được cấp quyền.
export async function API_ListIngestionJobs(params?: IngestionJobFilters): Promise<IngestionJob[]> {
  const res = await http.get<IngestionJob[]>('/ingestion/jobs', { params })
  return res.data
}

export async function API_GetIngestionJob(jobId: number): Promise<IngestionJob> {
  const res = await http.get<IngestionJob>(`/ingestion/jobs/${jobId}`)
  return res.data
}

export async function API_GetIngestionStats(): Promise<IngestionJobStats> {
  const res = await http.get<IngestionJobStats>('/ingestion/jobs/stats')
  return res.data
}

export async function API_GetIngestionMetrics(): Promise<IngestionJobMetrics> {
  const res = await http.get<IngestionJobMetrics>('/ingestion/jobs/metrics')
  return res.data
}

export async function API_ListIngestionAttempts(jobId: number): Promise<IngestionAttempt[]> {
  const res = await http.get<IngestionAttempt[]>(`/ingestion/jobs/${jobId}/attempts`)
  return res.data
}

export function buildIngestionUploadFormData(params: UploadIngestionParams): FormData {
  const form = new FormData()
  form.append('file', params.file)

  if (params.mode === 'existing') {
    form.append('dataset_id', String(params.datasetId))
  } else {
    form.append('dataset_name', params.datasetName.trim())
    const trimmedDescription = params.description?.trim()
    if (trimmedDescription) {
      form.append('description', trimmedDescription)
    }
    if (params.domain) {
      form.append('domain', params.domain)
    }
  }

  if (params.parserOptions && Object.keys(params.parserOptions).length > 0) {
    form.append('parser_options', JSON.stringify(params.parserOptions))
  }

  return form
}

export async function API_UploadIngestion(params: UploadIngestionParams): Promise<IngestionJob> {
  const form = buildIngestionUploadFormData(params)
  const res = await http.post<IngestionJob>('/ingestion/uploads', form, {
    onUploadProgress: (event) => {
      if (!params.onUploadProgress || !event.total) return
      const percent = Math.min(100, Math.round((event.loaded * 100) / event.total))
      params.onUploadProgress(percent)
    },
  })
  return res.data
}

export async function API_UploadIngestionFile(
  file: File,
  datasetId: number,
  parserOptions?: Record<string, unknown>
): Promise<IngestionJob> {
  return API_UploadIngestion({
    mode: 'existing',
    file,
    datasetId,
    parserOptions,
  })
}
