'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Info, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  API_CreateCatalog,
  API_DeleteCatalog,
  API_GetCatalog,
  API_GetCatalogDetail,
  API_UpdateCatalog,
} from '@/api/admindata/governance'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
  statusTone,
} from '@/components/page/page-parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { CatalogEntry, CatalogField, CatalogTable, DataLayer } from '@/types/catalog'

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:bg-slate-50 disabled:text-slate-500'

function entryKey(entry: Pick<CatalogEntry, 'domain_id' | 'layer' | 'dataset'>): string {
  return `${entry.domain_id}.${entry.layer}.${entry.dataset}`
}

/** Lọc dataset theo tên, mô tả hoặc tên cột (không phân biệt hoa thường). */
export function filterCatalog(entries: CatalogEntry[], keyword: string): CatalogEntry[] {
  const q = keyword.trim().toLowerCase()
  if (!q) {
    return entries
  }
  return entries.filter(
    (entry) =>
      entry.dataset.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.fields.some((field) => field.name.toLowerCase().includes(q)) ||
      (entry.tables ?? []).some(
        (table) =>
          table.name.toLowerCase().includes(q) ||
          table.columns.some((col) => col.name.toLowerCase().includes(q))
      )
  )
}

function CatalogFormPanel({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CatalogEntry
  onClose: () => void
  onSaved: (entry: CatalogEntry) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = initial !== undefined

  const [domainId, setDomainId] = useState(initial?.domain_id ?? 'hr')
  const [dataset, setDataset] = useState(initial?.dataset ?? '')
  const [layer, setLayer] = useState<DataLayer>(
    ((initial?.layer ?? 'bronze').toLowerCase() as DataLayer) || 'bronze'
  )
  const [schemaVersion, setSchemaVersion] = useState(initial?.schema_version ?? '1.0')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [structureMode, setStructureMode] = useState<'fields' | 'tables'>(
    initial?.tables && initial.tables.length > 0 ? 'tables' : 'fields'
  )
  const [fields, setFields] = useState<CatalogField[]>(() =>
    initial && initial.fields.length > 0
      ? initial.fields
      : [{ name: '', data_type: 'string', nullable: true, description: '' }]
  )
  const [tablesJson, setTablesJson] = useState(() => JSON.stringify(initial?.tables ?? [], null, 2))
  const [formError, setFormError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedTables: CatalogTable[] | undefined
      const cleanedFields: CatalogField[] = []

      if (structureMode === 'fields') {
        for (const f of fields) {
          if (!f.name.trim() && !f.data_type.trim()) continue
          if (!f.name.trim() || !f.data_type.trim()) {
            throw new Error('FIELD_INCOMPLETE')
          }
          cleanedFields.push({
            name: f.name.trim(),
            data_type: f.data_type.trim(),
            nullable: f.nullable,
            description: f.description.trim(),
          })
        }
      } else {
        const parsed: unknown = JSON.parse(tablesJson || '[]')
        if (!Array.isArray(parsed)) {
          throw new Error('TABLES_NOT_ARRAY')
        }
        parsedTables = parsed as CatalogTable[]
      }

      if (isEdit) {
        return API_UpdateCatalog(initial.domain_id, initial.dataset, {
          layer,
          schema_version: schemaVersion.trim(),
          description: description.trim(),
          ...(structureMode === 'fields'
            ? { fields: cleanedFields, tables: [] }
            : { tables: parsedTables, fields: [] }),
        })
      }

      return API_CreateCatalog({
        domain_id: domainId.trim(),
        dataset: dataset.trim(),
        layer,
        schema_version: schemaVersion.trim(),
        description: description.trim(),
        ...(structureMode === 'fields' ? { fields: cleanedFields } : { tables: parsedTables }),
      })
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      toast.success(
        isEdit
          ? `Đã cập nhật catalog “${saved.dataset}”.`
          : `Đã thêm “${saved.dataset}” vào Data Catalog.`
      )
      onSaved({
        ...saved,
        fields: (saved.fields ?? []).map((f) => ({
          ...f,
          description: f.description ?? '',
          nullable: f.nullable ?? true,
        })),
        tables: (saved.tables ?? []).map((t) => ({
          name: t.name,
          description: t.description ?? '',
          columns: (t.columns ?? []).map((c) => ({
            ...c,
            description: c.description ?? '',
            nullable: c.nullable ?? true,
          })),
        })),
      })
      onClose()
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saveMutation.isPending) return
    setFormError(null)
    saveMutation.reset()

    if (!isEdit && (!/^[a-z][a-z0-9_]*$/.test(domainId.trim()) || !dataset.trim())) {
      setFormError('domain_id (vd. hr, academic) và tên dataset không được để trống.')
      return
    }
    if (!schemaVersion.trim()) {
      setFormError('Vui lòng nhập phiên bản schema (schema_version).')
      return
    }
    if (structureMode === 'fields') {
      for (const f of fields) {
        if ((f.name.trim() && !f.data_type.trim()) || (!f.name.trim() && f.data_type.trim())) {
          setFormError('Mỗi cột phải có đủ tên cột và kiểu dữ liệu.')
          return
        }
      }
    } else {
      try {
        const parsed: unknown = JSON.parse(tablesJson || '[]')
        if (!Array.isArray(parsed)) {
          setFormError('tables phải là mảng JSON hợp lệ.')
          return
        }
      } catch {
        setFormError('tables chưa đúng cú pháp JSON.')
        return
      }
    }

    saveMutation.mutate()
  }

  return (
    <Card
      title={isEdit ? `Chỉnh sửa Catalog: ${initial.dataset}` : 'Thêm mục Data Catalog mới'}
      subtitle="Đăng ký siêu dữ liệu schema (không tạo bảng vật lý hay nạp dữ liệu Bronze)."
      right={
        <Button variant="ghost" onClick={onClose} aria-label="Đóng biểu mẫu catalog">
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <form className="space-y-4 text-xs" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="cat-domain" className="block font-semibold text-slate-700">
              Domain ID *
            </label>
            <input
              id="cat-domain"
              className={`${inputClass} font-mono`}
              value={domainId}
              disabled={isEdit}
              onChange={(e) => setDomainId(e.target.value)}
              placeholder="hr"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="cat-dataset" className="block font-semibold text-slate-700">
              Dataset *
            </label>
            <input
              id="cat-dataset"
              className={`${inputClass} font-mono`}
              value={dataset}
              disabled={isEdit}
              onChange={(e) => setDataset(e.target.value)}
              placeholder="hr_employees"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="cat-layer" className="block font-semibold text-slate-700">
              Tầng (Layer) *
            </label>
            <select
              id="cat-layer"
              className={inputClass}
              value={layer}
              onChange={(e) => setLayer(e.target.value as DataLayer)}
            >
              <option value="bronze">bronze</option>
              <option value="silver">silver</option>
              <option value="gold">gold</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="cat-version" className="block font-semibold text-slate-700">
              Phiên bản schema *
            </label>
            <input
              id="cat-version"
              className={`${inputClass} font-mono`}
              value={schemaVersion}
              onChange={(e) => setSchemaVersion(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="cat-desc" className="block font-semibold text-slate-700">
            Mô tả
          </label>
          <input
            id="cat-desc"
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ý nghĩa nghiệp vụ của bộ dữ liệu"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Cấu trúc schema:</span>
          <Button
            variant={structureMode === 'fields' ? 'soft' : 'outline'}
            onClick={() => setStructureMode('fields')}
          >
            Một bảng (fields)
          </Button>
          <Button
            variant={structureMode === 'tables' ? 'soft' : 'outline'}
            onClick={() => setStructureMode('tables')}
          >
            Nhiều bảng (tables JSON)
          </Button>
        </div>

        {structureMode === 'fields' ? (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Danh sách cột (fields)</span>
              <Button
                variant="outline"
                onClick={() =>
                  setFields((prev) => [
                    ...prev,
                    { name: '', data_type: 'string', nullable: true, description: '' },
                  ])
                }
              >
                + Thêm cột
              </Button>
            </div>
            {fields.map((field, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-[1fr_140px_110px_1fr_auto]">
                <input
                  aria-label={`Tên cột #${idx + 1}`}
                  className={`${inputClass} font-mono`}
                  placeholder="Tên cột"
                  value={field.name}
                  onChange={(e) =>
                    setFields((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item))
                    )
                  }
                />
                <input
                  aria-label={`Kiểu dữ liệu #${idx + 1}`}
                  className={`${inputClass} font-mono`}
                  placeholder="string / integer"
                  value={field.data_type}
                  onChange={(e) =>
                    setFields((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, data_type: e.target.value } : item
                      )
                    )
                  }
                />
                <label className="flex items-center gap-1.5 px-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={field.nullable}
                    onChange={(e) =>
                      setFields((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, nullable: e.target.checked } : item
                        )
                      )
                    }
                    className="size-4 accent-indigo-600"
                  />
                  Nullable
                </label>
                <input
                  aria-label={`Mô tả cột #${idx + 1}`}
                  className={inputClass}
                  placeholder="Mô tả cột"
                  value={field.description}
                  onChange={(e) =>
                    setFields((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, description: e.target.value } : item
                      )
                    )
                  }
                />
                <Button
                  variant="ghost"
                  onClick={() => setFields((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label={`Xóa cột #${idx + 1}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <label htmlFor="cat-tables-json" className="block font-semibold text-slate-700">
              Cấu trúc nhiều bảng (tables JSON)
            </label>
            <textarea
              id="cat-tables-json"
              rows={6}
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 font-mono text-xs"
              value={tablesJson}
              onChange={(e) => setTablesJson(e.target.value)}
            />
          </div>
        )}

        {(formError || saveMutation.isError) && (
          <p
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-rose-700"
          >
            {formError ?? getApiErrorMessage(saveMutation.error, 'Không thể lưu mục Catalog.')}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm vào Catalog'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function CatalogView() {
  const queryClient = useQueryClient()
  const [domainFilter, setDomainFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none')
  const [confirmDelete, setConfirmDelete] = useState<CatalogEntry | null>(null)

  const catalog = useQuery({
    queryKey: ['catalog', domainFilter || 'all'],
    queryFn: () => API_GetCatalog(domainFilter || undefined),
  })

  const entries = useMemo(() => filterCatalog(catalog.data ?? [], keyword), [catalog.data, keyword])
  const selected = entries.find((entry) => entryKey(entry) === selectedKey) ?? entries[0]

  const detailQuery = useQuery({
    queryKey: ['catalog', 'detail', selected?.domain_id, selected?.dataset],
    queryFn: () => API_GetCatalogDetail(selected!.domain_id, selected!.dataset),
    enabled: Boolean(selected),
  })

  const deleteMutation = useMutation({
    mutationFn: (entry: CatalogEntry) => API_DeleteCatalog(entry.domain_id, entry.dataset),
    onSuccess: async (_, entry) => {
      setConfirmDelete(null)
      setSelectedKey(null)
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      toast.success(`Đã ẩn mục catalog “${entry.dataset}”.`)
    },
    onError: () => {
      setConfirmDelete(null)
    },
  })

  const layers = new Set((catalog.data ?? []).map((entry) => entry.layer)).size
  const detailTables: CatalogTable[] = (detailQuery.data?.tables ?? selected?.tables ?? []).map(
    (t) => ({
      name: t.name,
      description: t.description ?? '',
      columns: (t.columns ?? []).map((c) => ({
        ...c,
        description: c.description ?? '',
        nullable: c.nullable ?? true,
      })),
    })
  )
  const detailFields = (detailQuery.data?.fields ?? selected?.fields ?? []).map((f) => ({
    ...f,
    description: f.description ?? '',
    nullable: f.nullable ?? true,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Data Catalog']}
        title="Data Catalog — Từ điển dữ liệu & Schema"
        description="Quản lý siêu dữ liệu schema (bộ dữ liệu, cột, bảng) theo từng lĩnh vực và tầng dữ liệu."
        actions={
          <>
            <Button
              onClick={() => void catalog.refetch()}
              disabled={catalog.isFetching}
              icon={
                <RefreshCw
                  className={`size-3.5 ${catalog.isFetching ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              }
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              onClick={() => setFormMode('create')}
              icon={<Plus className="size-3.5" aria-hidden="true" />}
            >
              Thêm mục Catalog
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <Info className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
        <p>
          Data Catalog chỉ quản lý siêu dữ liệu mô tả schema; thao tác thêm/sửa/ẩn không tạo hoặc
          xóa bảng vật lý trong Bronze/Silver.
        </p>
      </div>

      {formMode === 'create' && (
        <CatalogFormPanel
          onClose={() => setFormMode('none')}
          onSaved={(saved) => setSelectedKey(entryKey(saved))}
        />
      )}

      {formMode === 'edit' && selected && (
        <CatalogFormPanel
          initial={{ ...selected, fields: detailFields, tables: detailTables }}
          onClose={() => setFormMode('none')}
          onSaved={(saved) => setSelectedKey(entryKey(saved))}
        />
      )}

      {deleteMutation.isError && (
        <ErrorState
          message={getApiErrorMessage(deleteMutation.error, 'Không thể ẩn mục catalog.')}
        />
      )}

      {catalog.isPending ? (
        <LoadingState />
      ) : catalog.isError ? (
        <ErrorState
          message={getApiErrorMessage(catalog.error, 'Không tải được danh mục dữ liệu.')}
          onRetry={() => void catalog.refetch()}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card
            title="Dataset"
            subtitle={`${catalog.data.length} dataset · ${layers} tầng`}
            bodyClassName="space-y-3"
          >
            <div className="space-y-2">
              <select
                aria-label="Lọc catalog theo lĩnh vực"
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
              >
                <option value="">Tất cả lĩnh vực</option>
                <option value="hr">Nhân sự (hr)</option>
                <option value="academic">Đào tạo (academic)</option>
                <option value="admissions">Tuyển sinh (admissions)</option>
              </select>

              <label className="relative block">
                <span className="sr-only">Tìm dataset, bảng, cột</span>
                <Search
                  className="absolute left-2.5 top-2.5 size-3.5 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  placeholder="Tìm dataset, bảng, cột…"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
            </div>
            {entries.length === 0 ? (
              <EmptyState title="Không tìm thấy bộ dữ liệu phù hợp" />
            ) : (
              <ul className="space-y-1.5">
                {entries.map((entry) => {
                  const active = selected && entryKey(entry) === entryKey(selected)
                  return (
                    <li key={entryKey(entry)}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedKey(entryKey(entry))
                          setFormMode('none')
                        }}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-start justify-between gap-2 rounded-md border px-3 py-2 text-left',
                          active
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-900">
                            {entry.dataset}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {entry.domain_id} · v{entry.schema_version}
                          </span>
                        </span>
                        <Tag tone={statusTone(entry.layer)}>{entry.layer}</Tag>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {selected ? (
            <Card
              title={selected.dataset}
              subtitle={selected.description || 'Chưa có mô tả'}
              right={
                <div className="flex items-center gap-1.5">
                  <Tag tone={statusTone(selected.layer)}>{selected.layer}</Tag>
                  <Button
                    variant="outline"
                    onClick={() => setFormMode('edit')}
                    icon={<Edit3 className="size-3.5" aria-hidden="true" />}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmDelete(selected)}
                    aria-label={`Ẩn mục catalog ${selected.dataset}`}
                    icon={<Trash2 className="size-3.5 text-rose-600" aria-hidden="true" />}
                  >
                    Ẩn
                  </Button>
                </div>
              }
              bodyClassName="p-0"
            >
              <div className="grid grid-cols-3 border-b border-slate-200 text-xs">
                {[
                  ['Domain', selected.domain_id],
                  ['Phiên bản schema', selected.schema_version],
                  [
                    'Cấu trúc',
                    detailTables.length > 0
                      ? `${detailTables.length} bảng`
                      : `${detailFields.length} cột`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="mt-0.5 font-mono font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              {detailTables.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {detailTables.map((table) => (
                    <div key={table.name} className="space-y-2 p-4">
                      <div>
                        <p className="font-mono text-xs font-semibold text-slate-900">
                          Bảng: {table.name}
                        </p>
                        {table.description && (
                          <p className="text-[11px] text-slate-500">{table.description}</p>
                        )}
                      </div>
                      <div className="overflow-x-auto rounded border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500">
                            <tr>
                              {['Cột', 'Kiểu dữ liệu', 'Nullable', 'Mô tả'].map((h) => (
                                <th key={h} scope="col" className="px-3 py-1.5 font-medium">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {table.columns.map((col) => (
                              <tr key={col.name}>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                                  {col.name}
                                </td>
                                <td className="px-3 py-2 font-mono text-indigo-700">
                                  {col.data_type}
                                </td>
                                <td className="px-3 py-2">
                                  <Tag tone={col.nullable ? 'amber' : 'slate'}>
                                    {col.nullable ? 'NULL' : 'NOT NULL'}
                                  </Tag>
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {col.description || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        {['Cột', 'Kiểu dữ liệu', 'Nullable', 'Mô tả'].map((head) => (
                          <th key={head} scope="col" className="px-4 py-2 font-medium">
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailFields.map((field) => (
                        <tr key={field.name}>
                          <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                            {field.name}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-indigo-700">
                            {field.data_type}
                          </td>
                          <td className="px-4 py-2.5">
                            <Tag tone={field.nullable ? 'amber' : 'slate'}>
                              {field.nullable ? 'NULL' : 'NOT NULL'}
                            </Tag>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{field.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState
                title="Catalog chưa có dataset"
                description="Phân hệ này chưa có bộ dữ liệu."
              />
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận ẩn mục Data Catalog</DialogTitle>
            <DialogDescription>
              Bạn chắc chắn muốn ẩn metadata của{' '}
              <strong className="font-mono">
                {confirmDelete?.domain_id}.{confirmDelete?.dataset}
              </strong>{' '}
              khỏi Data Catalog? Dữ liệu vật lý trong Bronze/Silver vẫn được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmDelete(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirmDelete) deleteMutation.mutate(confirmDelete)
              }}
            >
              {deleteMutation.isPending ? 'Đang xử lý…' : 'Xác nhận ẩn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
