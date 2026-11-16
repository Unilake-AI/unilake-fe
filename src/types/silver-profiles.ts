import type { components, paths } from '@/api/schema'

export type SilverProfileRead = components['schemas']['ProfileRead']

export type SilverProfileDefinition = components['schemas']['SourceProfile']

export type SilverProfileCreate = components['schemas']['ProfileCreate']

export type SilverProfileUpdate = components['schemas']['ProfileUpdate']

export type SilverProfileFilters = paths['/api/v1/pipeline/profiles']['get']['parameters']['query']

export interface SilverProfileMappingRow {
  source: string
  target: string
}
