import { TriangleAlert } from 'lucide-react'

import {
  Card,
  KpiCard,
  MockNotice,
  PageHeader,
  ProgressRow,
  Tag,
} from '@/components/page/page-parts'
import type { Tone } from '@/components/page/page-parts'

const KPIS = [
  {
    label: 'Quy mô người học',
    value: '18.450',
    hint: 'Tân sinh viên: 1.750 (102,9% chỉ tiêu)',
    tone: 'emerald' as Tone,
  },
  { label: 'Tốt nghiệp đúng hạn', value: '86,4%', hint: 'GPA trung bình: 3,24 / 4,0' },
  { label: 'Giảng viên cơ hữu', value: '842', hint: 'Tỷ lệ SV / GV: 21,9' },
  {
    label: 'Chất lượng dữ liệu',
    value: '96,8%',
    hint: 'Đạt ngưỡng tin cậy ≥ 90% (NFR03)',
    tone: 'emerald' as Tone,
  },
]

const ALERTS = [
  {
    title: 'Tỷ lệ SV / GV khối CNTT & AI vượt chuẩn',
    body: 'Khối Khoa học Máy tính & Trí tuệ Nhân tạo tuyển sinh tăng 26,9% nhưng chỉ có 148 giảng viên cơ hữu. Tỷ lệ hiện tại 27,8 SV/GV, vượt ngưỡng khuyến nghị 25,0.',
  },
  {
    title: 'Hai ngành tuyển sinh đạt dưới 70% chỉ tiêu',
    body: 'Kỹ thuật Môi trường (64,2%) và Triết học Ứng dụng (58,0%) có tỷ lệ xác nhận nhập học thấp hai khoá liên tiếp.',
  },
]

const TARGETS = [
  {
    label: 'Chỉ tiêu tuyển sinh toàn trường',
    value: '1.750 / 1.700',
    percent: 100,
    tone: 'emerald' as const,
  },
  {
    label: 'Tỷ lệ tốt nghiệp đúng hạn',
    value: '86,4% / 85%',
    percent: 100,
    tone: 'emerald' as const,
  },
  {
    label: 'Giảng viên có học vị Tiến sĩ',
    value: '62,5% / 70%',
    percent: 89.3,
    tone: 'amber' as const,
  },
  {
    label: 'Dataset đạt ngưỡng Data Quality',
    value: '14 / 15',
    percent: 93.3,
    tone: 'indigo' as const,
  },
]

const FACULTIES: {
  name: string
  group: string
  students: string
  freshmen: string
  lecturers: number
  phd: number
  ratio: string
  status: string
  tone: Tone
}[] = [
  {
    name: 'Khoa học Máy tính & AI',
    group: 'Công nghệ thông tin',
    students: '4.120',
    freshmen: '593',
    lecturers: 148,
    phd: 97,
    ratio: '27,8',
    status: 'QUÁ TẢI',
    tone: 'rose',
  },
  {
    name: 'Kinh tế & Quản trị',
    group: 'Kinh doanh',
    students: '5.010',
    freshmen: '459',
    lecturers: 236,
    phd: 141,
    ratio: '21,2',
    status: 'ĐẠT CHUẨN',
    tone: 'emerald',
  },
  {
    name: 'Kỹ thuật & Công nghệ',
    group: 'Kỹ thuật',
    students: '4.380',
    freshmen: '402',
    lecturers: 214,
    phd: 138,
    ratio: '20,5',
    status: 'ĐẠT CHUẨN',
    tone: 'emerald',
  },
  {
    name: 'Khoa học Xã hội',
    group: 'Xã hội – Nhân văn',
    students: '3.150',
    freshmen: '296',
    lecturers: 132,
    phd: 75,
    ratio: '23,9',
    status: 'THEO DÕI',
    tone: 'amber',
  },
]

export function ExecutiveView() {
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Điều hành', 'Tổng quan']}
        title="Tổng quan điều hành toàn trường"
        description="Bức tranh liên kết ba phân hệ Tuyển sinh – Đào tạo – Nhân sự phục vụ Ban Giám hiệu ra quyết định."
        actions={<Tag tone="amber">Gold Layer · executive_mart_v1</Tag>}
      />
      <MockNotice api="GET /dashboard/executive" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Cảnh báo điều hành trọng tâm"
          subtitle="Tự động tổng hợp từ Gold Layer"
          right={<Tag tone="rose">{ALERTS.length} điểm cần chỉ đạo</Tag>}
        >
          <ul className="space-y-3">
            {ALERTS.map((alert) => (
              <li
                key={alert.title}
                className="flex gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3"
              >
                <TriangleAlert
                  className="mt-px size-4 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{alert.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title="Tiến độ chỉ tiêu chiến lược năm học"
          subtitle="Kế hoạch so với thực tế"
          right={<Tag>Plan vs. Actual</Tag>}
        >
          <div className="space-y-3">
            {TARGETS.map((row) => (
              <ProgressRow key={row.label} {...row} />
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Tương quan tuyển sinh đầu vào & năng lực giảng viên theo khối ngành"
        subtitle="Đối sánh quy mô sinh viên nhập học và đội ngũ giảng viên cơ hữu"
        right={<Tag tone="indigo">Chuẩn Bộ: ≤ 25,0 SV/GV</Tag>}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {[
                  'Khoa / Khối ngành',
                  'Tổng SV',
                  'Tân SV 2026',
                  'Tổng GV',
                  'GV Tiến sĩ+',
                  'Tỷ lệ SV/GV',
                  'Tình trạng',
                ].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FACULTIES.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <p className="text-[11px] text-slate-500">{row.group}</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.students}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.freshmen}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.lecturers}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{row.phd}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">
                    {row.ratio}
                  </td>
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
