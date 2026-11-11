export type DomainCode = 'all' | 'admissions' | 'academic' | 'hr'

export interface DomainDefinition {
  code: DomainCode
  /** Tên đầy đủ hiển thị trong menu chọn phân hệ */
  label: string
  /** Tên ngắn hiển thị trên nút Domain Selector */
  shortLabel: string
  iconName: 'Layers' | 'UserPlus' | 'GraduationCap' | 'BriefcaseBusiness'
}

export interface DomainContextValue {
  domain: DomainDefinition
  availableDomains: DomainDefinition[]
  setDomain: (code: DomainCode) => void
}

export type BusinessDomain = Exclude<DomainCode, 'all'>
