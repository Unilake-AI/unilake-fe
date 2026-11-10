import { http } from '@/api/http'
import type { components } from '@/api/schema'

type Schemas = components['schemas']
type Job = Schemas['IngestionJobRead']

export async function API_CreateIngestionJob(payload: Schemas['IngestionStart']): Promise<Job> {
  const res = await http.post<Job>('/ingestion/jobs', payload)
  return res.data
}

export async function API_ListIngestionWorkers(): Promise<Schemas['IngestionWorkerRead'][]> {
  const res = await http.get<Schemas['IngestionWorkerRead'][]>('/ingestion/workers')
  return res.data
}

export async function API_RetryIngestionJob(jobId: number): Promise<Job> {
  const res = await http.post<Job>(`/ingestion/jobs/${jobId}/retry`)
  return res.data
}
