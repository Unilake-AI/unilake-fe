import { http } from '@/api/http'
import type { components } from '@/api/schema'

type Schemas = components['schemas']

export type StaffContext = Schemas['StaffContext']
export type StaffDomainChoice = Schemas['DomainChoice']
export type StaffDepartmentChoice = Schemas['DepartmentChoice']

export async function API_GetStaffContext(): Promise<StaffContext> {
  const res = await http.get<StaffContext>('/staff/context')
  return res.data
}
