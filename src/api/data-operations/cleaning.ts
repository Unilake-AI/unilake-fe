import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
export type CleaningRun = Schemas['CleaningRunRead']
export type CleaningRunFilters = paths['/api/v1/cleaning-runs']['get']['parameters']['query']
export type ManualCleaningResponse = Schemas['ManualCleaningResponse']

export interface CleaningPreviewResponse {
  preview: boolean
  ingestion_job_id: number
  profile_id: string
  profile_fingerprint: string
  records_read: number
  records_passed_cleaning: number
  records_quarantined: number
  records_collapsed: number
  records_normalized: number
  cleaning_issues: Array<Record<string, unknown>>
  normalization_issues: Array<Record<string, unknown>>
  cleaned_sample: Array<Record<string, unknown>>
  normalized_sample: Array<Record<string, unknown>>
  publication_checked: boolean
  note?: string
}

export async function API_PreviewCleaning(
  jobId: number,
  profileId: string,
  limit = 20
): Promise<CleaningPreviewResponse> {
  const res = await http.post<CleaningPreviewResponse>(
    `/pipeline/cleaning/ingestion-jobs/${jobId}/preview`,
    { profile_id: profileId },
    { params: { limit } }
  )
  return res.data
}

export async function API_RunCleaning(
  jobId: number,
  profileId: string,
  baseSnapshot?: string | null
): Promise<ManualCleaningResponse> {
  const res = await http.post<ManualCleaningResponse>(
    `/pipeline/cleaning/ingestion-jobs/${jobId}`,
    { profile_id: profileId, base_snapshot: baseSnapshot }
  )
  return res.data
}

export async function API_ListCleaningRuns(params?: CleaningRunFilters): Promise<CleaningRun[]> {
  const res = await http.get<CleaningRun[]>('/cleaning-runs', { params })
  return res.data
}

export async function API_GetCleaningRun(runId: string): Promise<CleaningRun> {
  const res = await http.get<CleaningRun>(`/cleaning-runs/${encodeURIComponent(runId)}`)
  return res.data
}

export async function API_GetCleaningReport(runId: string): Promise<Record<string, unknown>> {
  const res = await http.get<Record<string, unknown>>(
    `/cleaning-runs/${encodeURIComponent(runId)}/report`
  )
  return res.data
}
