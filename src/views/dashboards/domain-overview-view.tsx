'use client'

import Link from 'next/link'

import { Sparkles } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Card,
  KpiCard,
  MockNotice,
  PageHeader,
  ProgressRow,
  Tag,
} from '@/components/page/page-parts'
import { DOMAINS } from '@/config/domains'
import type { DomainCode } from '@/config/domains'
import { useDomain } from '@/hooks/use-domain'
import { cn } from '@/lib/utils'

import { ACADEMIC, ADMISSIONS, HR } from './dashboard-data'

type BusinessDomain = Exclude<DomainCode, 'all'>

const CHART_COLORS = { primary: '#4f46e5', secondary: '#0ea5e9', tertiary: '#f59e0b' }

function DomainTabs({
  value,
  onChange,
}: {
  value: BusinessDomain
  onChange: (code: BusinessDomain) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Phân hệ"
      className="inline-flex rounded-md border border-slate-200 bg-white p-0.5"
    >
      {DOMAINS.filter((d) => d.code !== 'all').map((d) => (
        <button
          key={d.code}
          type="button"
          role="tab"
          aria-selected={value === d.code}
          onClick={() => onChange(d.code as BusinessDomain)}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium',
            value === d.code ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          {d.shortLabel}
        </button>
      ))}
    </div>
  )
}

function AdmissionsDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ADMISSIONS.kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card
          title="Xu hướng tuyển sinh"
          subtitle="So sánh chỉ số qua các năm 2022 – 2026"
          right={<Tag>Gold Mart History</Tag>}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ADMISSIONS.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="register"
                  name="Đăng ký"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="admitted"
                  name="Trúng tuyển"
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="enrolled"
                  name="Nhập học"
                  stroke={CHART_COLORS.tertiary}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card
          title="Phễu tuyển sinh"
          subtitle="Nộp hồ sơ → Trúng tuyển → Nhập học (2026)"
          right={<Tag>3 bước</Tag>}
        >
          <div className="space-y-3">
            {ADMISSIONS.funnel.map((row) => (
              <ProgressRow key={row.label} {...row} />
            ))}
            <p className="text-[11px] text-slate-500">
              Tỷ lệ chuyển đổi Trúng tuyển → Nhập học: 80,3%
            </p>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Thực hiện chỉ tiêu theo ngành"
          subtitle="Nhập học thực tế so với chỉ tiêu giao"
        >
          <div className="space-y-3">
            {ADMISSIONS.majors.map((row) => (
              <ProgressRow
                key={row.label}
                {...row}
                tone={row.percent >= 100 ? 'emerald' : 'indigo'}
              />
            ))}
          </div>
        </Card>
        <Card title="Cơ cấu theo phương thức tuyển sinh" subtitle="Số nhập học và tỷ lệ chuyển đổi">
          <div className="space-y-3">
            {ADMISSIONS.methods.map((row) => (
              <ProgressRow key={row.label} {...row} tone={row.percent < 70 ? 'amber' : 'indigo'} />
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function AcademicDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ACADEMIC.kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="GPA trung bình theo học kỳ" subtitle="Xu hướng 5 học kỳ gần nhất">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={ACADEMIC.gpaTrend}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[2.8, 3.4]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="gpa"
                  name="GPA trung bình"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Điểm trung bình theo ngành" subtitle="Thang điểm 4,0">
          <div className="space-y-3">
            {ACADEMIC.majors.map((row) => (
              <ProgressRow key={row.label} {...row} />
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function HrDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {HR.kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Giảng viên theo trình độ chuyên môn">
          <div className="space-y-3">
            {HR.degrees.map((row) => (
              <ProgressRow key={row.label} {...row} />
            ))}
          </div>
        </Card>
        <Card title="Giảng viên theo đơn vị" subtitle="Số giảng viên cơ hữu">
          <div className="space-y-3">
            {HR.units.map((row) => (
              <ProgressRow key={row.label} {...row} />
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

const DOMAIN_META: Record<
  BusinessDomain,
  { title: string; description: string; mart: string; api: string }
> = {
  admissions: {
    title: 'Tổng quan Tuyển sinh',
    description: 'Giám sát chỉ số tuyển sinh trọng yếu và xu hướng nhập học.',
    mart: 'admissions_mart_v1',
    api: 'GET /dashboard/admissions/overview',
  },
  academic: {
    title: 'Tổng quan Đào tạo',
    description: 'Quy mô sinh viên, kết quả học tập và tình hình mở lớp theo học kỳ.',
    mart: 'academic_mart_v1',
    api: 'GET /dashboard/academic/overview',
  },
  hr: {
    title: 'Tổng quan Nhân sự',
    description: 'Đội ngũ nhân viên, giảng viên, trình độ chuyên môn và phân công theo đơn vị.',
    mart: 'hr_mart_v1',
    api: 'GET /dashboard/hr/overview',
  },
}

/** Dashboard một phân hệ, đi theo Domain Selector trên header ("Tất cả" thì mở Tuyển sinh). */
export function DomainOverviewView({ askHref }: { askHref: string }) {
  const { domain, setDomain } = useDomain()
  const current: BusinessDomain = domain.code === 'all' ? 'admissions' : domain.code
  const meta = DOMAIN_META[current]

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[domain.code === 'all' ? 'Tuyển sinh' : domain.shortLabel, 'Tổng quan']}
        title={meta.title}
        description={meta.description}
        actions={
          <Link
            href={askHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Hỏi AI về dữ liệu này
          </Link>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DomainTabs value={current} onChange={setDomain} />
        <Tag tone="amber">Gold Layer · {meta.mart}</Tag>
      </div>
      <MockNotice api={meta.api} />
      {current === 'admissions' && <AdmissionsDashboard />}
      {current === 'academic' && <AcademicDashboard />}
      {current === 'hr' && <HrDashboard />}
    </div>
  )
}
