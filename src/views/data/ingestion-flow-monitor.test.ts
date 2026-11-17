import { describe, expect, it } from 'vitest'

import type { GoldSource } from '@/api/admindata/gold'
import type { IngestionFlow, IngestionFlowStep } from '@/api/admindata/ingestion-flows'

import { pipelineStages } from './ingestion-flow-monitor'

function step(key: string, state: IngestionFlowStep['state'], detail = ''): IngestionFlowStep {
  return { key, label: key, state, detail, at: null }
}

const flow: IngestionFlow = {
  ingestion_job_id: 12,
  dataset_id: 3,
  dataset_name: 'Bộ dữ liệu',
  domain: 'academic',
  filename: null,
  uploaded_by: null,
  created_at: null,
  ingestion_status: 'SUCCESS',
  bronze_rows: 10,
  auto_job_id: 'silver-job',
  silver_status: 'SUCCESS',
  error_code: null,
  run_id: null,
  snapshot_id: 'snapshot-12',
  records_read: 10,
  records_passed: 10,
  records_quarantined: 0,
  records_published: 10,
  steps: [
    step('received', 'done'),
    step('bronze', 'done'),
    step('cleaning', 'done'),
    step('publication', 'done'),
  ],
}
const gold: GoldSource = {
  scope: 'scope',
  silver_snapshot_id: 'snapshot-12',
  dataset_id: 3,
  dataset_name: 'Bộ dữ liệu',
  domain: 'academic',
  job_id: 'gold-job',
  status: 'SUCCEEDED',
  sync_status: 'CURRENT',
  error_code: null,
}

describe('Trạng thái luồng nạp', () => {
  it('chỉ hiển thị Gold khi đúng phiên bản Silver và bộ dữ liệu', () => {
    expect(pipelineStages(flow, undefined, [gold]).map(({ status }) => status)).toEqual([
      'SUCCESS',
      'SUCCESS',
      'PUBLISHED',
      'SUCCEEDED',
    ])
    expect(
      pipelineStages(flow, undefined, [
        { ...gold, silver_snapshot_id: 'old-snapshot' },
        { ...gold, dataset_id: 9 },
      ])[3]?.status
    ).toBe('UNKNOWN')
  })

  it('giữ Bronze thất bại và Silver chưa chạy dù nhận được bản ghi Gold cũ', () => {
    const failed = {
      ...flow,
      ingestion_status: 'FAILED',
      steps: [step('received', 'done'), step('bronze', 'failed'), step('publication', 'pending')],
    }
    expect(pipelineStages(failed, undefined, [gold]).map(({ status }) => status)).toEqual([
      'SUCCESS',
      'FAILED',
      'NOT_STARTED',
      'UNKNOWN',
    ])
  })

  it.each([
    ['blocked', 'Chất lượng chưa đạt điều kiện công bố', 'BLOCKED'],
    ['blocked', 'Lượt này chỉ làm sạch, không công bố Silver', 'SKIPPED'],
    ['pending', 'Chưa bắt đầu', 'UNKNOWN'],
  ] as const)(
    'không coi cleaning hoàn tất là Silver đã công bố (%s, %s)',
    (state, detail, expected) => {
      const steps = [...flow.steps.slice(0, -1), step('publication', state, detail)]
      const stages = pipelineStages({ ...flow, steps }, undefined, [gold])
      expect(stages[2]).toMatchObject({ status: expected, done: false })
      expect(stages[3]).toMatchObject({ status: 'UNKNOWN', done: false })
    }
  )
})
