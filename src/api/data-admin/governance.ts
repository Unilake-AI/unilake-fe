import { http } from '@/api/http'
import type { components, paths } from '@/api/schema'
import type { CatalogEntry } from '@/types/data'

type Schemas = components['schemas']
type Catalog = Schemas['CatalogEntrySchema']
type LineageFilters = paths['/api/v1/governance/lineage']['get']['parameters']['query']

function catalogPath(domainId: string, dataset: string): string {
  return `/governance/catalog/${encodeURIComponent(domainId)}/${encodeURIComponent(dataset)}`
}

export async function API_GetCatalog(domainId?: string): Promise<CatalogEntry[]> {
  const res = await http.get<Catalog[]>('/governance/catalog', {
    params: domainId ? { domain_id: domainId } : undefined,
  })
  return res.data.map((entry) => ({
    ...entry,
    fields: (entry.fields ?? []).map((field) => ({
      ...field,
      description: field.description ?? '',
      nullable: field.nullable ?? true,
    })),
  }))
}

export async function API_GetCatalogDetail(domainId: string, dataset: string): Promise<Catalog> {
  const res = await http.get<Catalog>(catalogPath(domainId, dataset))
  return res.data
}

export async function API_CreateCatalog(payload: Catalog): Promise<Catalog> {
  const res = await http.post<Catalog>('/governance/catalog', payload)
  return res.data
}

export async function API_UpdateCatalog(
  domainId: string,
  dataset: string,
  payload: Schemas['CatalogUpdateSchema']
): Promise<Catalog> {
  const res = await http.patch<Catalog>(catalogPath(domainId, dataset), payload)
  return res.data
}

export async function API_DeleteCatalog(domainId: string, dataset: string): Promise<void> {
  await http.delete(catalogPath(domainId, dataset))
}

export async function API_GetLineage(
  params?: LineageFilters
): Promise<Schemas['LineageGraphResponse']> {
  const res = await http.get<Schemas['LineageGraphResponse']>('/governance/lineage', { params })
  return res.data
}
