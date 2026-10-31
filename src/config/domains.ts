export type DomainCode = 'all' | 'admissions' | 'academic' | 'hr'

export interface DomainDefinition {
  code: DomainCode
  /** Tên đầy đủ hiển thị trong menu chọn phân hệ */
  label: string
  /** Tên ngắn hiển thị trên nút Domain Selector */
  shortLabel: string
  iconName: 'Layers' | 'UserPlus' | 'GraduationCap' | 'BriefcaseBusiness'
}

/** Ba phân hệ nghiệp vụ trong phạm vi V1.0, cộng lựa chọn xem tất cả. */
export const DOMAINS: DomainDefinition[] = [
  { code: 'all', label: 'Tất cả phân hệ', shortLabel: 'Tất cả phân hệ', iconName: 'Layers' },
  {
    code: 'admissions',
    label: 'Tuyển sinh (Admissions)',
    shortLabel: 'Tuyển sinh',
    iconName: 'UserPlus',
  },
  {
    code: 'academic',
    label: 'Đào tạo (Academic)',
    shortLabel: 'Đào tạo',
    iconName: 'GraduationCap',
  },
  { code: 'hr', label: 'Nhân sự (HR)', shortLabel: 'Nhân sự', iconName: 'BriefcaseBusiness' },
]

export const DEFAULT_DOMAIN: DomainCode = 'all'

export const DOMAIN_STORAGE_KEY = 'unilake.domain'

export function isDomainCode(value: unknown): value is DomainCode {
  return DOMAINS.some((domain) => domain.code === value)
}

export function getDomain(code: DomainCode): DomainDefinition {
  return DOMAINS.find((domain) => domain.code === code) ?? DOMAINS[0]!
}
