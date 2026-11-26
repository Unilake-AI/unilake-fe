export type UploadDomain = 'hr' | 'academic' | 'admissions'

export type StaffImportDateFormat = '%Y-%m-%d' | '%d/%m/%Y' | '%m/%d/%Y'

export interface StaffImportOptions {
  import_type: string
  version: string
  field_mapping?: Record<string, string>
  ignored_columns?: string[]
  date_format?: StaffImportDateFormat
}

export interface StaffImportType {
  import_type: string
  version: string
  domain: UploadDomain
  label: string
  enabled: boolean
  fields: { name: string; aliases: string[]; kind: string }[]
}

export interface UploadFileLayout {
  columns: string[]
  sheet_names: string[]
  sheet_name: string | null
}

export interface StaffImportIssue {
  code: string
  field?: string | null
  column?: string | null
  columns?: string[] | Record<string, string>
  locator?: string
  message?: string
}

export interface StaffImportLayout {
  status: 'MAPPED' | 'NEEDS_MAPPING'
  field_mapping: Record<string, string>
  issues?: StaffImportIssue[]
  suggested_workflow?: string | null
}

export interface StaffImportReport {
  silver_status?: string | null
  silver_error?: string | null
  gold_status?: string | null
  gold_error?: string | null
  database_status?: string | null
  database_error?: string | null
  database_committed: boolean
  error_report?: { code: string; issue_count?: number; issues?: StaffImportIssue[] } | null
}

export type UploadIngestionParams = {
  file: File
  parserOptions?: Record<string, unknown>
  importOptions?: StaffImportOptions
  onUploadProgress?: (percent: number) => void
} & (
  | { mode: 'existing'; datasetId: number }
  | { mode: 'new'; datasetName: string; description?: string; domain?: UploadDomain }
)
