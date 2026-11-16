import { http } from '@/api/http'
import type { QualityIssueDetail, SubmitQualityResolutionPayload } from '@/types/quality-issues'

// Backend kiểm tra người phụ trách và phạm vi phòng ban trước khi nhận kết quả.
export async function API_SubmitQualityResolution(
  issueId: string,
  payload: SubmitQualityResolutionPayload
): Promise<QualityIssueDetail> {
  const res = await http.post<QualityIssueDetail>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/resolution`,
    payload
  )
  return res.data
}
