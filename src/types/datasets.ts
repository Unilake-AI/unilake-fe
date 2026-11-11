import type { components, paths } from '@/api/schema'

export type DatasetItem = components['schemas']['DatasetRead']

export type DatasetFilters = paths['/api/v1/datasets']['get']['parameters']['query']

export type SourceSystemRead = components['schemas']['SourceSystemRead']

export type DatasetCreatePayload = components['schemas']['DatasetCreate']
