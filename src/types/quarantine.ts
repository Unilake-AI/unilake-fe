import type { components, paths } from '@/api/schema'

export type QuarantineRecordFilters =
  paths['/api/v1/quarantine-records']['get']['parameters']['query']

export type QuarantineSummaryFilters =
  paths['/api/v1/quarantine-records/summary']['get']['parameters']['query']

export type QuarantineRecord = components['schemas']['QuarantineRecordRead']

export type QuarantineSummary = components['schemas']['QuarantineSummary']

export type QuarantineRecordDetail = components['schemas']['QuarantineRecordDetail']
