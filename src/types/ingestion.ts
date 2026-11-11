import type { components, paths } from '@/api/schema'

export type IngestionJob = components['schemas']['IngestionJobRead']

export type IngestionJobStats = components['schemas']['IngestionJobStats']

export type IngestionJobMetrics = components['schemas']['IngestionJobMetrics']

export type IngestionAttempt = components['schemas']['IngestionAttemptRead']

export type IngestionJobFilters = paths['/api/v1/ingestion/jobs']['get']['parameters']['query']

export type IngestionJobStatusFilter =
  'QUEUED' | 'RETRY_WAIT' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'REJECTED'

export type IngestionStartPayload = components['schemas']['IngestionStart']

export type IngestionWorker = components['schemas']['IngestionWorkerRead']
