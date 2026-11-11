export interface LoginSession {
  login_session_id: number
  login_at: string
  ip_address: string | null
  user_agent: string | null
  session_status: string
}

export interface StoredSession {
  access_token: string
  refresh_token?: string | null
  user?: unknown
}
