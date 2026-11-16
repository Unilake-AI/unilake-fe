'use client'

import { useState } from 'react'

import { useMutation } from '@tanstack/react-query'

import { API_ConfirmCleaningSetup, API_PreviewCleaningSetup } from '@/api/admindata/cleaning-setup'
import type {
  CleaningChoices,
  CleaningSetupAnalysis,
  DateOrder,
  FieldKind,
} from '@/api/admindata/cleaning-setup'
import { getApiErrorMessage } from '@/api/http'
import { Button, ErrorState } from '@/components/page/page-parts'
import type { SilverProfileRead } from '@/types/silver-profiles'

import { formatCellValue } from './data-helpers'

const inputClass = 'w-full rounded-md border border-slate-300 bg-white p-2 text-sm'
const dateLabels: Record<DateOrder, string> = {
  YMD: 'Năm-tháng-ngày (2026-02-01)',
  DMY: 'Ngày/tháng/năm (01/02/2026)',
  MDY: 'Tháng/ngày/năm (02/01/2026)',
}

function initialChoices(analysis: CleaningSetupAnalysis, entityName: string): CleaningChoices {
  const entity = analysis.entities.find((item) => item.entity === entityName)
  return {
    analysis_fingerprint: analysis.analysis_fingerprint,
    entity: entityName,
    identity_mode: 'source',
    field_types: entity?.custom
      ? Object.fromEntries(entity.fields.map((field) => [field.name, field.kind as FieldKind]))
      : {},
    identifier_fields: (entity?.fields ?? [])
      .filter((field) => field.identifier)
      .map((field) => field.name),
    required_fields: [],
    primary_key: [],
    field_mapping: { ...entity?.field_mapping },
    ignored_columns: [],
    reference_namespaces: {},
    date_formats: Object.fromEntries(
      (entity?.fields ?? [])
        .filter((field) => field.kind === 'date' && field.date_formats.length === 1)
        .map((field) => [field.name, field.date_formats[0]!])
    ),
    null_tokens: [''],
    trim_text: false,
    collapse_exact_duplicates: false,
    crosswalk_release: null,
  }
}

function SampleTable({ rows, title }: { rows: Record<string, unknown>[]; title: string }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{title}: chưa có dòng đạt.</p>
  const columns = Object.keys(rows[0] ?? {})
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 font-semibold">{title}</p>
      <table className="w-full text-left text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="p-2">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column} className="border-t p-2">
                  {formatCellValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CleaningSetupPanel({
  analysis,
  onSaved,
}: {
  analysis: CleaningSetupAnalysis
  onSaved: (profile: SilverProfileRead) => void
}) {
  const [choices, setChoices] = useState(() =>
    initialChoices(analysis, analysis.suggested_entity ?? '')
  )
  const [nullText, setNullText] = useState('')
  const entity = analysis.entities.find((item) => item.entity === choices.entity)
  const preview = useMutation({
    mutationFn: (value: CleaningChoices) =>
      API_PreviewCleaningSetup(analysis.ingestion_job_id, value),
  })
  const confirm = useMutation({
    mutationFn: (token: string) =>
      API_ConfirmCleaningSetup(analysis.ingestion_job_id, choices, token),
    onSuccess: onSaved,
  })
  const busy = preview.isPending || confirm.isPending
  const extras = analysis.columns.filter(
    (column) => !Object.values(choices.field_mapping).includes(column.name)
  )
  // Chỉ chờ đủ lựa chọn xử lý. Dòng có lỗi vẫn cần được làm sạch và tách ra kiểm tra.
  const pendingSteps: string[] = []
  if (!entity || entity.fields.length === 0) {
    pendingSteps.push('Chọn loại dữ liệu cần xử lý.')
  } else {
    for (const field of entity.fields) {
      if (!choices.field_mapping[field.name]) {
        pendingSteps.push(`Chọn cột trong file cho ${field.name}.`)
      }
      if (
        (entity.custom ? choices.field_types[field.name] : field.kind) === 'date' &&
        !choices.date_formats[field.name]
      ) {
        const source = choices.field_mapping[field.name]
        pendingSteps.push(
          `Chọn cách đọc ngày cho ${source && source !== field.name ? `${source} → ${field.name}` : field.name}.`
        )
      }
      if (
        choices.identity_mode === 'canonical' &&
        field.reference_entity &&
        !choices.reference_namespaces[field.name]
      ) {
        pendingSteps.push(`Chọn nguồn chứa mã liên kết cho ${field.name}.`)
      }
    }
    const unconfirmed = extras.filter((column) => !choices.ignored_columns.includes(column.name))
    if (unconfirmed.length > 0) {
      pendingSteps.push(
        `Ghép vào cột cần lưu hoặc xác nhận bỏ qua: ${unconfirmed.map((column) => column.name).join(', ')}.`
      )
    }
  }
  const complete = pendingSteps.length === 0

  function change(next: CleaningChoices) {
    // Mỗi lần đổi lựa chọn cần xem trước lại để tránh xác nhận nhầm kết quả cũ.
    setChoices(next)
    preview.reset()
    confirm.reset()
  }

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm">
        Đã đọc {analysis.records_read.toLocaleString('vi-VN')} dòng từ {analysis.source_table}. Kiểm
        tra gợi ý, xem trước rồi xác nhận để dùng lại cho các lần nạp sau.
      </p>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
        <label className="block text-sm font-medium">
          Cách xử lý mã
          <select
            className={inputClass}
            value={choices.identity_mode}
            onChange={(event) => {
              const mode = event.target.value as 'source' | 'canonical'
              const next = initialChoices(
                analysis,
                mode === 'canonical' && entity?.custom ? '' : choices.entity
              )
              change({
                ...next,
                identity_mode: mode,
                field_types: mode === 'canonical' ? {} : next.field_types,
                identifier_fields: mode === 'canonical' ? [] : next.identifier_fields,
                crosswalk_release:
                  mode === 'canonical' && analysis.crosswalk_releases.length === 1
                    ? analysis.crosswalk_releases[0]!
                    : null,
              })
            }}
          >
            <option value="source">Giữ mã nguồn — làm sạch và chuẩn hóa cơ bản</option>
            <option value="canonical">Hợp nhất mã giữa các nguồn — nâng cao</option>
          </select>
        </label>
        {choices.identity_mode === 'source' && (
          <p className="text-sm text-slate-600">
            Mã nguồn như “007” được giữ nguyên. Có thể xác nhận và lưu Silver mà không cần bản đối
            chiếu mã.
          </p>
        )}
        <label className="block text-sm font-medium">
          Loại dữ liệu cần xử lý
          <select
            className={inputClass}
            value={choices.entity}
            onChange={(event) => {
              setNullText('')
              const next = initialChoices(analysis, event.target.value)
              change({
                ...next,
                identity_mode: choices.identity_mode,
                field_types: choices.identity_mode === 'canonical' ? {} : next.field_types,
                identifier_fields:
                  choices.identity_mode === 'canonical' ? [] : next.identifier_fields,
                crosswalk_release: choices.crosswalk_release,
              })
            }}
          >
            <option value="">Chọn loại dữ liệu phù hợp</option>
            {analysis.entities
              .filter((item) => choices.identity_mode === 'source' || !item.custom)
              .map((item) => (
                <option key={item.entity} value={item.entity}>
                  {item.custom ? 'Theo cấu trúc file' : item.entity} — khớp {item.matched_columns}/
                  {item.total_columns} cột
                </option>
              ))}
          </select>
        </label>
        {entity && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{entity.label}</p>
            {entity.fields.length === 0 && (
              <p className="text-sm text-amber-800">
                Chưa có cột được phép lưu theo cách xử lý này. Hãy kiểm tra cấu trúc file và quy
                định bảo vệ thông tin.
              </p>
            )}
            {entity.fields.map((field) => (
              <div
                key={field.name}
                className="grid gap-2 rounded-md border bg-white p-3 md:grid-cols-2"
              >
                <label className="text-sm">
                  Cột nguồn cho {field.name}
                  <select
                    className={inputClass}
                    value={choices.field_mapping[field.name] ?? ''}
                    onChange={(event) => {
                      const fieldMapping = {
                        ...choices.field_mapping,
                        [field.name]: event.target.value,
                      }
                      change({
                        ...choices,
                        field_mapping: fieldMapping,
                        ignored_columns: choices.ignored_columns.filter(
                          (name) => !Object.values(fieldMapping).includes(name)
                        ),
                      })
                    }}
                  >
                    <option value="">Chọn cột trong file</option>
                    {analysis.columns.map((column) => (
                      <option
                        key={column.name}
                        value={column.name}
                        disabled={Object.entries(choices.field_mapping).some(
                          ([target, source]) => target !== field.name && source === column.name
                        )}
                      >
                        {column.name} · {column.empty_count} ô trống
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-xs text-slate-600">
                  <p>{field.label}</p>
                  {entity.custom && choices.identity_mode === 'source' && (
                    <div className="my-2 space-y-2">
                      <label className="block">
                        Kiểu lưu cho {field.name}
                        <select
                          className={inputClass}
                          value={choices.field_types[field.name] ?? 'string'}
                          disabled={choices.identifier_fields.includes(field.name)}
                          onChange={(event) => {
                            const kind = event.target.value as FieldKind
                            const dates = { ...choices.date_formats }
                            delete dates[field.name]
                            if (kind === 'date' && field.date_formats.length === 1)
                              dates[field.name] = field.date_formats[0]!
                            change({
                              ...choices,
                              field_types: { ...choices.field_types, [field.name]: kind },
                              date_formats: dates,
                            })
                          }}
                        >
                          <option value="string">Chữ — giữ cách viết của nguồn</option>
                          <option value="integer">Số nguyên</option>
                          <option value="decimal">
                            Số thập phân — tối đa 10 chữ số sau dấu chấm
                          </option>
                          <option value="date">Ngày tháng</option>
                          <option value="timestamp">Ngày giờ có múi giờ</option>
                          <option value="boolean">Đúng / sai</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={choices.identifier_fields.includes(field.name)}
                          disabled={choices.primary_key.includes(field.name)}
                          onChange={(event) => {
                            const dates = { ...choices.date_formats }
                            if (event.target.checked) delete dates[field.name]
                            change({
                              ...choices,
                              identifier_fields: event.target.checked
                                ? [...choices.identifier_fields, field.name]
                                : choices.identifier_fields.filter((name) => name !== field.name),
                              field_types: {
                                ...choices.field_types,
                                [field.name]: event.target.checked
                                  ? 'string'
                                  : (choices.field_types[field.name] ?? 'string'),
                              },
                              date_formats: dates,
                            })
                          }}
                        />
                        Đây là mã nguồn — giữ số 0 và khoảng trắng
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={choices.primary_key.includes(field.name)}
                          onChange={(event) => {
                            const dates = { ...choices.date_formats }
                            if (event.target.checked) delete dates[field.name]
                            change({
                              ...choices,
                              primary_key: event.target.checked
                                ? [...choices.primary_key, field.name]
                                : choices.primary_key.filter((name) => name !== field.name),
                              identifier_fields: event.target.checked
                                ? [...new Set([...choices.identifier_fields, field.name])]
                                : choices.identifier_fields,
                              field_types: {
                                ...choices.field_types,
                                [field.name]: event.target.checked
                                  ? 'string'
                                  : (choices.field_types[field.name] ?? 'string'),
                              },
                              date_formats: dates,
                            })
                          }}
                        />
                        Dùng mã này để phân biệt các dòng dữ liệu
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={
                            choices.primary_key.includes(field.name) ||
                            choices.required_fields.includes(field.name)
                          }
                          disabled={choices.primary_key.includes(field.name)}
                          onChange={(event) =>
                            change({
                              ...choices,
                              required_fields: event.target.checked
                                ? [...choices.required_fields, field.name]
                                : choices.required_fields.filter((name) => name !== field.name),
                            })
                          }
                        />
                        Cột này cần có giá trị
                      </label>
                    </div>
                  )}

                  {choices.identity_mode === 'canonical' && field.reference_entity && (
                    <label className="mt-2 block">
                      Nguồn chứa mã liên kết cho {field.name}
                      <select
                        className={inputClass}
                        value={choices.reference_namespaces[field.name] ?? ''}
                        onChange={(event) =>
                          change({
                            ...choices,
                            reference_namespaces: {
                              ...choices.reference_namespaces,
                              [field.name]: event.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Chọn hệ thống chứa mã {field.reference_entity}</option>
                        {analysis.reference_sources.map((source) => (
                          <option key={source.namespace} value={source.namespace}>
                            {source.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {field.identifier
                    ? 'Mã nhận diện: giữ nguyên giá trị nguồn, kể cả số 0 ở đầu.'
                    : field.nullable
                      ? 'Cho phép để trống; không tự điền giá trị.'
                      : 'Cần có giá trị; dòng thiếu sẽ được tách ra để kiểm tra.'}
                  {field.allowed_values.length > 0 && (
                    <p>Giá trị theo quy định: {field.allowed_values.join(', ')}</p>
                  )}
                  {(entity.custom ? choices.field_types[field.name] : field.kind) === 'date' && (
                    <label className="mt-2 block">
                      Cách đọc ngày cho {field.name}
                      <select
                        className={inputClass}
                        value={choices.date_formats[field.name] ?? ''}
                        onChange={(event) =>
                          change({
                            ...choices,
                            date_formats: {
                              ...choices.date_formats,
                              [field.name]: event.target.value as DateOrder,
                            },
                          })
                        }
                      >
                        <option value="">Cần xác nhận cách đọc ngày</option>
                        {Object.entries(dateLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {extras.length > 0 && entity && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Các cột chưa sử dụng — xác nhận từng cột muốn bỏ qua:</p>
            {extras.map((column) => (
              <label key={column.name} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={choices.ignored_columns.includes(column.name)}
                  onChange={(event) =>
                    change({
                      ...choices,
                      ignored_columns: event.target.checked
                        ? [...choices.ignored_columns, column.name]
                        : choices.ignored_columns.filter((name) => name !== column.name),
                    })
                  }
                />
                Bỏ qua cột {column.name}
              </label>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={choices.trim_text}
            onChange={(event) => change({ ...choices, trim_text: event.target.checked })}
          />
          Bỏ khoảng trắng ở đầu và cuối nội dung chữ; giữ nguyên mã nhận diện.
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={choices.collapse_exact_duplicates}
            onChange={(event) =>
              change({ ...choices, collapse_exact_duplicates: event.target.checked })
            }
          />
          Gộp những dòng trùng hoàn toàn theo cách xử lý đã chọn.
        </label>
        <label className="block text-sm">
          Các giá trị khác được coi là trống, cách nhau bằng dấu phẩy
          <input
            className={inputClass}
            value={nullText}
            placeholder="Để trống nếu chỉ coi ô rỗng là thiếu dữ liệu"
            onChange={(event) => {
              setNullText(event.target.value)
              change({
                ...choices,
                null_tokens: [
                  '',
                  ...new Set(
                    event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  ),
                ],
              })
            }}
          />
        </label>
        {choices.identity_mode === 'canonical' && (
          <>
            <label className="block text-sm">
              Bản đối chiếu mã đã lưu
              <select
                className={inputClass}
                value={choices.crosswalk_release ?? ''}
                onChange={(event) =>
                  change({ ...choices, crosswalk_release: event.target.value || null })
                }
              >
                <option value="">Chưa chọn — chỉ xem trước phần làm sạch</option>
                {analysis.crosswalk_releases.map((release) => (
                  <option key={release} value={release}>
                    {release}
                  </option>
                ))}
              </select>
            </label>
            {analysis.crosswalk_releases.length === 0 && (
              <p className="text-sm text-amber-800">
                Chưa có bản đối chiếu mã. Bạn vẫn xem được phần làm sạch; cần thiết lập đối chiếu
                trước khi đưa dữ liệu vào Silver.
              </p>
            )}
          </>
        )}
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          {analysis.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </fieldset>
      {(preview.error || confirm.error) && (
        <ErrorState
          message={getApiErrorMessage(
            confirm.error ?? preview.error,
            'Không thể kiểm tra cách xử lý.'
          )}
        />
      )}
      <div aria-live="polite" className="space-y-2 text-sm">
        {pendingSteps.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <p className="font-semibold">Cần hoàn tất trước khi xem trước:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {pendingSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p className="mt-2">
              File có dòng sai vẫn có thể làm sạch. Hãy chọn cách đọc ngày theo dữ liệu nguồn; những
              giá trị sai sẽ được tách ra để kiểm tra.
            </p>
          </div>
        ) : !preview.data && !busy ? (
          <p className="text-slate-600">
            Đã đủ lựa chọn. Bấm “Xem trước cách xử lý”, sau đó “Xác nhận và lưu cách xử lý” để bật
            nút chạy làm sạch bên dưới.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!complete || busy} onClick={() => preview.mutate(choices)}>
          {preview.isPending ? 'Đang kiểm tra…' : 'Xem trước cách xử lý'}
        </Button>
        <Button
          variant="primary"
          disabled={!preview.data?.confirmation_token || busy || confirm.isSuccess}
          onClick={() => {
            if (preview.data?.confirmation_token) confirm.mutate(preview.data.confirmation_token)
          }}
        >
          {confirm.isPending ? 'Đang lưu…' : 'Xác nhận và lưu cách xử lý'}
        </Button>
      </div>
      {preview.data && (
        <div className="space-y-4 border-t pt-4" role="status">
          <p className="text-sm">
            Đã đọc {preview.data.records_read} dòng · Qua làm sạch:{' '}
            {preview.data.records_passed_cleaning} · Được chuẩn hóa:{' '}
            {preview.data.records_normalized} · Tách ra kiểm tra khi làm sạch:{' '}
            {preview.data.records_quarantined} · Gộp trùng: {preview.data.records_collapsed}.
          </p>
          <p className="text-sm text-slate-600">{preview.data.note}</p>
          {preview.data.blocking_reasons.map((reason) => (
            <p key={reason} className="text-sm text-amber-800">
              {reason}
            </p>
          ))}
          {preview.data.normalization_issues.length > 0 && (
            <p className="text-sm text-amber-800">
              Có {preview.data.normalization_issues.length} vấn đề ở bước chuẩn hóa. Các dòng này
              chưa được chấp nhận vào Silver.
            </p>
          )}
          <SampleTable title="Dữ liệu sau làm sạch" rows={preview.data.cleaned_sample} />
          <SampleTable title="Dữ liệu sau chuẩn hóa" rows={preview.data.normalized_sample} />
        </div>
      )}
      {confirm.isSuccess && (
        <p className="text-sm text-emerald-800">
          Đã lưu cách xử lý. Bạn có thể kiểm tra lại và bấm lưu Silver ở phía dưới.
        </p>
      )}
    </div>
  )
}
