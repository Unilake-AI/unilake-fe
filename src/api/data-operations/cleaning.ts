import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
type Run = Schemas['CleaningRunRead']
type RunFilters = paths['/api/v1/cleaning-runs']['get']['parameters']['query']

export async function API_RunCleaning(
  jobId: number,
  profileId: string,
  baseSnapshot?: string | null
): Promise<Schemas['ManualCleaningResponse']> {
  const res = await http.post<Schemas['ManualCleaningResponse']>(
    `/pipeline/cleaning/ingestion-jobs/${jobId}`,
    { profile_id: profileId, base_snapshot: baseSnapshot }
  )
  return res.data
}

export async function API_ListCleaningRuns(params?: RunFilters): Promise<Run[]> {
  const res = await http.get<Run[]>('/cleaning-runs', { params })
  return res.data
}

export async function API_GetCleaningRun(runId: string): Promise<Run> {
  const res = await http.get<Run>(`/cleaning-runs/${encodeURIComponent(runId)}`)
  return res.data
}

export async function API_GetCleaningReport(runId: string): Promise<Record<string, unknown>> {
  const res = await http.get<Record<string, unknown>>(
    `/cleaning-runs/${encodeURIComponent(runId)}/report`
  )
  return res.data
}
