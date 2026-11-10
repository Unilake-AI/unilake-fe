import { http } from '@/api/http'
import type { components } from '@/api/schema'

type Schemas = components['schemas']
type Issue = Schemas['IssueDetail']

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
