import { http } from '@/api/http'

export interface DepartmentOption {
  department_id: number
  department_code: string
  department_name: string
}
export interface AccountItem {
  user_id: number
  username: string
  is_active: boolean
  employee_id: number | null
  full_name: string | null
  roles: string[]
  departments: DepartmentOption[]
}
export interface EmployeeOption {
  employee_id: number
  employee_code: string
  full_name: string
}
export interface AssignmentItem {
  assignment_id: number
  department_name: string
  position_name: string
  start_date: string
  end_date: string | null
  is_primary: boolean
  status: string
}
export const API_ListAccounts = async (search: string, offset: number) =>
  (await http.get<AccountItem[]>('/users', { params: { search, offset, limit: 20 } })).data
export const API_FindEmployees = async (search: string, offset: number) =>
  (await http.get<EmployeeOption[]>('/users/employees', { params: { search, offset, limit: 20 } }))
    .data
export const API_Organization = async () =>
  (
    await http.get<{
      departments: DepartmentOption[]
      positions: { position_id: number; position_name: string }[]
    }>('/users/organization')
  ).data
export const API_EmployeeAssignments = async (id: number) =>
  (await http.get<AssignmentItem[]>(`/users/employees/${id}/assignments`)).data
export const API_LinkEmployee = async (id: number, employeeId: number, expected: number | null) => {
  await http.patch(`/users/${id}/employee`, {
    employee_id: employeeId,
    expected_employee_id: expected,
  })
}
export const API_AddAssignment = async (payload: {
  employee_id: number
  department_id: number
  position_id: number
  start_date: string
  end_date: string | null
  is_primary: boolean
}) => {
  await http.post('/users/assignments', payload)
}
