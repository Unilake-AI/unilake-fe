'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, RefreshCw, Search } from 'lucide-react'

import { API_GetLineage } from '@/api/admindata/governance'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
  formatDateTime,
  statusTone,
} from '@/components/page/page-parts'
import { cn } from '@/lib/utils'
import type { LineageNode } from '@/types/lineage'
import type { StatusTone } from '@/types/page/page-parts'

import { DATA_DOMAINS } from './data-helpers'

const LAYER_ORDER = ['SOURCE', 'BRONZE', 'SILVER', 'GOLD']

function layerTone(layer: string): StatusTone {
  const upper = layer.toUpperCase()
  if (upper === 'SOURCE') return 'sky'
  return statusTone(upper)
}

export function LineageView() {
  const [domainFilter, setDomainFilter] = useState('')
  const [layerFilter, setLayerFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const lineageQuery = useQuery({
    queryKey: [
      'governance',
      'lineage',
      {
        domain_id: domainFilter || undefined,
        layer: layerFilter || undefined,
        search: appliedSearch || undefined,
      },
    ],
    queryFn: () =>
      API_GetLineage({
        domain_id: domainFilter || undefined,
        layer: layerFilter || undefined,
        search: appliedSearch || undefined,
      }),
  })

  const nodes = useMemo(() => lineageQuery.data?.nodes ?? [], [lineageQuery.data?.nodes])
  const edges = useMemo(() => lineageQuery.data?.edges ?? [], [lineageQuery.data?.edges])

  const selectedNode: LineageNode | undefined =
    nodes.find((n) => n.id === selectedNodeId) ?? nodes[0]

  const groupedByLayer = useMemo(() => {
    const groups = new Map<string, LineageNode[]>()
    for (const node of nodes) {
      const key = node.layer.toUpperCase()
      const list = groups.get(key) ?? []
      list.push(node)
      groups.set(key, list)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ia = LAYER_ORDER.indexOf(a)
      const ib = LAYER_ORDER.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
  }, [nodes])

  const incomingEdges = selectedNode ? edges.filter((e) => e.target === selectedNode.id) : []
  const outgoingEdges = selectedNode ? edges.filter((e) => e.source === selectedNode.id) : []

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setAppliedSearch(searchInput.trim())
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Data Lineage']}
        title="Data Lineage — Truy vết nguồn gốc dữ liệu"
        description="Hiển thị các nút (nodes) và luồng chuyển dịch (edges) thực tế được ghi nhận từ backend."
        actions={
          <Button
            onClick={() => void lineageQuery.refetch()}
            disabled={lineageQuery.isFetching}
            icon={
              <RefreshCw
                className={`size-3.5 ${lineageQuery.isFetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            }
          >
            Làm mới
          </Button>
        }
      />

      {/* Bộ lọc */}
      <Card>
        <form className="flex flex-wrap items-end gap-3 text-xs" onSubmit={handleSearch}>
          <div className="space-y-1">
            <label htmlFor="lineage-domain" className="block font-semibold text-slate-700">
              Lĩnh vực (domain_id)
            </label>
            <select
              id="lineage-domain"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
            >
              <option value="">Tất cả lĩnh vực</option>
              {DATA_DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="lineage-layer" className="block font-semibold text-slate-700">
              Tầng (layer)
            </label>
            <select
              id="lineage-layer"
              value={layerFilter}
              onChange={(e) => setLayerFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
            >
              <option value="">Tất cả tầng</option>
              <option value="SOURCE">SOURCE</option>
              <option value="BRONZE">BRONZE</option>
              <option value="SILVER">SILVER</option>
              <option value="GOLD">GOLD</option>
            </select>
          </div>

          <div className="min-w-[200px] flex-1 space-y-1">
            <label htmlFor="lineage-search" className="block font-semibold text-slate-700">
              Tìm kiếm node / bảng / tệp
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="lineage-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên node hoặc dataset…"
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs"
              />
            </div>
          </div>

          <Button type="submit" variant="outline" className="h-9">
            Tìm kiếm
          </Button>
        </form>
      </Card>

      {lineageQuery.isPending ? (
        <LoadingState label="Đang tải đồ thị Data Lineage…" />
      ) : lineageQuery.isError ? (
        <ErrorState
          message={getApiErrorMessage(lineageQuery.error, 'Không tải được dữ liệu Data Lineage.')}
          onRetry={() => void lineageQuery.refetch()}
        />
      ) : nodes.length === 0 ? (
        <Card>
          <EmptyState
            title="Chưa có dữ liệu phả hệ (Lineage)"
            description="Chưa có node hoặc cạnh liên kết nào khớp với bộ lọc hiện tại."
          />
        </Card>
      ) : (
        <>
          <Card
            title="Đồ thị luồng dữ liệu theo tầng thực tế"
            subtitle={`${nodes.length} điểm dữ liệu (nodes) · ${edges.length} liên kết (edges)`}
          >
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, groupedByLayer.length)}, minmax(220px, 1fr))`,
              }}
            >
              {groupedByLayer.map(([layerName, layerNodes]) => (
                <div
                  key={layerName}
                  className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <Tag tone={layerTone(layerName)}>{layerName}</Tag>
                    <span className="font-mono text-[10px] text-slate-400">
                      {layerNodes.length} node
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {layerNodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id
                      return (
                        <li key={node.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(node.id)}
                            aria-pressed={isSelected}
                            className={cn(
                              'w-full rounded-md border p-2.5 text-left transition-colors',
                              isSelected
                                ? 'border-[#b91830] bg-[#fff3f5] ring-1 ring-[#b91830]'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            )}
                          >
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {node.label || node.name}
                            </p>
                            <p className="truncate font-mono text-[10px] text-slate-400">
                              {node.id}
                            </p>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <Card
              title={
                selectedNode
                  ? `Chi tiết node: ${selectedNode.label || selectedNode.name}`
                  : 'Chi tiết node'
              }
              subtitle={selectedNode?.id}
              right={
                selectedNode && <Tag tone={layerTone(selectedNode.layer)}>{selectedNode.layer}</Tag>
              }
            >
              {selectedNode ? (
                <div className="space-y-3 text-xs">
                  <dl className="space-y-2">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Tên kỹ thuật</dt>
                      <dd className="font-mono font-medium text-slate-900">{selectedNode.name}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Liên kết vào (Upstream)</dt>
                      <dd className="font-mono font-medium text-slate-900">
                        {incomingEdges.length}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Liên kết ra (Downstream)</dt>
                      <dd className="font-mono font-medium text-slate-900">
                        {outgoingEdges.length}
                      </dd>
                    </div>
                  </dl>
                  {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
                    <div>
                      <p className="mb-1 font-semibold text-slate-700">Metadata của node</p>
                      <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-800">
                        {JSON.stringify(selectedNode.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState title="Chọn một node để xem chi tiết" />
              )}
            </Card>

            <Card
              title="Danh sách liên kết (Edges)"
              subtitle={`${edges.length} cạnh nối từ backend`}
              bodyClassName="p-0"
            >
              {edges.length === 0 ? (
                <EmptyState title="Chưa có cạnh liên kết nào" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        {['Nguồn (Source)', '', 'Đích (Target)', 'Nhãn', 'Thời gian'].map(
                          (h, i) => (
                            <th key={i} scope="col" className="px-3 py-2 font-medium">
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {edges.map((edge) => {
                        const related =
                          selectedNode &&
                          (edge.source === selectedNode.id || edge.target === selectedNode.id)
                        return (
                          <tr key={edge.id} className={related ? 'bg-[#fff3f5]/40' : undefined}>
                            <td className="px-3 py-2.5">
                              <Tag tone={layerTone(edge.source_layer)}>{edge.source_layer}</Tag>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-800">
                                {edge.source}
                              </p>
                            </td>
                            <td className="px-1 py-2.5 text-slate-400">
                              <ArrowRight className="size-4" aria-hidden="true" />
                            </td>
                            <td className="px-3 py-2.5">
                              <Tag tone={layerTone(edge.target_layer)}>{edge.target_layer}</Tag>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-800">
                                {edge.target}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{edge.label ?? '—'}</td>
                            <td className="px-3 py-2.5 text-slate-500">
                              {formatDateTime(edge.created_at)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
