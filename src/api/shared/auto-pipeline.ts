import { http } from '@/api/http'
import type {
  AutoSilverAttempt,
  AutoSilverJob,
  AutoSilverJobDetail,
  AutoSilverJobFilters,
} from '@/types/auto-pipeline'

// Dùng chung cho quản trị và các phòng ban; backend giới hạn dữ liệu theo quyền đăng nhập.
export async function API_ListAutoSilverJobs(
  params?: AutoSilverJobFilters
): Promise<AutoSilverJob[]> {
  return (await http.get<AutoSilverJob[]>('/pipeline/auto/jobs', { params })).data
}

export async function API_GetAutoSilverJob(jobId: string): Promise<AutoSilverJobDetail> {
  return (await http.get<AutoSilverJobDetail>(`/pipeline/auto/jobs/${encodeURIComponent(jobId)}`))
    .data
}

export async function API_ListAutoSilverAttempts(jobId: string): Promise<AutoSilverAttempt[]> {
  return (
    await http.get<AutoSilverAttempt[]>(`/pipeline/auto/jobs/${encodeURIComponent(jobId)}/attempts`)
  ).data
}
