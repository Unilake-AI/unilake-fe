import { http } from '@/api/http'
import type { IngestionJob, IngestionStartPayload, IngestionWorker } from '@/types/ingestion'

export async function API_CreateIngestionJob(
  payload: IngestionStartPayload
): Promise<IngestionJob> {
  const res = await http.post<IngestionJob>('/ingestion/jobs', payload)
  return res.data
}

export async function API_ListIngestionWorkers(): Promise<IngestionWorker[]> {
  const res = await http.get<IngestionWorker[]>('/ingestion/workers')
  return res.data
}

export async function API_RetryIngestionJob(jobId: number): Promise<IngestionJob> {
  const res = await http.post<IngestionJob>(`/ingestion/jobs/${jobId}/retry`)
  return res.data
}
