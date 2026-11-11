import { http } from '@/api/http'
import type { CatalogEntry, CatalogEntrySchema, CatalogUpdatePayload } from '@/types/catalog'
import type { LineageFilters, LineageGraphResponse } from '@/types/lineage'

function catalogPath(domainId: string, dataset: string): string {
  return `/governance/catalog/${encodeURIComponent(domainId)}/${encodeURIComponent(dataset)}`
}

export async function API_GetCatalog(domainId?: string): Promise<CatalogEntry[]> {
  const res = await http.get<CatalogEntrySchema[]>('/governance/catalog', {
    params: domainId ? { domain_id: domainId } : undefined,
  })
  return res.data.map((entry) => ({
    ...entry,
    fields: (entry.fields ?? []).map((field) => ({
      ...field,
      description: field.description ?? '',
      nullable: field.nullable ?? true,
    })),
    tables: (entry.tables ?? []).map((table) => ({
      name: table.name,
      description: table.description ?? '',
      columns: (table.columns ?? []).map((col) => ({
        ...col,
        description: col.description ?? '',
        nullable: col.nullable ?? true,
      })),
    })),
  }))
}

export async function API_GetCatalogDetail(
  domainId: string,
  dataset: string
): Promise<CatalogEntrySchema> {
  const res = await http.get<CatalogEntrySchema>(catalogPath(domainId, dataset))
  return res.data
}

export async function API_CreateCatalog(payload: CatalogEntrySchema): Promise<CatalogEntrySchema> {
  const res = await http.post<CatalogEntrySchema>('/governance/catalog', payload)
  return res.data
}

export async function API_UpdateCatalog(
  domainId: string,
  dataset: string,
  payload: CatalogUpdatePayload
): Promise<CatalogEntrySchema> {
  const res = await http.patch<CatalogEntrySchema>(catalogPath(domainId, dataset), payload)
  return res.data
}

export async function API_DeleteCatalog(domainId: string, dataset: string): Promise<void> {
  await http.delete(catalogPath(domainId, dataset))
}

export async function API_GetLineage(params?: LineageFilters): Promise<LineageGraphResponse> {
  const res = await http.get<LineageGraphResponse>('/governance/lineage', { params })
  return res.data
}
