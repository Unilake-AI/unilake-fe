import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
export type QualityIssueRead = Schemas['IssueRead']
export type QualityIssueDetail = Schemas['IssueDetail']
export type QualityIssueStats = Schemas['IssueStats']
export type QualityIssueQuarantineRecord = Schemas['IssueQuarantineRecord']
export type QualityIssueEvent = Schemas['IssueEventRead']
export type SubmitQualityResolutionPayload = Schemas['SubmitResolution']
export type QualityIssueFilters = paths['/api/v1/data-quality-issues']['get']['parameters']['query']

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

export async function API_UploadQualityIssueFile(
  issueId: string,
  file: File,
  parserOptions?: Record<string, unknown>,
  onUploadProgress?: (percent: number) => void
): Promise<Schemas['IngestionJobRead']> {
  const form = new FormData()
  form.append('file', file)
  if (parserOptions && Object.keys(parserOptions).length > 0) {
    form.append('parser_options', JSON.stringify(parserOptions))
  }

  const res = await http.post<Schemas['IngestionJobRead']>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/uploads`,
    form,
    {
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return
        const percent = Math.min(100, Math.round((event.loaded * 100) / event.total))
        onUploadProgress(percent)
      },
    }
  )
  return res.data
}

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
