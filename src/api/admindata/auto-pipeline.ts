import axios from 'axios'

import { http } from '@/api/http'
import type {
  AutoSilverPolicy,
  AutoSilverPolicyRequest,
  AutoSilverWorker,
} from '@/types/auto-pipeline'

export async function API_GetAutoSilverPolicy(datasetId: number): Promise<AutoSilverPolicy | null> {
  try {
    return (await http.get<AutoSilverPolicy>(`/pipeline/auto/datasets/${datasetId}`)).data
  } catch (error) {
    // Chỉ coi đúng thông báo chưa cấu hình là trống; lỗi kết nối hoặc thiếu API vẫn phải hiện ra.
    if (
      axios.isAxiosError<{ error?: { code?: unknown } }>(error) &&
      error.response?.status === 404 &&
      error.response.data?.error?.code === 'AUTO_PIPELINE_POLICY_NOT_FOUND'
    )
      return null
    throw error
  }
}

export async function API_SaveAutoSilverPolicy(
  datasetId: number,
  payload: AutoSilverPolicyRequest
): Promise<AutoSilverPolicy> {
  return (await http.put<AutoSilverPolicy>(`/pipeline/auto/datasets/${datasetId}`, payload)).data
}

export async function API_RetryAutoSilverJob(
  jobId: string
): Promise<{ job_id: string; status: 'QUEUED'; attempt_number: number }> {
  return (
    await http.post<{ job_id: string; status: 'QUEUED'; attempt_number: number }>(
      `/pipeline/auto/jobs/${encodeURIComponent(jobId)}/retry`
    )
  ).data
}

export async function API_ListSilverWorkers(): Promise<AutoSilverWorker[]> {
  return (await http.get<AutoSilverWorker[]>('/pipeline/auto/workers')).data
}
