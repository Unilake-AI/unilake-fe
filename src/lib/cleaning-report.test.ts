import { afterEach, describe, expect, it, vi } from 'vitest'

import { cleaningReportCsv, downloadCleaningReport, issueLevel } from './cleaning-report'

describe('Báo cáo làm sạch', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('giữ ô trống hợp lệ là thông tin, dòng cách ly là lỗi', () => {
    expect(
      issueLevel({ code: 'NULL_VALUE_PRESERVED', severity: 'INFO', disposition: 'PRESERVED' })
    ).toBe('information')
    expect(issueLevel({ disposition: 'QUARANTINED' })).toBe('error')
    expect(issueLevel({ disposition: 'COLLAPSED' })).toBe('information')
  })

  it('CSV có trạng thái cuối, tiếng Việt và giữ tên cột như dữ liệu chữ', () => {
    const csv = cleaningReportCsv({
      run_id: 'r1',
      publication_status: 'PUBLISHED',
      records_published: 20000,
      issues: [
        {
          code: 'NULL_VALUE_PRESERVED',
          severity: 'INFO',
          disposition: 'PRESERVED',
          field: '=1+1',
          locator: 'record:2',
        },
      ],
    })
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('PUBLISHED')
    expect(csv).toContain('20000')
    expect(csv).toContain('Ghi nhận xử lý hợp lệ')
    expect(csv).toContain('Ô trống được giữ nguyên theo quy định')
    expect(csv).toContain("'=1+1")
  })

  it('tạo file tải xuống thực sự và thu hồi đường dẫn sau khi trình duyệt nhận file', () => {
    vi.useFakeTimers()
    const create = vi.fn((blob: Blob | MediaSource) => {
      expect(blob).toBeInstanceOf(Blob)
      return 'blob:test-report'
    })
    const revoke = vi.fn()
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = create
        static override revokeObjectURL = revoke
      }
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      expect(this.download).toBe('cleaning-report-r1.json')
      expect(this.href).toBe('blob:test-report')
    })
    downloadCleaningReport({ status: 'PUBLISHED' }, 'r1', 'json')
    expect(click).toHaveBeenCalledOnce()
    expect(create.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
    expect(document.querySelector('a[download]')).toBeNull()
    vi.runOnlyPendingTimers()
    expect(revoke).toHaveBeenCalledWith('blob:test-report')
  })
})
