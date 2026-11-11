import type { RoleCode } from '@/types/roles'

export interface AuthUser {
  id?: string | number
  username: string
  email?: string
  fullName?: string
  roles: RoleCode[]
}

export interface LoginRequest {
  username: string
  password: string
}

export type LoginFormValues = LoginRequest

export interface LoginUser {
  user_id: number
  username: string
  role: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: LoginUser
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface LogoutRequest {
  refresh_token?: string
}

export interface AuthMeResponse {
  authenticated: boolean
  user: AuthUser | null
}
