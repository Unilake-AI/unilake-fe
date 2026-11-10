'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Edit3, Plus, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'

import { API_ListDatasets, API_ListSourceSystems } from '@/api/data-operations/datasets'
import {
  API_CreateProfile,
  API_GetProfile,
  API_ListProfiles,
  API_UpdateProfile,
} from '@/api/data-operations/profiles'
import type { SilverProfileDefinition, SilverProfileRead } from '@/api/data-operations/profiles'
import { getApiErrorCode, getApiErrorMessage } from '@/api/http'
import { API_ListDataSources } from '@/api/shared/data-sources'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
} from '@/components/page/page-parts'

const PAGE_SIZE = 20

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:bg-slate-50 disabled:text-slate-500'

const textareaClass =
  'w-full rounded-md border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30'

function parseJsonObject(
  raw: string,
  label: string
): { value?: Record<string, unknown>; error?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { value: {} }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: `${label} phải là JSON object ({...}).` }
    }
    return { value: parsed as Record<string, unknown> }
  } catch {
    return { error: `${label} chưa đúng cú pháp JSON.` }
  }
}

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

interface MappingRow {
  source: string
  target: string
}

function ProfileFormPanel({
  initial,
  onClose,
  onSaved,
}: {
  initial?: SilverProfileRead
  onClose: () => void
  onSaved: (profile: SilverProfileRead) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = initial !== undefined
  const def = initial?.definition

  const [profileId, setProfileId] = useState(initial?.profile_id ?? '')
  const [dataSourceId, setDataSourceId] = useState(def ? String(def.data_source_id) : '')
  const [datasetId, setDatasetId] = useState(def ? String(def.dataset_id) : '')
  const [sourceSystemId, setSourceSystemId] = useState(def ? String(def.source_system_id) : '')
  const [sourceType, setSourceType] = useState<'CSV' | 'EXCEL'>(def?.source_type ?? 'CSV')
  const [sourceTable, setSourceTable] = useState(def?.source_table ?? '')
  const [domain, setDomain] = useState(def?.domain ?? 'hr')
  const [entity, setEntity] = useState(def?.entity ?? '')
  const [version, setVersion] = useState(def?.version ?? '1.0')
  const [scope, setScope] = useState(def?.scope ?? '')
  const [sourceSchemaVersion, setSourceSchemaVersion] = useState(
    def?.source_schema_version ?? '1.0'
  )
  const [crosswalkRelease, setCrosswalkRelease] = useState(def?.crosswalk_release ?? 'v1')
  const [effectiveAt, setEffectiveAt] = useState(
    def?.effective_at ? def.effective_at.slice(0, 19) : new Date().toISOString().slice(0, 19)
  )
  const [collapseDuplicates, setCollapseDuplicates] = useState(
    def?.collapse_exact_duplicates ?? false
  )

  const [mappingRows, setMappingRows] = useState<MappingRow[]>(() => {
    const entries = Object.entries(def?.field_mapping ?? {})
    return entries.length > 0
      ? entries.map(([source, target]) => ({ source, target }))
      : [{ source: '', target: '' }]
  })
  const [ignoredColumnsText, setIgnoredColumnsText] = useState(
    (def?.ignored_columns ?? []).join(', ')
  )
  const [previewColumnsText, setPreviewColumnsText] = useState(
    (def?.source_preview_columns ?? []).join(', ')
  )

  const [sourceSchemaJson, setSourceSchemaJson] = useState(
    JSON.stringify(def?.source_schema ?? {}, null, 2)
  )
  const [contractsJson, setContractsJson] = useState(JSON.stringify(def?.contracts ?? {}, null, 2))
  const [formatOptionsJson, setFormatOptionsJson] = useState(
    JSON.stringify(def?.format_options ?? {}, null, 2)
  )
  const [typeOptionsJson, setTypeOptionsJson] = useState(
    JSON.stringify(def?.type_options ?? {}, null, 2)
  )
  const [nullTokensJson, setNullTokensJson] = useState(
    JSON.stringify(def?.null_tokens ?? {}, null, 2)
  )
  const [dictionariesJson, setDictionariesJson] = useState(
    JSON.stringify(def?.dictionaries ?? {}, null, 2)
  )
  const [referenceNamespacesJson, setReferenceNamespacesJson] = useState(
    JSON.stringify(def?.reference_namespaces ?? {}, null, 2)
  )

  const [formError, setFormError] = useState<string | null>(null)
  const [revisionConflict, setRevisionConflict] = useState(false)

  const sourcesQuery = useQuery({
    queryKey: ['datasources', { page: 1, page_size: 100 }],
    queryFn: () => API_ListDataSources({ page: 1, page_size: 100 }),
  })
  const datasetsQuery = useQuery({
    queryKey: ['datasets', { limit: 100, offset: 0 }],
    queryFn: () => API_ListDatasets({ limit: 100, offset: 0 }),
  })
  const systemsQuery = useQuery({
    queryKey: ['source-systems'],
    queryFn: API_ListSourceSystems,
  })

  const saveMutation = useMutation({
    mutationFn: async (definition: SilverProfileDefinition) => {
      if (isEdit) {
        return API_UpdateProfile(initial.profile_id, {
          expected_revision: initial.revision,
          definition,
        })
      }
      return API_CreateProfile({
        profile_id: profileId.trim(),
        definition,
      })
    },
    onSuccess: async (saved) => {
      setRevisionConflict(false)
      await queryClient.invalidateQueries({ queryKey: ['silver-profiles'] })
      toast.success(
        isEdit
          ? `Đã cập nhật profile “${saved.profile_id}” (revision ${saved.revision}).`
          : `Đã tạo profile “${saved.profile_id}”.`
      )
      onSaved(saved)
      onClose()
    },
    onError: (error) => {
      if (getApiErrorCode(error) === 'SILVER_PROFILE_REVISION_CONFLICT') {
        setRevisionConflict(true)
      }
    },
  })

  async function handleReloadLatest() {
    if (!initial) return
    await queryClient.invalidateQueries({ queryKey: ['silver-profiles', initial.profile_id] })
    const latest = await API_GetProfile(initial.profile_id)
    onSaved(latest)
    onClose()
    toast.success(`Đã tải lại revision mới nhất (${latest.revision}). Hãy mở chỉnh sửa lại.`)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saveMutation.isPending) return
    setFormError(null)
    setRevisionConflict(false)
    saveMutation.reset()

    if (!isEdit && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(profileId.trim())) {
      setFormError('profile_id chỉ gồm chữ cái, số, dấu gạch dưới (_) và gạch ngang (-).')
      return
    }
    const dsSource = Number(dataSourceId)
    const dsSet = Number(datasetId)
    const dsSystem = Number(sourceSystemId)
    if (
      !Number.isInteger(dsSource) ||
      dsSource <= 0 ||
      !Number.isInteger(dsSet) ||
      dsSet <= 0 ||
      !Number.isInteger(dsSystem) ||
      dsSystem <= 0
    ) {
      setFormError('Vui lòng chọn đầy đủ Nguồn dữ liệu, Bộ dữ liệu và Hệ thống nguồn.')
      return
    }
    if (!sourceTable.trim() || !domain.trim() || !entity.trim() || !scope.trim()) {
      setFormError('Vui lòng điền source_table, domain, entity và scope.')
      return
    }

    const fieldMapping: Record<string, string> = {}
    for (const row of mappingRows) {
      const s = row.source.trim()
      const t = row.target.trim()
      if (s && t) {
        fieldMapping[s] = t
      } else if (s || t) {
        setFormError('Mỗi dòng ánh xạ cột phải có đủ tên cột nguồn và cột đích.')
        return
      }
    }

    const parsedSourceSchema = parseJsonObject(sourceSchemaJson, 'source_schema')
    const parsedContracts = parseJsonObject(contractsJson, 'contracts')
    const parsedFormatOpts = parseJsonObject(formatOptionsJson, 'format_options')
    const parsedTypeOpts = parseJsonObject(typeOptionsJson, 'type_options')
    const parsedNullTokens = parseJsonObject(nullTokensJson, 'null_tokens')
    const parsedDictionaries = parseJsonObject(dictionariesJson, 'dictionaries')
    const parsedNamespaces = parseJsonObject(referenceNamespacesJson, 'reference_namespaces')

    const jsonError =
      parsedSourceSchema.error ??
      parsedContracts.error ??
      parsedFormatOpts.error ??
      parsedTypeOpts.error ??
      parsedNullTokens.error ??
      parsedDictionaries.error ??
      parsedNamespaces.error

    if (jsonError) {
      setFormError(jsonError)
      return
    }

    const normalizedEffectiveAt = /[zZ]|[+-]\d\d:?\d\d$/.test(effectiveAt)
      ? effectiveAt
      : `${effectiveAt}Z`

    const definition: SilverProfileDefinition = {
      data_source_id: dsSource,
      dataset_id: dsSet,
      source_system_id: dsSystem,
      source_type: sourceType,
      source_table: sourceTable.trim(),
      domain: domain.trim(),
      entity: entity.trim(),
      version: version.trim() || '1.0',
      scope: scope.trim(),
      source_schema_version: sourceSchemaVersion.trim() || '1.0',
      source_schema: parsedSourceSchema.value ?? {},
      contracts: parsedContracts.value ?? {},
      field_mapping: fieldMapping,
      ignored_columns: parseList(ignoredColumnsText),
      format_options: (parsedFormatOpts.value ?? {}) as Record<string, Record<string, unknown>>,
      type_options: (parsedTypeOpts.value ?? {}) as Record<string, Record<string, unknown>>,
      null_tokens: (parsedNullTokens.value ?? {}) as Record<string, string[]>,
      dictionaries: (parsedDictionaries.value ?? {}) as Record<string, Record<string, string>>,
      reference_namespaces: (parsedNamespaces.value ?? {}) as Record<string, string>,
      crosswalk_release: crosswalkRelease.trim() || 'v1',
      effective_at: normalizedEffectiveAt,
      collapse_exact_duplicates: collapseDuplicates,
      source_preview_columns: parseList(previewColumnsText),
    }

    saveMutation.mutate(definition)
  }

  return (
    <Card
      title={isEdit ? `Chỉnh sửa Silver Profile: ${initial.profile_id}` : 'Tạo Silver Profile mới'}
      subtitle={
        isEdit
          ? `Revision hiện tại: ${initial.revision} (gửi qua expected_revision khi lưu)`
          : 'Khai báo ánh xạ cột, kiểu dữ liệu, hợp đồng schema và quyền xem dòng nguồn'
      }
      right={
        <Button variant="ghost" onClick={onClose} aria-label="Đóng biểu mẫu profile">
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <form className="space-y-4 text-xs" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="prof-id" className="block font-semibold text-slate-700">
              Profile ID *
            </label>
            <input
              id="prof-id"
              className={`${inputClass} font-mono`}
              value={profileId}
              disabled={isEdit}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="hr_employees_v1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-source" className="block font-semibold text-slate-700">
              Nguồn dữ liệu (data_source_id) *
            </label>
            <select
              id="prof-source"
              className={inputClass}
              value={dataSourceId}
              onChange={(e) => setDataSourceId(e.target.value)}
            >
              <option value="">Chọn nguồn dữ liệu</option>
              {(sourcesQuery.data?.items ?? []).map((s) => (
                <option key={s.data_source_id} value={String(s.data_source_id)}>
                  #{s.data_source_id} · {s.source_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-dataset" className="block font-semibold text-slate-700">
              Bộ dữ liệu (dataset_id) *
            </label>
            <select
              id="prof-dataset"
              className={inputClass}
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
            >
              <option value="">Chọn bộ dữ liệu</option>
              {(datasetsQuery.data ?? []).map((d) => (
                <option key={d.dataset_id} value={String(d.dataset_id)}>
                  #{d.dataset_id} · {d.dataset_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-system" className="block font-semibold text-slate-700">
              Hệ thống nguồn *
            </label>
            <select
              id="prof-system"
              className={inputClass}
              value={sourceSystemId}
              onChange={(e) => setSourceSystemId(e.target.value)}
            >
              <option value="">Chọn hệ thống nguồn</option>
              {(systemsQuery.data ?? []).map((sys) => (
                <option key={sys.source_system_id} value={String(sys.source_system_id)}>
                  #{sys.source_system_id} · {sys.source_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-source-type" className="block font-semibold text-slate-700">
              Loại tệp nguồn *
            </label>
            <select
              id="prof-source-type"
              className={inputClass}
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as 'CSV' | 'EXCEL')}
            >
              <option value="CSV">CSV</option>
              <option value="EXCEL">EXCEL</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-source-table" className="block font-semibold text-slate-700">
              Tên tệp / bảng nguồn (source_table) *
            </label>
            <input
              id="prof-source-table"
              className={`${inputClass} font-mono`}
              value={sourceTable}
              onChange={(e) => setSourceTable(e.target.value)}
              placeholder="employees.csv"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-domain" className="block font-semibold text-slate-700">
              Lĩnh vực (domain) *
            </label>
            <input
              id="prof-domain"
              className={`${inputClass} font-mono`}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="hr"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-entity" className="block font-semibold text-slate-700">
              Thực thể (entity) *
            </label>
            <input
              id="prof-entity"
              className={`${inputClass} font-mono`}
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="employee"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-scope" className="block font-semibold text-slate-700">
              Phạm vi snapshot (scope) *
            </label>
            <input
              id="prof-scope"
              className={`${inputClass} font-mono`}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="hr_v1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-version" className="block font-semibold text-slate-700">
              Phiên bản profile *
            </label>
            <input
              id="prof-version"
              className={`${inputClass} font-mono`}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-schema-version" className="block font-semibold text-slate-700">
              Phiên bản source schema *
            </label>
            <input
              id="prof-schema-version"
              className={`${inputClass} font-mono`}
              value={sourceSchemaVersion}
              onChange={(e) => setSourceSchemaVersion(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-crosswalk" className="block font-semibold text-slate-700">
              Crosswalk release *
            </label>
            <input
              id="prof-crosswalk"
              className={`${inputClass} font-mono`}
              value={crosswalkRelease}
              onChange={(e) => setCrosswalkRelease(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prof-effective" className="block font-semibold text-slate-700">
              Thời điểm hiệu lực (effective_at) *
            </label>
            <input
              id="prof-effective"
              className={`${inputClass} font-mono`}
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 self-end pb-2 font-medium text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={collapseDuplicates}
              onChange={(e) => setCollapseDuplicates(e.target.checked)}
              className="size-4 accent-indigo-600"
            />
            Gộp bản ghi trùng lặp hoàn toàn (collapse_exact_duplicates)
          </label>
        </div>

        {/* Field mapping editor */}
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Ánh xạ cột (field_mapping)</span>
            <Button
              variant="outline"
              onClick={() => setMappingRows((rows) => [...rows, { source: '', target: '' }])}
            >
              + Thêm dòng ánh xạ
            </Button>
          </div>
          <div className="space-y-2">
            {mappingRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  aria-label={`Cột nguồn #${idx + 1}`}
                  className={`${inputClass} font-mono`}
                  placeholder="Cột nguồn (vd. ma_nv)"
                  value={row.source}
                  onChange={(e) =>
                    setMappingRows((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, source: e.target.value } : r))
                    )
                  }
                />
                <input
                  aria-label={`Cột đích #${idx + 1}`}
                  className={`${inputClass} font-mono`}
                  placeholder="Cột đích Silver (vd. employee_code)"
                  value={row.target}
                  onChange={(e) =>
                    setMappingRows((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, target: e.target.value } : r))
                    )
                  }
                />
                <Button
                  variant="ghost"
                  onClick={() => setMappingRows((rows) => rows.filter((_, i) => i !== idx))}
                  aria-label={`Xóa dòng ánh xạ #${idx + 1}`}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="prof-ignored" className="block font-semibold text-slate-700">
              Cột bỏ qua (ignored_columns, phân tách bởi dấu phẩy)
            </label>
            <input
              id="prof-ignored"
              className={`${inputClass} font-mono`}
              value={ignoredColumnsText}
              onChange={(e) => setIgnoredColumnsText(e.target.value)}
              placeholder="ghi_chu_tam, temp_col"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="prof-preview-cols" className="block font-semibold text-slate-700">
              Cột cho phép xem trước khi Quarantine (source_preview_columns)
            </label>
            <input
              id="prof-preview-cols"
              className={`${inputClass} font-mono`}
              value={previewColumnsText}
              onChange={(e) => setPreviewColumnsText(e.target.value)}
              placeholder="ma_nv, ho_ten, phong_ban"
            />
          </div>
        </div>

        {/* Cấu hình JSON nâng cao */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="prof-source-schema" className="block font-semibold text-slate-700">
              source_schema (JSON) *
            </label>
            <textarea
              id="prof-source-schema"
              rows={4}
              className={textareaClass}
              value={sourceSchemaJson}
              onChange={(e) => setSourceSchemaJson(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="prof-contracts" className="block font-semibold text-slate-700">
              contracts (JSON) *
            </label>
            <textarea
              id="prof-contracts"
              rows={4}
              className={textareaClass}
              value={contractsJson}
              onChange={(e) => setContractsJson(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="prof-format-opts" className="block font-semibold text-slate-700">
              format_options (JSON)
            </label>
            <textarea
              id="prof-format-opts"
              rows={3}
              className={textareaClass}
              value={formatOptionsJson}
              onChange={(e) => setFormatOptionsJson(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="prof-type-opts" className="block font-semibold text-slate-700">
              type_options (JSON)
            </label>
            <textarea
              id="prof-type-opts"
              rows={3}
              className={textareaClass}
              value={typeOptionsJson}
              onChange={(e) => setTypeOptionsJson(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="prof-null-tokens" className="block font-semibold text-slate-700">
              null_tokens (JSON)
            </label>
            <textarea
              id="prof-null-tokens"
              rows={3}
              className={textareaClass}
              value={nullTokensJson}
              onChange={(e) => setNullTokensJson(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="prof-dictionaries" className="block font-semibold text-slate-700">
              dictionaries &amp; reference_namespaces (JSON)
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <textarea
                id="prof-dictionaries"
                aria-label="dictionaries JSON"
                rows={3}
                className={textareaClass}
                value={dictionariesJson}
                onChange={(e) => setDictionariesJson(e.target.value)}
              />
              <textarea
                aria-label="reference_namespaces JSON"
                rows={3}
                className={textareaClass}
                value={referenceNamespacesJson}
                onChange={(e) => setReferenceNamespacesJson(e.target.value)}
              />
            </div>
          </div>
        </div>

        {(formError || saveMutation.isError) && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"
          >
            <span>
              {formError ?? getApiErrorMessage(saveMutation.error, 'Không thể lưu Silver Profile.')}
            </span>
            {revisionConflict && isEdit && (
              <Button variant="outline" onClick={() => void handleReloadLatest()}>
                Tải lại bản mới nhất
              </Button>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Đang lưu…' : isEdit ? 'Lưu cập nhật' : 'Tạo profile'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function ProfilesView() {
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none')

  const listQuery = useQuery({
    queryKey: ['silver-profiles', { limit: PAGE_SIZE, offset }],
    queryFn: () => API_ListProfiles({ limit: PAGE_SIZE, offset }),
  })

  const detailQuery = useQuery({
    queryKey: ['silver-profiles', selectedId],
    queryFn: () => API_GetProfile(selectedId!),
    enabled: selectedId !== null,
  })

  const profiles = listQuery.data ?? []
  const selectedProfile = detailQuery.data

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Cấu hình Silver (Profiles)']}
        title="Quản lý cấu hình chuẩn hóa Silver (Profiles)"
        description="Khai báo quy tắc ánh xạ cột, kiểu dữ liệu, hợp đồng schema và quyền xem cột nguồn cho quy trình Cleaning & Silver."
        actions={
          <>
            <Button
              onClick={() => void listQuery.refetch()}
              disabled={listQuery.isFetching}
              icon={
                <RefreshCw
                  className={`size-3.5 ${listQuery.isFetching ? 'animate-spin' : ''}`}
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
              Tạo profile mới
            </Button>
          </>
        }
      />

      {formMode === 'create' && (
        <ProfileFormPanel
          onClose={() => setFormMode('none')}
          onSaved={(saved) => setSelectedId(saved.profile_id)}
        />
      )}

      {formMode === 'edit' && selectedProfile && (
        <ProfileFormPanel
          initial={selectedProfile}
          onClose={() => setFormMode('none')}
          onSaved={(saved) => setSelectedId(saved.profile_id)}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <Card title="Danh sách Silver Profiles" bodyClassName="p-0">
          {listQuery.isPending ? (
            <LoadingState />
          ) : listQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(listQuery.error, 'Không tải được danh sách profile.')}
                onRetry={() => void listQuery.refetch()}
              />
            </div>
          ) : profiles.length === 0 ? (
            <EmptyState
              title="Chưa có Silver Profile nào"
              description="Bấm Tạo profile mới để khai báo cấu hình chuẩn hóa."
            />
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {profiles.map((profile) => {
                  const active = selectedId === profile.profile_id
                  return (
                    <li key={profile.profile_id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(profile.profile_id)
                          setFormMode('none')
                        }}
                        className={`flex w-full items-start justify-between gap-2 px-4 py-3 text-left text-xs transition-colors ${
                          active ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono font-semibold text-slate-900">
                            {profile.profile_id}
                          </p>
                          <p className="text-slate-500">
                            {profile.definition.domain} · {profile.definition.entity} · Dataset #
                            {profile.definition.dataset_id}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Tag tone="slate">rev {profile.revision}</Tag>
                          <Tag tone="indigo">{profile.storage}</Tag>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
                <span>{profiles.length} profile</span>
                <div className="flex gap-1">
                  <Button
                    disabled={offset === 0}
                    onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                    icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                  >
                    Trước
                  </Button>
                  <Button
                    disabled={profiles.length < PAGE_SIZE}
                    onClick={() => setOffset((p) => p + PAGE_SIZE)}
                    icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card
          title={
            selectedProfile ? `Chi tiết Profile: ${selectedProfile.profile_id}` : 'Chi tiết Profile'
          }
          right={
            selectedProfile && (
              <Button
                variant="outline"
                onClick={() => setFormMode('edit')}
                icon={<Edit3 className="size-3.5" aria-hidden="true" />}
              >
                Chỉnh sửa
              </Button>
            )
          }
        >
          {!selectedId ? (
            <EmptyState
              title="Chọn một Silver Profile để xem chi tiết"
              description="Xem thông tin ràng buộc nguồn, ánh xạ cột, cấu hình hợp đồng và lịch sử revision."
            />
          ) : detailQuery.isPending ? (
            <LoadingState />
          ) : detailQuery.isError || !selectedProfile?.definition ? (
            <ErrorState
              message={getApiErrorMessage(detailQuery.error, 'Không tải được chi tiết profile.')}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : (
            <div className="space-y-4 text-xs">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Revision / Lưu trữ</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-slate-900">
                    rev {selectedProfile.revision} ({selectedProfile.storage})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Fingerprint</dt>
                  <dd className="mt-0.5 truncate font-mono text-slate-700">
                    {selectedProfile.fingerprint}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Lĩnh vực / Entity / Scope</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">
                    {selectedProfile.definition.domain} · {selectedProfile.definition.entity} ·{' '}
                    {selectedProfile.definition.scope}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ràng buộc Nguồn / Dataset</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">
                    Source #{selectedProfile.definition.data_source_id} · Dataset #
                    {selectedProfile.definition.dataset_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tệp nguồn</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">
                    {selectedProfile.definition.source_type}:{' '}
                    {selectedProfile.definition.source_table}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Crosswalk / Trùng lặp</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">
                    {selectedProfile.definition.crosswalk_release} ·{' '}
                    {selectedProfile.definition.collapse_exact_duplicates ? 'Có gộp' : 'Không gộp'}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="mb-1.5 font-semibold text-slate-800">
                  Ánh xạ cột ({Object.keys(selectedProfile.definition.field_mapping).length})
                </p>
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-1.5 font-medium">
                          Cột nguồn
                        </th>
                        <th scope="col" className="px-3 py-1.5 font-medium">
                          Cột đích Silver
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(selectedProfile.definition.field_mapping).map(
                        ([src, dst]) => (
                          <tr key={src}>
                            <td className="px-3 py-1.5 font-mono text-slate-700">{src}</td>
                            <td className="px-3 py-1.5 font-mono font-semibold text-indigo-700">
                              {dst}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 font-semibold text-slate-800">Cột xem trước khi Quarantine</p>
                  <p className="font-mono text-slate-700">
                    {(selectedProfile.definition.source_preview_columns ?? []).join(', ') || '—'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-semibold text-slate-800">Cột bỏ qua</p>
                  <p className="font-mono text-slate-700">
                    {(selectedProfile.definition.ignored_columns ?? []).join(', ') || '—'}
                  </p>
                </div>
              </div>

              <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer font-semibold text-slate-800">
                  Xem toàn bộ cấu hình JSON (Schema, Contracts, Format/Type/Null/Dictionaries)
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded bg-white p-2 font-mono text-[11px] text-slate-800">
                  {JSON.stringify(selectedProfile.definition, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
