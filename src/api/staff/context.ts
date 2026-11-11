import { http } from '@/api/http'
import type { StaffContext } from '@/types/staff-context'

export async function API_GetStaffContext(): Promise<StaffContext> {
  const res = await http.get<StaffContext>('/staff/context')
  return res.data
}
