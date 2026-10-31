import { beforeEach, describe, expect, it } from 'vitest'

import { formatDateTime, statusTone } from '@/components/page/page-parts'
import type { CatalogEntry, IngestionJob } from '@/types/data'
import { formatGrowth, growthPercent } from '@/views/dashboards/dashboard-data'
import { filterCatalog } from '@/views/data/catalog-view'
import { isJobActive } from '@/views/data/ingestion-view'

import {
  QUERY_HISTORY_KEY,
  addQueryHistory,
  clearQueryHistory,
  readQueryHistory,
} from './query-history'

import type { QueryHistoryEntry } from './query-history'

describe('growthPercent / formatGrowth', () => {
  it('tính phần trăm tăng giảm và định dạng kiểu Việt Nam', () => {
    expect(growthPercent(329, 362)).toBe(10)
    expect(growthPercent(271, 265)).toBe(-2.2)
    expect(growthPercent(0, 10)).toBeNull()
    expect(formatGrowth(10)).toBe('+10,0%')
    expect(formatGrowth(-2.2)).toBe('−2,2%')
    expect(formatGrowth(null)).toBe('—')
  })
})

describe('statusTone', () => {
  it('đổi trạng thái backend sang màu nhãn', () => {
    expect(statusTone('SUCCESS')).toBe('emerald')
    expect(statusTone('running')).toBe('amber')
    expect(statusTone('FAILED')).toBe('rose')
    expect(statusTone(null)).toBe('slate')
  })
})

describe('formatDateTime', () => {
  it('coi thời gian không có múi giờ là UTC và trả — khi rỗng', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('2026-10-17T03:00:00')).toBe(formatDateTime('2026-10-17T03:00:00Z'))
    expect(formatDateTime('không-phải-ngày')).toBe('không-phải-ngày')
  })
})

describe('isJobActive', () => {
  const job = (status: string) => ({ status }) as IngestionJob
  it('chỉ QUEUED và RUNNING là đang chạy', () => {
    expect(isJobActive(job('QUEUED'))).toBe(true)
    expect(isJobActive(job('running'))).toBe(true)
    expect(isJobActive(job('SUCCESS'))).toBe(false)
    expect(isJobActive(job('FAILED'))).toBe(false)
  })
})

describe('filterCatalog', () => {
  const entries: CatalogEntry[] = [
    {
      domain_id: 'demo',
      dataset: 'admissions_gold',
      layer: 'gold',
      schema_version: '1',
      description: 'Data mart tuyển sinh',
      fields: [{ name: 'applicant_id', data_type: 'string', nullable: false, description: '' }],
    },
    {
      domain_id: 'demo',
      dataset: 'hr_raw',
      layer: 'bronze',
      schema_version: '1',
      description: 'Nhân sự thô',
      fields: [{ name: 'employee_id', data_type: 'string', nullable: false, description: '' }],
    },
  ]
  it('tìm theo tên dataset, mô tả hoặc tên cột', () => {
    expect(filterCatalog(entries, '')).toHaveLength(2)
    expect(filterCatalog(entries, 'HR_').map((e) => e.dataset)).toEqual(['hr_raw'])
    expect(filterCatalog(entries, 'tuyển sinh').map((e) => e.dataset)).toEqual(['admissions_gold'])
    expect(filterCatalog(entries, 'employee').map((e) => e.dataset)).toEqual(['hr_raw'])
  })
})

describe('query history', () => {
  const entry = (id: string): QueryHistoryEntry => ({
    id,
    question: `Câu hỏi ${id}`,
    status: 'COMPLETED',
    sql: 'SELECT 1',
    rowCount: 1,
    durationMs: 10,
    askedAt: '2026-10-19T00:00:00Z',
  })

  beforeEach(() => localStorage.clear())

  it('lưu mới nhất lên đầu và xoá được', () => {
    addQueryHistory(entry('a'))
    addQueryHistory(entry('b'))
    expect(readQueryHistory().map((e) => e.id)).toEqual(['b', 'a'])
    clearQueryHistory()
    expect(readQueryHistory()).toEqual([])
  })

  it('bỏ qua dữ liệu hỏng trong localStorage', () => {
    localStorage.setItem(QUERY_HISTORY_KEY, '{không phải json')
    expect(readQueryHistory()).toEqual([])
    localStorage.setItem(QUERY_HISTORY_KEY, '{"a": 1}')
    expect(readQueryHistory()).toEqual([])
  })
})
