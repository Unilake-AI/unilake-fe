import { http } from '@/api/http'
import type { DatasetCreatePayload, DatasetItem } from '@/types/datasets'

export interface CatalogColumn {
  column_name: string
  data_type: string
  is_nullable?: boolean
  description?: string | null
}

export interface CatalogTable {
  table_name: string
  description?: string | null
  columns: CatalogColumn[]
}

export interface ExplorerDataset {
  dataset_id: number
  dataset_code: string
  dataset_name: string
  domain: string
  description?: string | null
  status?: string | null
  source_system_id?: number | null
  created_at?: string | null
  updated_at?: string | null
  layer?: string | null
  last_published_at?: string | null
  tables?: CatalogTable[]
}

export interface ManagerCatalogPage {
  items: ExplorerDataset[]
  total: number
  limit: number
  offset: number
}

export interface LineageStep {
  step_name: string
  layer: string
  artifact_uri?: string | null
  executed_at?: string | null
  status: string
}

export interface ManagerLineage {
  dataset_id: number
  steps: LineageStep[]
  note?: string | null
}

export interface ManagerCatalogFilters {
  domain?: string
  search?: string
  limit?: number
  offset?: number
}

type BackendDataset = Omit<ExplorerDataset, 'tables'> & {
  tables?: {
    name?: string
    table_name?: string
    description?: string | null
    columns: {
      name?: string
      column_name?: string
      data_type: string
      nullable?: boolean
      is_nullable?: boolean
      description?: string | null
    }[]
  }[]
}

function normalizeDataset(dataset: BackendDataset): ExplorerDataset {
  return {
    ...dataset,
    tables: dataset.tables?.map((table) => ({
      table_name: table.table_name ?? table.name ?? '',
      description: table.description,
      columns: table.columns.map((column) => ({
        column_name: column.column_name ?? column.name ?? '',
        data_type: column.data_type,
        is_nullable: column.is_nullable ?? column.nullable,
        description: column.description,
      })),
    })),
  }
}

export async function API_ManagerCatalog(
  params: ManagerCatalogFilters = {}
): Promise<ManagerCatalogPage> {
  const { data } = await http.get<Omit<ManagerCatalogPage, 'items'> & { items: BackendDataset[] }>(
    '/manager/catalog',
    { params }
  )
  return { ...data, items: data.items.map(normalizeDataset) }
}

export async function API_ManagerCatalogDetail(datasetId: number): Promise<ExplorerDataset> {
  const { data } = await http.get<BackendDataset>(`/manager/catalog/${datasetId}`)
  return normalizeDataset(data)
}

type BackendLineageStep = {
  id: number
  source_layer: string
  target_layer: string
  source_label: string
  target_label: string
  created_at: string
  details: { status?: string }
}

export async function API_ManagerCatalogLineage(
  datasetId: number,
  _domain?: string
): Promise<ManagerLineage> {
  const { data } = await http.get<
    Omit<ManagerLineage, 'steps'> & {
      steps: (LineageStep | BackendLineageStep)[]
    }
  >(`/manager/catalog/${datasetId}/lineage`)
  return {
    ...data,
    steps: data.steps
      .map((step) =>
        'target_layer' in step
          ? {
              step_name: `${step.source_label} → ${step.target_label}`,
              layer: step.target_layer,
              executed_at: step.created_at,
              status: step.details.status ?? 'RECORDED',
            }
          : step
      )
      .sort(
        (left, right) =>
          Date.parse(left.executed_at ?? '1970-01-01') -
          Date.parse(right.executed_at ?? '1970-01-01')
      ),
  }
}

export async function API_ManagerCreateDataset(
  payload: DatasetCreatePayload
): Promise<DatasetItem> {
  const res = await http.post<DatasetItem>('/datasets', payload)
  return res.data
}
