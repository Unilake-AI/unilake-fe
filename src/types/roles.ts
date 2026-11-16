export type RoleCode =
  | 'ADMIN'
  | 'DATA_ADMIN'
  | 'VIEWER'
  | 'ADMISSIONS_MANAGER'
  | 'ADMISSIONS_STAFF'
  | 'ACADEMIC_MANAGER'
  | 'ACADEMIC_STAFF'
  | 'HR_MANAGER'
  | 'HR_STAFF'

export type RoleWorkspace = 'ADMIN' | 'DATA_ADMIN' | 'VIEWER' | 'MANAGER' | 'STAFF'

export interface RoleDefinition {
  code: RoleCode
  name: string
  homePath: string
  description: string
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
}
