import axios from 'axios'

import { http } from '@/api/http'
import type { RoleCode } from '@/types/roles'

export interface Account {
  user_id: number
  username: string
  full_name: string | null
  is_active: boolean
  roles: string[]
  departments: { department_id: number; department_name: string }[]
  employee_id?: number | null
}

export interface AccountSummary {
  total: number
  active: number
  departments: { department_id?: number; department_name: string; accounts: number }[]
}

export interface DepartmentItem {
  department_id: number
  department_code?: string
  department_name: string
  is_active?: boolean
}

export interface PositionItem {
  position_id: number
  position_code?: string
  position_name: string
}

export interface OrganizationData {
  departments: DepartmentItem[]
  positions: PositionItem[]
}

export interface EmployeeItem {
  employee_id: number
  employee_code?: string
  full_name: string
  email?: string | null
  is_active?: boolean
}

export interface AssignmentCreatePayload {
  employee_id: number
  department_id: number
  position_id: number
  start_date: string
  end_date?: string | null
  is_primary?: boolean
}

export interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}

export function parseValidationErrors(error: unknown): ValidationErrorItem[] | null {
  if (axios.isAxiosError(error) && error.response?.status === 422) {
    const detail = error.response.data?.detail
    if (Array.isArray(detail)) {
      return detail.map((item) => ({
        loc: Array.isArray(item.loc) ? item.loc : [String(item.loc ?? '')],
        msg: String(item.msg || 'Dữ liệu không hợp lệ'),
        type: String(item.type || 'validation_error'),
      }))
    }
  }
  return null
}

export interface AuditEvent {
  event_id: number
  occurred_at: string
  username: string
  action: string
  target_id: number | null
  outcome: 'SUCCESS' | 'REJECTED'
  changes: Record<string, unknown> | null
  error_code: string | null
}

export interface DomainOwnerAuditEvent {
  grant_id: string
  user_id: number
  actor_id: string
  domain: string
  action: 'GRANTED' | 'REVOKED'
  occurred_at: string
  outcome: 'SUCCESS'
}

export async function listAccounts(search: string, offset: number, limit = 20) {
  const { data } = await http.get<Account[]>('/users', { params: { search, offset, limit } })
  return data
}

export async function getAccountSummary() {
  const { data } = await http.get<AccountSummary>('/users/summary')
  return data
}

export async function createAccount(
  username: string,
  password: string,
  roles: RoleCode[]
): Promise<{ user_id: number }> {
  const { data } = await http.post<{ user_id: number }>('/users', { username, password, roles })
  return data
}

export async function updateAccountAccess(account: Account, roles: RoleCode[], isActive: boolean) {
  await http.patch(`/users/${account.user_id}/access`, {
    roles,
    is_active: isActive,
    expected_roles: account.roles,
    expected_is_active: account.is_active,
  })
}

export async function getOrganization(): Promise<OrganizationData> {
  const { data } = await http.get<OrganizationData>('/users/organization')
  return data
}

export async function listEmployees(
  search = '',
  offset = 0,
  limit = 50
): Promise<EmployeeItem[]> {
  const { data } = await http.get<EmployeeItem[]>('/users/employees', {
    params: { search, offset, limit },
  })
  return data
}

export async function linkEmployee(
  userId: number,
  employeeId: number,
  expectedEmployeeId: number | null = null
) {
  await http.patch(`/users/${userId}/employee`, {
    employee_id: employeeId,
    expected_employee_id: expectedEmployeeId,
  })
}

export async function createAssignment(payload: AssignmentCreatePayload) {
  const { data } = await http.post('/users/assignments', payload)
  return data
}

export async function listAuditEvents(offset: number, limit = 20) {
  const { data } = await http.get<AuditEvent[]>('/users/audit', { params: { offset, limit } })
  return data
}

export async function listDomainOwnerAuditEvents(offset: number, limit = 20) {
  const { data } = await http.get<DomainOwnerAuditEvent[]>(
    '/pipeline/profiles/owners/grants/audit',
    {
      params: { offset, limit },
    }
  )
  return data
}
