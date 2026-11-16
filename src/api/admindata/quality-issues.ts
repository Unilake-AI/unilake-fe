import { http } from '@/api/http'
import type {
  UploadReturnPreview,
  ApproveUploadReturnPayload,
  IssueAssigneeChoice,
  IssueAssigneeFilters,
  IssueDepartmentChoice,
  QualityIssueDetail,
  CreateQualityIssuePayload,
  AssignQualityIssuePayload,
  VerifyQualityIssuePayload,
} from '@/types/quality-issues'

export async function API_ListIssueDepartments(): Promise<IssueDepartmentChoice[]> {
  const res = await http.get<IssueDepartmentChoice[]>('/data-quality-issues/departments')
  return res.data
}

export async function API_ListIssueAssignees(
  params: IssueAssigneeFilters
): Promise<IssueAssigneeChoice[]> {
  const res = await http.get<IssueAssigneeChoice[]>('/data-quality-issues/assignees', { params })
  return res.data
}

export async function API_CreateQualityIssue(
  payload: CreateQualityIssuePayload
): Promise<QualityIssueDetail> {
  const res = await http.post<QualityIssueDetail>('/data-quality-issues', payload)
  return res.data
}

export async function API_AssignQualityIssue(
  issueId: string,
  payload: AssignQualityIssuePayload
): Promise<QualityIssueDetail> {
  const res = await http.patch<QualityIssueDetail>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/assignment`,
    payload
  )
  return res.data
}

export async function API_VerifyQualityIssue(
  issueId: string,
  payload: VerifyQualityIssuePayload
): Promise<QualityIssueDetail> {
  const res = await http.post<QualityIssueDetail>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/verification`,
    payload
  )
  return res.data
}

// Chỉ lấy gợi ý; người nạp và phòng phụ trách được backend xác định từ file nguồn.
export async function API_PreviewUploadReturn(recordIds: string[]): Promise<UploadReturnPreview> {
  const res = await http.post<UploadReturnPreview>('/data-quality-issues/return-preview', {
    quarantine_record_ids: recordIds,
  })
  return res.data
}

export async function API_ApproveUploadReturn(
  payload: ApproveUploadReturnPayload
): Promise<QualityIssueDetail> {
  const res = await http.post<QualityIssueDetail>(
    '/data-quality-issues/return-to-uploader',
    payload
  )
  return res.data
}
