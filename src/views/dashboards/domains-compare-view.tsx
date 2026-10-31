'use client'

import { useRouter } from 'next/navigation'

import { ArrowRight } from 'lucide-react'

import { Card, MockNotice, PageHeader, ProgressRow, Tag } from '@/components/page/page-parts'
import type { Tone } from '@/components/page/page-parts'
import type { DomainCode } from '@/config/domains'
import { useDomain } from '@/hooks/use-domain'

import { ACADEMIC, ADMISSIONS, HR } from './dashboard-data'

const PANELS: {
  code: Exclude<DomainCode, 'all'>
  title: string
  kpis: { label: string; value: string }[]
  chartTitle: string
  rows: { label: string; value: string; percent: number }[]
}[] = [
  {
    code: 'admissions',
    title: 'Tuyển sinh',
    kpis: ADMISSIONS.kpis.filter((k) => k.label !== 'Trúng tuyển').slice(0, 4),
    chartTitle: 'Thực hiện chỉ tiêu theo ngành',
    rows: ADMISSIONS.majors.slice(0, 3),
  },
  {
    code: 'academic',
    title: 'Đào tạo',
    kpis: ACADEMIC.kpis,
    chartTitle: 'GPA trung bình theo ngành',
    rows: ACADEMIC.majors.slice(0, 3),
  },
  {
    code: 'hr',
    title: 'Nhân sự',
    kpis: HR.kpis,
    chartTitle: 'Giảng viên theo đơn vị',
    rows: HR.units.slice(0, 3),
  },
]

const TARGETS: {
  domain: string
  metric: string
  actual: string
  target: string
  diff: string
  status: string
  tone: Tone
}[] = [
  {
    domain: 'Tuyển sinh',
    metric: 'Số sinh viên nhập học',
    actual: '1.750',
    target: '1.700',
    diff: '+50',
    status: 'ĐẠT',
    tone: 'emerald',
  },
  {
    domain: 'Tuyển sinh',
    metric: 'Tỷ lệ chuyển đổi trúng tuyển → nhập học',
    actual: '80,3%',
    target: '78%',
    diff: '+2,3 đ%',
    status: 'ĐẠT',
    tone: 'emerald',
  },
  {
    domain: 'Đào tạo',
    metric: 'Tỷ lệ tốt nghiệp đúng hạn',
    actual: '86,4%',
    target: '85%',
    diff: '+1,4 đ%',
    status: 'ĐẠT',
    tone: 'emerald',
  },
  {
    domain: 'Nhân sự',
    metric: 'Giảng viên có học vị Tiến sĩ',
    actual: '62,5%',
    target: '70%',
    diff: '−7,5 đ%',
    status: 'CHƯA ĐẠT',
    tone: 'amber',
  },
  {
    domain: 'Nhân sự',
    metric: 'Tỷ lệ SV / GV khối CNTT & AI',
    actual: '27,8',
    target: '≤ 25,0',
    diff: '+2,8',
    status: 'QUÁ TẢI',
    tone: 'rose',
  },
]

export function DomainsCompareView({ detailHref }: { detailHref: string }) {
  const router = useRouter()
  const { setDomain } = useDomain()

  function openDomain(code: Exclude<DomainCode, 'all'>) {
    setDomain(code)
    router.push(detailHref)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Điều hành', 'Dashboard theo phân hệ']}
        title="Dashboard theo phân hệ"
        description="So sánh nhanh ba phân hệ Tuyển sinh, Đào tạo, Nhân sự. Bấm một phân hệ để xem dashboard chi tiết."
        actions={<Tag tone="amber">Gold Layer · 3 data mart</Tag>}
      />
      <MockNotice api="GET /dashboard/*/overview" />

      <div className="grid gap-4 xl:grid-cols-3">
        {PANELS.map((panel) => (
          <Card
            key={panel.code}
            title={panel.title}
            right={
              <button
                type="button"
                onClick={() => openDomain(panel.code)}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline"
              >
                Xem chi tiết
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            }
            bodyClassName="space-y-4"
          >
            <dl className="grid grid-cols-2 gap-3">
              {panel.kpis.map((kpi) => (
                <div key={kpi.label}>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {kpi.label}
                  </dt>
                  <dd className="font-mono text-lg font-bold text-slate-900">{kpi.value}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">{panel.chartTitle}</p>
              {panel.rows.map((row) => (
                <ProgressRow key={row.label} {...row} />
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card
        title="Chỉ số trọng tâm theo phân hệ"
        subtitle="Thực tế so với mục tiêu năm học"
        right={<Tag>Plan vs. Actual</Tag>}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {['Phân hệ', 'Chỉ số', 'Thực tế', 'Mục tiêu', 'Chênh lệch', 'Tình trạng'].map(
                  (h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TARGETS.map((row) => (
                <tr key={row.metric}>
                  <td className="px-3 py-2.5 text-slate-600">{row.domain}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{row.metric}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.actual}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.target}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.diff}</td>
                  <td className="px-3 py-2.5">
                    <Tag tone={row.tone}>{row.status}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
