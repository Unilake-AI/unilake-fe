import { http } from '@/api/http'
import type { LoginSession } from '@/types/session'

export async function API_ListSessions(): Promise<LoginSession[]> {
  const res = await http.get<LoginSession[]>('/auth/sessions')
  return res.data
}

export async function API_RevokeSession(sessionId: number): Promise<void> {
  await http.post(`/auth/revoke-session/${sessionId}`)
}
