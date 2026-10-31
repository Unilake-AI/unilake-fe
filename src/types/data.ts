/** Kiểu dữ liệu khớp với các schema Pydantic của backend (thư mục backend/app/modules). */

export type SourceType = 'CSV' | 'EXCEL' | 'JSON' | 'REST_API'

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

export interface IngestionJob {
  ingestion_job_id: number
  data_source_id: number
  dataset_id: number
  status: string
  stage: string | null
  source_table: string | null
  created_at: string | null
  started_at: string | null
  finished_at: string | null
  requested_by: string | null
  rows_read: number | null
  rows_written: number | null
  rows_rejected: number | null
  error_message: string | null
  output: Record<string, unknown> | null
}

export interface IngestionJobCreatePayload {
  data_source_id: number
  dataset_id: number
  source_table: string
}

export interface CatalogField {
  name: string
  data_type: string
  nullable: boolean
  description: string
}

export interface CatalogEntry {
  domain_id: string
  dataset: string
  layer: string
  schema_version: string
  description: string
  fields: CatalogField[]
}

export interface NlqResponse {
  sql: string
  rows: Record<string, unknown>[]
}
