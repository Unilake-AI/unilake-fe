import { http } from '@/api/http'
import type {
  IngestionAttempt,
  IngestionJob,
  IngestionJobFilters,
  IngestionJobMetrics,
  IngestionJobStats,
} from '@/types/ingestion'

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
