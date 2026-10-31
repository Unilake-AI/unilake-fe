'use client'

import { Fragment, useState } from 'react'

import { ArrowRight } from 'lucide-react'

import { Card, MockNotice, PageHeader, Tag, statusTone } from '@/components/page/page-parts'
import type { Tone } from '@/components/page/page-parts'
import { cn } from '@/lib/utils'

interface LineageNode {
  id: string
  layer: 'SOURCE' | 'BRONZE' | 'SILVER' | 'GOLD'
  name: string
  description: string
  upstream: string | null
  downstream: string | null
  lastRun: string
  rows: string
}

const NODES: LineageNode[] = [
  {
    id: 'SRC-ADM-001',
    layer: 'SOURCE',
    name: 'Admissions CSV',
    description: 'Hệ thống Tuyển sinh',
    upstream: null,
    downstream: 'DS-ADM-BRONZE-001',
    lastRun: '2026-09-20 10:10:00',
    rows: '— / 4.520',
  },
  {
    id: 'DS-ADM-BRONZE-001',
    layer: 'BRONZE',
    name: 'admissions_raw',
    description: 'Dữ liệu thô, giữ nguyên định dạng nguồn',
    upstream: 'SRC-ADM-001',
    downstream: 'DS-ADM-SILVER-001',
    lastRun: '2026-09-20 10:10:00',
    rows: '4.520 / 4.520',
  },
  {
    id: 'DS-ADM-SILVER-001',
    layer: 'SILVER',
    name: 'admissions_clean',
    description: 'Đã làm sạch, kiểm tra, chuẩn hoá',
    upstream: 'DS-ADM-BRONZE-001',
    downstream: 'DS-ADM-GOLD-001',
    lastRun: '2026-09-20 10:20:00',
    rows: '4.520 / 4.506',
  },
  {
    id: 'DS-ADM-GOLD-001',
    layer: 'GOLD',
    name: 'admissions_gold',
    description: 'Data mart phục vụ Dashboard và Hỏi AI',
    upstream: 'DS-ADM-SILVER-001',
    downstream: null,
    lastRun: '2026-09-20 10:30:00',
    rows: '4.506 / 4.506',
  },
]

const EDGE_LABELS = ['batch ingestion', 'cleaning · validation · standardization', 'aggregation']

const STEPS = [
  {
    order: 1,
    name: 'Bỏ khoảng trắng & chuẩn hoá chữ',
    type: 'Cleaning',
    rowsIn: '4.520',
    rowsOut: '4.520',
  },
  { order: 2, name: 'Loại bản ghi trùng', type: 'Cleaning', rowsIn: '4.520', rowsOut: '4.509' },
  {
    order: 3,
    name: 'Kiểm tra định dạng CCCD, ngày sinh',
    type: 'Validation',
    rowsIn: '4.509',
    rowsOut: '4.506',
  },
  {
    order: 4,
    name: 'Chuẩn hoá mã ngành, phương thức',
    type: 'Standardization',
    rowsIn: '4.506',
    rowsOut: '4.506',
  },
]

function layerTone(layer: LineageNode['layer']): Tone {
  return layer === 'SOURCE' ? 'sky' : statusTone(layer)
}

export function LineageView() {
  const [selectedId, setSelectedId] = useState('DS-ADM-SILVER-001')
  const selected = NODES.find((node) => node.id === selectedId) ?? NODES[0]!

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Data Lineage']}
        title="Data Lineage — Truy vết nguồn gốc dữ liệu"
        description="Luồng Source → Bronze → Silver → Gold của một dataset (nodes + edges)."
      />
      <MockNotice api="GET /governance/lineage" />

      <Card
        title="Luồng dữ liệu · Admissions Gold Data Mart"
        subtitle="Nhấn vào một node để xem chi tiết"
        right={<span className="font-mono text-[10px] text-slate-400">4 nodes · 3 edges</span>}
      >
        <ol className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          {NODES.map((node, index) => (
            <Fragment key={node.id}>
              <li className="lg:flex-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  aria-pressed={node.id === selected.id}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    node.id === selected.id
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                >
                  <Tag tone={layerTone(node.layer)}>{node.layer}</Tag>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{node.name}</p>
                  <p className="font-mono text-[10px] text-slate-400">{node.id}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{node.description}</p>
                </button>
              </li>
              {index < NODES.length - 1 && (
                <li
                  aria-hidden="true"
                  className="flex items-center justify-center gap-1 text-slate-400 lg:flex-col"
                >
                  <ArrowRight className="size-4 rotate-90 lg:rotate-0" />
                  <span className="font-mono text-[9px]">{EDGE_LABELS[index]}</span>
                </li>
              )}
            </Fragment>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card
          title={`Chi tiết node: ${selected.name}`}
          subtitle={selected.id}
          right={<Tag tone={layerTone(selected.layer)}>{selected.layer}</Tag>}
        >
          <dl className="space-y-2.5 text-xs">
            {[
              ['Upstream', selected.upstream ?? '—'],
              ['Downstream', selected.downstream ?? '—'],
              ['Lần chạy gần nhất', selected.lastRun],
              ['Số dòng vào / ra', selected.rows],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-mono font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card
          title="Các bước biến đổi"
          subtitle="transformation_step · theo thứ tự thực hiện"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {['#', 'Bước', 'Loại', 'Vào', 'Ra', 'Kết quả'].map((head) => (
                    <th key={head} scope="col" className="px-3 py-2 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STEPS.map((step) => (
                  <tr key={step.order}>
                    <td className="px-3 py-2.5 font-mono text-slate-500">{step.order}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{step.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{step.type}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{step.rowsIn}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{step.rowsOut}</td>
                    <td className="px-3 py-2.5">
                      <Tag tone="emerald">SUCCESS</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
