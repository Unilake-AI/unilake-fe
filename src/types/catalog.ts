import type { components } from '@/api/schema'

export interface CatalogField {
  name: string
  data_type: string
  nullable: boolean
  description: string
}

export interface CatalogTable {
  name: string
  description: string
  columns: CatalogField[]
}

export interface CatalogEntry {
  domain_id: string
  dataset: string
  layer: string
  schema_version: string
  description: string
  fields: CatalogField[]
  tables?: CatalogTable[]
}

export type CatalogEntrySchema = components['schemas']['CatalogEntrySchema']

export type DataLayer = components['schemas']['DataLayer']

export type CatalogUpdatePayload = components['schemas']['CatalogUpdateSchema']
