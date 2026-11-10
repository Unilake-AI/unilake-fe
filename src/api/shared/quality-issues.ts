import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
type Issue = Schemas['IssueDetail']
type IssueFilters = paths['/api/v1/data-quality-issues']['get']['parameters']['query']

// Quản trị viên xem toàn bộ. Trưởng phòng và nhân viên xem theo phạm vi được phân công.
export async function API_ListQualityIssues(
  params?: IssueFilters
): Promise<Schemas['IssueRead'][]> {
  const res = await http.get<Schemas['IssueRead'][]>('/data-quality-issues', { params })
  return res.data
}

export async function API_GetQualityIssue(issueId: string): Promise<Issue> {
  const res = await http.get<Issue>(`/data-quality-issues/${encodeURIComponent(issueId)}`)
  return res.data
}

// Backend kiểm tra người phụ trách và phạm vi phòng ban trước khi nhận kết quả.
export async function API_SubmitQualityResolution(
  issueId: string,
  payload: Schemas['SubmitResolution']
): Promise<Issue> {
  const res = await http.post<Issue>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/resolution`,
    payload
  )
  return res.data
}
