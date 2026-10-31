'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'

import { API_CreateDataSource, API_GetDataSource, API_UpdateDataSource } from '@/api/api_data'
import { getApiErrorDetails, getApiErrorMessage, getApiRequestId } from '@/api/http'
import { Card, ErrorState, LoadingState, PageHeader } from '@/components/page/page-parts'
import {
  SOURCE_SYSTEMS,
  SOURCE_TYPE_CONFIG,
  SOURCE_TYPES,
  buildConfiguration,
} from '@/config/data-sources'
import { cn } from '@/lib/utils'
import type { DataSourceCreatePayload, DataSourceItem, SourceType } from '@/types/data'

const inputClass =
  'h-9 w-full rounded-md border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2'
const okClass = 'border-slate-300 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30'
const badClass = 'border-2 border-rose-500 bg-rose-50 focus-visible:ring-rose-500/30'

function defaultConfig(type: SourceType): Record<string, string> {
  return Object.fromEntries(SOURCE_TYPE_CONFIG[type].fields.map((f) => [f.key, f.defaultValue]))
}

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[11px] text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-[11px] text-slate-400">{hint}</p>
      )}
    </div>
  )
}

function isSourceType(value: string): value is SourceType {
  return SOURCE_TYPES.includes(value as SourceType)
}

/** Form dùng chung cho thêm mới (không có `initial`) và chỉnh sửa nguồn dữ liệu. */
function SourceForm({ initial }: { initial?: DataSourceItem }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = initial !== undefined
  const initialType: SourceType =
    initial && isSourceType(initial.source_type) ? initial.source_type : 'CSV'
  const [systemId, setSystemId] = useState<string>(
    String(initial?.source_system_id ?? SOURCE_SYSTEMS[0].id)
  )
  const [name, setName] = useState(initial?.source_name ?? '')
  const [sourceType, setSourceType] = useState<SourceType>(initialType)
  const [location, setLocation] = useState(initial?.location ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  // Backend không trả configuration về (tránh lộ thông tin kết nối), nên khi sửa chỉ gửi
  // cấu hình mới nếu người dùng chọn nhập lại.
  const [replaceConfig, setReplaceConfig] = useState(!isEdit)
  const [config, setConfig] = useState<Record<string, string>>(() => defaultConfig(initialType))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const typeConfig = SOURCE_TYPE_CONFIG[sourceType]
  const systemMissing =
    initial !== undefined && !SOURCE_SYSTEMS.some((s) => s.id === initial.source_system_id)

  const save = useMutation({
    mutationFn: (payload: DataSourceCreatePayload) => {
      if (!initial) {
        return API_CreateDataSource(payload)
      }
      const { configuration, source_type: _type, ...rest } = payload
      return API_UpdateDataSource(
        initial.data_source_id,
        replaceConfig ? { ...rest, configuration } : rest
      )
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['datasources'] })
      toast.success(
        isEdit
          ? `Đã cập nhật nguồn “${saved.source_name}”.`
          : `Đã thêm nguồn “${saved.source_name}”.`
      )
      router.push('/data')
    },
  })

  function changeType(type: SourceType) {
    setSourceType(type)
    setConfig(defaultConfig(type))
    setErrors({})
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const trimmedName = name.trim()
    if (!trimmedName) {
      nextErrors.name = 'Vui lòng nhập tên nguồn dữ liệu.'
    } else if (trimmedName.length > 200) {
      nextErrors.name = 'Tên nguồn tối đa 200 ký tự.'
    }
    if (!location.trim()) {
      nextErrors.location = 'Vui lòng nhập vị trí của nguồn.'
    }
    const built = replaceConfig
      ? buildConfiguration(sourceType, config)
      : { configuration: {}, errors: {} }
    for (const [key, message] of Object.entries(built.errors)) {
      nextErrors[`config.${key}`] = message
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    save.mutate({
      source_system_id: Number(systemId),
      source_name: trimmedName,
      source_type: sourceType,
      connection_type: typeConfig.connectionType,
      location: location.trim(),
      configuration: built.configuration,
      description: description.trim() || null,
      is_active: isActive,
    })
  }

  const errorCount = Object.keys(errors).length
  const serverDetails = save.isError ? getApiErrorDetails(save.error) : []

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Nguồn dữ liệu', isEdit ? 'Chỉnh sửa' : 'Thêm mới']}
        title={isEdit ? `Chỉnh sửa: ${initial.source_name}` : 'Thêm nguồn dữ liệu'}
        description={
          isEdit
            ? 'Cập nhật thông tin nguồn. Loại nguồn không đổi được; cấu hình chỉ gửi đi khi chọn nhập lại.'
            : 'Chỉ đăng ký nguồn, không chạy Ingestion. Trường cấu hình thay đổi theo Loại nguồn.'
        }
        actions={
          <>
            <Link
              href="/data"
              className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Huỷ
            </Link>
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
            >
              {save.isPending && (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              {save.isPending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Lưu nguồn dữ liệu'}
            </button>
          </>
        }
      />

      {(save.isError || errorCount > 0) && (
        <div
          role="alert"
          className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs"
        >
          <CircleAlert className="mt-px size-4 shrink-0 text-rose-600" aria-hidden="true" />
          <div className="space-y-1 text-rose-700">
            <p className="font-semibold">
              {save.isError
                ? getApiErrorMessage(save.error, 'Không lưu được nguồn dữ liệu.')
                : `${errorCount} trường chưa hợp lệ`}
            </p>
            {serverDetails.map((detail) => (
              <p key={detail} className="font-mono text-[11px]">
                {detail}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card title="Thông tin nguồn" subtitle="Các trường có dấu * là bắt buộc">
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="source-system" label="Hệ thống nguồn *">
                <select
                  id="source-system"
                  className={cn(inputClass, okClass)}
                  value={systemId}
                  onChange={(event) => setSystemId(event.target.value)}
                >
                  {systemMissing && (
                    <option value={initial.source_system_id}>
                      {initial.source_system_name ?? `#${initial.source_system_id}`}
                    </option>
                  )}
                  {SOURCE_SYSTEMS.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="source-name" label="Tên nguồn dữ liệu *" error={errors.name}>
                <input
                  id="source-name"
                  className={cn(inputClass, errors.name ? badClass : okClass)}
                  value={name}
                  placeholder="Admissions Applicants CSV 2026"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'source-name-error' : undefined}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field id="source-type" label="Loại nguồn * (không đổi được sau khi lưu)">
                <select
                  id="source-type"
                  className={cn(inputClass, okClass)}
                  value={sourceType}
                  disabled={isEdit}
                  onChange={(event) => changeType(event.target.value as SourceType)}
                >
                  {SOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="connection-type" label="Kiểu kết nối">
                <input
                  id="connection-type"
                  className={cn(inputClass, okClass, 'bg-slate-50 font-mono')}
                  value={typeConfig.connectionType}
                  readOnly
                />
              </Field>
              <div className="md:col-span-2">
                <Field
                  id="location"
                  label="Vị trí (đường dẫn / bucket / endpoint) *"
                  error={errors.location}
                >
                  <input
                    id="location"
                    className={cn(inputClass, 'font-mono', errors.location ? badClass : okClass)}
                    value={location}
                    placeholder={typeConfig.locationHint}
                    aria-invalid={errors.location ? true : undefined}
                    aria-describedby={errors.location ? 'location-error' : undefined}
                    onChange={(event) => setLocation(event.target.value)}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field id="description" label="Mô tả">
                  <textarea
                    id="description"
                    rows={2}
                    className={cn(inputClass, okClass, 'h-auto py-2')}
                    value={description}
                    placeholder="Dữ liệu thí sinh năm 2026"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300 accent-indigo-600"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                {isEdit ? 'Nguồn đang hoạt động' : 'Bật nguồn ngay sau khi lưu'}
              </label>
            </div>
          </Card>

          <Card
            title={`Cấu hình theo loại nguồn: ${typeConfig.label}`}
            subtitle={`Khoá bắt buộc: ${typeConfig.fields
              .filter((f) => f.required)
              .map((f) => f.key)
              .join(', ')}`}
            right={
              <span className="font-mono text-[10px] text-slate-400">configuration (JSONB)</span>
            }
          >
            {isEdit && (
              <label className="mb-4 flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300 accent-indigo-600"
                  checked={replaceConfig}
                  onChange={(event) => setReplaceConfig(event.target.checked)}
                />
                Nhập lại cấu hình (cấu hình hiện tại không hiển thị vì lý do bảo mật)
              </label>
            )}
            {replaceConfig && (
              <div className="grid gap-4 md:grid-cols-2">
                {typeConfig.fields.map((field) => {
                  const id = `config-${field.key}`
                  const error = errors[`config.${field.key}`]
                  const common = {
                    id,
                    value: config[field.key] ?? '',
                    'aria-invalid': error ? true : undefined,
                    'aria-describedby': error ? `${id}-error` : undefined,
                    onChange: (
                      event: React.ChangeEvent<
                        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                      >
                    ) => setConfig((prev) => ({ ...prev, [field.key]: event.target.value })),
                  }
                  const className = cn(inputClass, 'font-mono', error ? badClass : okClass)
                  return (
                    <div
                      key={field.key}
                      className={field.kind === 'json' ? 'md:col-span-2' : undefined}
                    >
                      <Field
                        id={id}
                        label={`${field.label}${field.required ? ' *' : ''}`}
                        error={error}
                        hint={field.hint}
                      >
                        {field.kind === 'boolean' ? (
                          <select {...common} className={className}>
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : field.kind === 'select' ? (
                          <select {...common} className={className}>
                            {field.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : field.kind === 'json' ? (
                          <textarea {...common} rows={3} className={cn(className, 'h-auto py-2')} />
                        ) : (
                          <input
                            {...common}
                            inputMode={field.kind === 'number' ? 'numeric' : undefined}
                            className={className}
                          />
                        )}
                      </Field>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Kiểm tra trước khi lưu" subtitle="Backend trả lỗi kèm trường không hợp lệ">
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-5 text-slate-600">
              <li>Hệ thống nguồn phải tồn tại và đang hoạt động</li>
              <li>Tên nguồn không rỗng, tối đa 200 ký tự</li>
              <li>Loại nguồn thuộc danh sách hỗ trợ</li>
              <li>configuration đủ khoá bắt buộc theo loại nguồn</li>
              <li>Không lưu mật khẩu dạng chữ thường, dùng secret reference</li>
            </ul>
          </Card>
          <Card title="Phân quyền">
            <p className="text-xs leading-5 text-slate-600">
              Chỉ DATA_ADMIN và ADMIN được thêm / sửa. ANALYST và VIEWER chỉ xem.
            </p>
          </Card>
        </div>
      </div>
    </form>
  )
}

export function SourceFormView() {
  return <SourceForm />
}

export function SourceEditView({ id }: { id: number }) {
  const detail = useQuery({
    queryKey: ['datasources', 'detail', id],
    queryFn: () => API_GetDataSource(id),
  })

  if (detail.isPending) {
    return <LoadingState label="Đang tải thông tin nguồn dữ liệu…" />
  }
  if (detail.isError) {
    return (
      <ErrorState
        requestId={getApiRequestId(detail.error)}
        message={getApiErrorMessage(detail.error, 'Không tải được nguồn dữ liệu.')}
        onRetry={() => void detail.refetch()}
      />
    )
  }
  return <SourceForm key={detail.data.data_source_id} initial={detail.data} />
}
