import type * as React from 'react'

export type SourceType = 'CSV' | 'EXCEL' | 'JSON' | 'REST_API' | 'POSTGRESQL'

export interface DataSourceItem {
  data_source_id: number
  source_system_id: number
  source_system_name: string | null
  source_name: string
  source_type: string
  connection_type: string | null
  location: string | null
  description: string | null
  is_active: boolean
  last_ingested_at: string | null
  last_ingestion_status: string | null
  ingestion_count: number
  created_by: number | null
  created_at: string
  updated_at: string | null
}

export interface DataSourceListResponse {
  items: DataSourceItem[]
  total: number
  page: number
  page_size: number
}

export interface DataSourceFilter {
  source_system_id?: number
  source_type?: string
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface DataSourceCreatePayload {
  source_system_id: number
  source_name: string
  source_type: SourceType
  connection_type: string
  location: string
  configuration: Record<string, unknown>
  description?: string | null
  is_active: boolean
}

export interface DataSourceConfigField {
  key: string
  label: string
  kind: 'text' | 'number' | 'boolean' | 'select' | 'json' | 'password'
  required: boolean
  options?: string[]
  defaultValue: string
  hint?: string
}

export type DataSourceStatusFilter = 'all' | 'active' | 'inactive'

export interface DataSourceFormFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}
