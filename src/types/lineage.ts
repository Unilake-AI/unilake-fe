import type { components, paths } from '@/api/schema'

export type LineageFilters = paths['/api/v1/governance/lineage']['get']['parameters']['query']

export type LineageNode = components['schemas']['LineageNode']

export type LineageGraphResponse = components['schemas']['LineageGraphResponse']
