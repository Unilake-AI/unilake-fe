import { http } from '@/api/http'
import type {
  CleaningPreviewResponse,
  CleaningRun,
  CleaningRunFilters,
  ManualCleaningResponse,
} from '@/types/cleaning'

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
