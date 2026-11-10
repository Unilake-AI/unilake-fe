import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
type Job = Schemas['IngestionJobRead']
type JobFilters = paths['/api/v1/ingestion/jobs']['get']['parameters']['query']

// Quản trị viên xem toàn bộ. Nhân viên chỉ xem và tải tệp trong phân hệ được cấp quyền.
export async function API_ListIngestionJobs(params?: JobFilters): Promise<Job[]> {
  const res = await http.get<Job[]>('/ingestion/jobs', { params })
  return res.data
}

export async function API_GetIngestionJob(jobId: number): Promise<Job> {
  const res = await http.get<Job>(`/ingestion/jobs/${jobId}`)
  return res.data
}

export async function API_GetIngestionStats(): Promise<Schemas['IngestionJobStats']> {
  const res = await http.get<Schemas['IngestionJobStats']>('/ingestion/jobs/stats')
  return res.data
}

export async function API_GetIngestionMetrics(): Promise<Schemas['IngestionJobMetrics']> {
  const res = await http.get<Schemas['IngestionJobMetrics']>('/ingestion/jobs/metrics')
  return res.data
}

export async function API_ListIngestionAttempts(
  jobId: number
): Promise<Schemas['IngestionAttemptRead'][]> {
  const res = await http.get<Schemas['IngestionAttemptRead'][]>(`/ingestion/jobs/${jobId}/attempts`)
  return res.data
}

export async function API_UploadIngestionFile(
  file: File,
  datasetId: number,
  parserOptions?: Record<string, unknown>
): Promise<Job> {
  const form = new FormData()
  form.append('file', file)
  form.append('dataset_id', String(datasetId))
  if (parserOptions) form.append('parser_options', JSON.stringify(parserOptions))

  const res = await http.post<Job>('/ingestion/uploads', form)
  return res.data
}
