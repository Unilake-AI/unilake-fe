export type RoleCode = 'ADMIN' | 'DATA_ADMIN' | 'ANALYST' | 'MANAGER' | 'VIEWER'

export interface AuthUser {
  id?: string | number
  username: string
  email?: string
  fullName?: string
  roles: RoleCode[]
}

export interface RoleDefinition {
  code: RoleCode
  name: string
  homePath: string
  description: string
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export interface MenuItem {
  title: string
  href: string
  iconName: string
  badge?: string
  description?: string
}

export interface MenuGroup {
  groupTitle?: string
  items: MenuItem[]
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

export interface ApiErrorBody {
  error?: { code?: string; message?: string }
  detail?: string
  message?: string
}

export interface AuthMeResponse {
  authenticated: boolean
  user: AuthUser | null
}
