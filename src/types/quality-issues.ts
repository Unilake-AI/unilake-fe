import type { components, paths } from '@/api/schema'

export type QualityIssueDetail = components['schemas']['IssueDetail']

export type IssueDepartmentChoice = components['schemas']['IssueDepartmentChoice']

export type IssueAssigneeChoice = components['schemas']['AssigneeChoice']

export type IssueAssigneeFilters =
  paths['/api/v1/data-quality-issues/assignees']['get']['parameters']['query']

export type QualityIssueRead = components['schemas']['IssueRead']

export type QualityIssueStats = components['schemas']['IssueStats']

export type QualityIssueQuarantineRecord = components['schemas']['IssueQuarantineRecord']

export type QualityIssueEvent = components['schemas']['IssueEventRead']

export type QualityIssueFilters = paths['/api/v1/data-quality-issues']['get']['parameters']['query']

export type SubmitQualityResolutionPayload = components['schemas']['SubmitResolution']

export type StaffQualityIssueStatusFilter = 'ASSIGNED' | 'PENDING_VERIFICATION' | 'VERIFIED'

export type CreateQualityIssuePayload = components['schemas']['CreateIssue']

export type AssignQualityIssuePayload = components['schemas']['AssignIssue']

export type VerifyQualityIssuePayload = components['schemas']['SubmitVerification']
