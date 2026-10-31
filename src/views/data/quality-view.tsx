'use client'

import { useState } from 'react'

import { Play } from 'lucide-react'

import {
  Button,
  Card,
  KpiCard,
  MockNotice,
  PageHeader,
  Tag,
  statusTone,
} from '@/components/page/page-parts'
import type { Tone } from '@/components/page/page-parts'
import { cn } from '@/lib/utils'

const DIMENSIONS = [
  { label: 'Completeness (Đầy đủ)', value: '97,2%', hint: 'Không khuyết trường bắt buộc' },
  { label: 'Validity (Hợp lệ)', value: '95,4%', hint: '2 cảnh báo' },
  { label: 'Uniqueness (Duy nhất)', value: '98,9%', hint: 'Không trùng hồ sơ' },
  { label: 'Consistency (Nhất quán)', value: '96,1%', hint: 'Khớp danh mục dùng chung' },
]

const SEVERITY_TONE: Record<string, Tone> = { CRITICAL: 'rose', HIGH: 'amber', MEDIUM: 'sky' }

const ISSUES = [
  {
    id: 'DQ-2026-014',
    rule: 'VALID_CITIZEN_ID_FORMAT',
    dimension: 'Validity',
    layer: 'BRONZE',
    severity: 'HIGH',
    failed: '14 / 4.520',
    status: 'ĐANG XỬ LÝ',
    statusTone: 'amber' as Tone,
    dataset: 'bronze_raw_admissions',
    field: 'applicant.national_id',
    detectedAt: '2026-09-25 04:12:00',
    rate: '14 / 4.520 (0,31%)',
    note: 'Số CCCD không đủ 12 chữ số hợp lệ. Bản ghi mẫu đã che PII: UL-RAW-1082 · UL-RAW-1094 · UL-RAW-1102.',
  },
  {
    id: 'DQ-2026-018',
    rule: 'GPA_RANGE_CHECK_0_10',
    dimension: 'Validity',
    layer: 'SILVER',
    severity: 'MEDIUM',
    failed: '6 / 18.413',
    status: 'MỚI',
    statusTone: 'sky' as Tone,
    dataset: 'silver_academic_enrollment',
    field: 'enrollment.gpa',
    detectedAt: '2026-09-27 08:40:00',
    rate: '6 / 18.413 (0,03%)',
    note: 'Điểm GPA nằm ngoài khoảng 0 – 10 sau khi quy đổi thang điểm.',
  },
  {
    id: 'DQ-2026-009',
    rule: 'DEDUPLICATE_NATIONAL_REG_ID',
    dimension: 'Uniqueness',
    layer: 'SILVER',
    severity: 'CRITICAL',
    failed: '3 / 4.506',
    status: 'ĐÃ KHẮC PHỤC',
    statusTone: 'emerald' as Tone,
    dataset: 'silver_admissions_applicant',
    field: 'applicant.national_reg_id',
    detectedAt: '2026-09-21 02:05:00',
    rate: '3 / 4.506 (0,07%)',
    note: 'Ba hồ sơ trùng số báo danh quốc gia, đã gộp theo quy tắc ưu tiên bản ghi mới nhất.',
  },
  {
    id: 'DQ-2026-022',
    rule: 'PROGRAM_MAJOR_CODE_REGISTRY',
    dimension: 'Consistency',
    layer: 'GOLD',
    severity: 'MEDIUM',
    failed: '2 / 9',
    status: 'MỚI',
    statusTone: 'sky' as Tone,
    dataset: 'gold_admissions_mart',
    field: 'major.major_code',
    detectedAt: '2026-10-02 10:30:00',
    rate: '2 / 9 (22,2%)',
    note: 'Hai mã ngành chưa có trong danh mục ngành dùng chung.',
  },
]

export function QualityView() {
  const [selectedId, setSelectedId] = useState(ISSUES[0]!.id)
  const selected = ISSUES.find((issue) => issue.id === selectedId) ?? ISSUES[0]!

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Data Quality']}
        title="Data Quality — Giám sát chất lượng dữ liệu"
        description="Kiểm tra Completeness, Validity, Uniqueness, Consistency qua các tầng Bronze → Silver → Gold. Mục tiêu ≥ 90% (NFR03)."
        actions={
          <Button
            variant="primary"
            icon={<Play className="size-3.5" aria-hidden="true" />}
            disabled
          >
            Chạy kiểm tra
          </Button>
        }
      />
      <MockNotice api="GET /governance/quality" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Điểm chất lượng tổng"
          value="96,8%"
          hint="Đạt ngưỡng tin cậy ≥ 90%"
          tone="emerald"
        />
        {DIMENSIONS.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card
          title="Danh sách vấn đề chất lượng dữ liệu"
          subtitle={`${ISSUES.length} vấn đề`}
          right={
            <Tag tone="amber">
              {ISSUES.filter((i) => i.statusTone !== 'emerald').length} đang mở
            </Tag>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {['Mã / Quy tắc', 'Chiều', 'Tầng', 'Mức độ', 'Bản ghi lỗi', 'Trạng thái'].map(
                    (head) => (
                      <th key={head} scope="col" className="px-3 py-2 font-medium">
                        {head}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ISSUES.map((issue) => (
                  <tr
                    key={issue.id}
                    className={cn(
                      'cursor-pointer',
                      issue.id === selected.id ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                    )}
                    onClick={() => setSelectedId(issue.id)}
                  >
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setSelectedId(issue.id)}
                        aria-pressed={issue.id === selected.id}
                      >
                        <span className="block font-mono font-semibold text-slate-900">
                          {issue.id}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{issue.rule}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{issue.dimension}</td>
                    <td className="px-3 py-2.5">
                      <Tag tone={statusTone(issue.layer)}>{issue.layer}</Tag>
                    </td>
                    <td className="px-3 py-2.5">
                      <Tag tone={SEVERITY_TONE[issue.severity] ?? 'slate'}>{issue.severity}</Tag>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{issue.failed}</td>
                    <td className="px-3 py-2.5">
                      <Tag tone={issue.statusTone}>{issue.status}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Chi tiết vấn đề" subtitle={selected.id}>
          <dl className="space-y-2.5 text-xs">
            {[
              ['Quy tắc vi phạm', selected.rule],
              ['Dataset', selected.dataset],
              ['Trường', selected.field],
              ['Phát hiện lúc', selected.detectedAt],
              ['Tỷ lệ lỗi', selected.rate],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-mono font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 rounded-md bg-slate-50 p-2.5 text-xs leading-5 text-slate-600">
            {selected.note}
          </p>
        </Card>
      </div>
    </div>
  )
}
