import { http } from '@/api/http'
import type {
  QualityIssueDetail,
  QualityIssueFilters,
  QualityIssueRead,
  QualityIssueStats,
} from '@/types/quality-issues'

// Quản trị viên xem toàn bộ. Trưởng phòng và nhân viên xem theo phạm vi được phân công.
export async function API_ListQualityIssues(
  params?: QualityIssueFilters
): Promise<QualityIssueRead[]> {
  const res = await http.get<QualityIssueRead[]>('/data-quality-issues', { params })
  return res.data
}

export async function API_GetQualityIssueStats(
  params?: QualityIssueFilters
): Promise<QualityIssueStats> {
  const res = await http.get<QualityIssueStats>('/data-quality-issues/stats', { params })
  return res.data
}

export async function API_GetQualityIssue(issueId: string): Promise<QualityIssueDetail> {
  const res = await http.get<QualityIssueDetail>(
    `/data-quality-issues/${encodeURIComponent(issueId)}`
  )
  return res.data
}
