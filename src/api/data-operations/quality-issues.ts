import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'

type Schemas = components['schemas']
type Issue = Schemas['IssueDetail']
export type IssueDepartmentChoice = Schemas['IssueDepartmentChoice']
export type IssueAssigneeChoice = Schemas['AssigneeChoice']
export type IssueAssigneeFilters =
  paths['/api/v1/data-quality-issues/assignees']['get']['parameters']['query']

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

export async function API_CreateQualityIssue(payload: Schemas['CreateIssue']): Promise<Issue> {
  const res = await http.post<Issue>('/data-quality-issues', payload)
  return res.data
}

export async function API_AssignQualityIssue(
  issueId: string,
  payload: Schemas['AssignIssue']
): Promise<Issue> {
  const res = await http.patch<Issue>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/assignment`,
    payload
  )
  return res.data
}

export async function API_VerifyQualityIssue(
  issueId: string,
  payload: Schemas['SubmitVerification']
): Promise<Issue> {
  const res = await http.post<Issue>(
    `/data-quality-issues/${encodeURIComponent(issueId)}/verification`,
    payload
  )
  return res.data
}
