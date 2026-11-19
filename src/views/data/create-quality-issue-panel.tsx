'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import {
  API_ApproveUploadReturn,
  API_PreviewUploadReturn,
  API_CreateQualityIssue,
  API_ListIssueAssignees,
  API_ListIssueDepartments,
} from '@/api/admindata/quality-issues'
import { API_ListQuarantineRecords } from '@/api/admindata/quarantine'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Tag,
} from '@/components/page/page-parts'
import type { QualityIssueDetail } from '@/types/quality-issues'
import type { QuarantineRecord } from '@/types/quarantine'

import { domainLabel } from './data-helpers'

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91830]/30'

export function CreateIssuePanel({
  onClose,
  onCreated,
  initialRecords,
}: {
  onClose: () => void
  onCreated: (issue: QualityIssueDetail) => void
  initialRecords?: QuarantineRecord[]
}) {
  const queryClient = useQueryClient()
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>(
    () => initialRecords?.map((record) => record.record_id) ?? []
  )
  const [returnToUploader, setReturnToUploader] = useState(true)
  const [departmentId, setDepartmentId] = useState('')
  const [assigneeUserId, setAssigneeUserId] = useState('')
  const [title, setTitle] = useState(initialRecords?.length ? 'Kiểm tra và sửa dữ liệu nguồn' : '')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const quarantineQuery = useQuery({
    queryKey: ['quarantine-records', 'for-issue-create'],
    queryFn: () => API_ListQuarantineRecords({ limit: 100, offset: 0 }),
    enabled: initialRecords === undefined,
  })

  const departmentsQuery = useQuery({
    queryKey: ['quality-issues', 'departments'],
    queryFn: API_ListIssueDepartments,
    enabled: !returnToUploader,
  })

  // Dùng đúng các hồ sơ vừa chọn, kể cả khi người dùng đã chuyển qua nhiều trang.
  const records = initialRecords ?? quarantineQuery.data ?? []
  const selectedRecords = records.filter((r) => selectedRecordIds.includes(r.record_id))
  const firstRecord = selectedRecords[0]
  const recordsCompatible =
    selectedRecords.length === 0 ||
    selectedRecords.every(
      (r) =>
        r.dataset_id === firstRecord?.dataset_id &&
        r.domain === firstRecord?.domain &&
        r.entity === firstRecord?.entity &&
        r.ingestion_job_id === firstRecord?.ingestion_job_id &&
        r.cleaning_run_id === firstRecord?.cleaning_run_id
    )

  // Khi bộ dữ liệu đã có phòng phụ trách, giữ đúng phòng đó để tránh giao nhầm.
  const effectiveDepartmentId =
    firstRecord?.owner_department_id != null
      ? String(firstRecord.owner_department_id)
      : departmentId
  const parsedDeptId = Number(effectiveDepartmentId)
  const inferredDomain = firstRecord?.domain as 'hr' | 'academic' | 'admissions' | undefined

  const assigneesQuery = useQuery({
    queryKey: ['quality-issues', 'assignees', parsedDeptId, inferredDomain],
    queryFn: () =>
      API_ListIssueAssignees({
        department_id: parsedDeptId,
        domain: inferredDomain!,
        limit: 100,
        offset: 0,
      }),
    enabled:
      !returnToUploader &&
      Number.isInteger(parsedDeptId) &&
      parsedDeptId > 0 &&
      Boolean(inferredDomain),
  })

  const returnPreview = useQuery({
    queryKey: ['quality-issues', 'return-preview', [...selectedRecordIds].sort()],
    queryFn: () => API_PreviewUploadReturn(selectedRecordIds),
    enabled:
      returnToUploader &&
      recordsCompatible &&
      selectedRecordIds.length > 0 &&
      selectedRecordIds.length <= 100,
    retry: false,
  })
  const createMutation = useMutation({
    mutationFn: () =>
      returnToUploader
        ? API_ApproveUploadReturn({
            title: title.trim(),
            description: description.trim(),
            quarantine_record_ids: selectedRecordIds,
          })
        : API_CreateQualityIssue({
            title: title.trim(),
            description: description.trim(),
            quarantine_record_ids: selectedRecordIds,
            department_id: parsedDeptId,
            assignee_user_id: assigneeUserId ? Number(assigneeUserId) : null,
          }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['quality-issues'] })
      toast.success(`Đã gửi yêu cầu xử lý “${created.title}”.`)
      onCreated(created)
      onClose()
    },
  })

  function toggleRecord(recordId: string) {
    setAssigneeUserId('')
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    )
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (createMutation.isPending) return
    setFormError(null)
    createMutation.reset()

    if (selectedRecordIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 hồ sơ cách ly (Quarantine).')
      return
    }
    if (selectedRecordIds.length > 100) {
      setFormError('Mỗi yêu cầu tối đa 100 hồ sơ. Hãy chia thành các yêu cầu nhỏ hơn.')
      return
    }
    if (!recordsCompatible) {
      setFormError(
        'Các hồ sơ được chọn phải thuộc cùng một lượt làm sạch, bộ dữ liệu và loại dữ liệu.'
      )
      return
    }
    if (
      returnToUploader &&
      (!returnPreview.data || returnPreview.isFetching || returnPreview.isError)
    )
      return
    if (!returnToUploader && (!Number.isInteger(parsedDeptId) || parsedDeptId <= 0)) {
      setFormError('Vui lòng chọn phòng ban phụ trách.')
      return
    }
    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề yêu cầu.')
      return
    }

    createMutation.mutate()
  }

  return (
    <Card
      title={initialRecords ? 'Gửi yêu cầu sửa về phòng ban' : 'Tạo yêu cầu xử lý dữ liệu lỗi mới'}
      subtitle="Chọn các hồ sơ Quarantine cùng lượt làm sạch và tệp nguồn để giao phòng ban xử lý."
      right={
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={createMutation.isPending}
          aria-label="Đóng form tạo yêu cầu"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      }
    >
      <form className="space-y-4 text-xs" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">
              1. Chọn hồ sơ cách ly ({selectedRecordIds.length} đã chọn) *
            </span>
            {firstRecord && (
              <span className="font-mono text-[11px] text-slate-500">
                Dataset #{firstRecord.dataset_id} · {domainLabel(firstRecord.domain)} ·{' '}
                {firstRecord.entity}
              </span>
            )}
          </div>

          {initialRecords === undefined && quarantineQuery.isPending ? (
            <LoadingState label="Đang tải danh sách hồ sơ Quarantine…" />
          ) : initialRecords === undefined && quarantineQuery.isError ? (
            <ErrorState
              message={getApiErrorMessage(
                quarantineQuery.error,
                'Không tải được danh sách hồ sơ Quarantine.'
              )}
            />
          ) : records.length === 0 ? (
            <EmptyState title="Không có hồ sơ Quarantine nào" />
          ) : (
            <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
              {records.map((rec) => {
                const checked = selectedRecordIds.includes(rec.record_id)
                return (
                  <label
                    key={rec.record_id}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                      checked ? 'bg-[#fff3f5]/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecord(rec.record_id)}
                      className="size-4 accent-[#b91830]"
                    />
                    <span className="font-mono font-semibold text-slate-900">
                      Dòng {rec.record_position}
                    </span>
                    <span className="text-slate-600">
                      Lần nạp #{rec.ingestion_job_id} · DS #{rec.dataset_id} ·{' '}
                      {domainLabel(rec.domain)} · {rec.entity}
                    </span>
                    <span className="ml-auto flex gap-1">
                      {rec.error_codes.map((c) => (
                        <Tag key={c} tone="rose">
                          {c}
                        </Tag>
                      ))}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          {!recordsCompatible && (
            <p role="alert" className="text-rose-600">
              Các hồ sơ đã chọn không cùng lượt làm sạch, bộ dữ liệu hoặc loại dữ liệu. Vui lòng chỉ
              chọn các hồ sơ cùng nhóm.
            </p>
          )}
        </div>

        <fieldset className="space-y-2" disabled={createMutation.isPending}>
          <legend className="mb-2 font-semibold">Cách giao xử lý</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="return-mode"
              checked={returnToUploader}
              onChange={() => {
                setReturnToUploader(true)
                setFormError(null)
                createMutation.reset()
              }}
            />
            Trả về người nạp file
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="return-mode"
              checked={!returnToUploader}
              onChange={() => {
                setReturnToUploader(false)
                setFormError(null)
                createMutation.reset()
              }}
            />
            Chọn phòng ban và người phụ trách
          </label>
        </fieldset>
        {returnToUploader && selectedRecordIds.length > 0 && recordsCompatible && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            {returnPreview.isPending || returnPreview.isFetching ? (
              <LoadingState label="Đang xác định người nạp file…" />
            ) : returnPreview.isError ? (
              <ErrorState
                message={getApiErrorMessage(
                  returnPreview.error,
                  'Không xác định được người nạp file.'
                )}
                retrying={returnPreview.isFetching}
                onRetry={() => void returnPreview.refetch()}
              />
            ) : (
              returnPreview.data && (
                <div className="space-y-2" role="status">
                  <p>
                    <strong>Người nhận:</strong> {returnPreview.data.assignee.full_name} (@
                    {returnPreview.data.assignee.username})
                  </p>
                  <p>
                    <strong>Phòng phụ trách:</strong>{' '}
                    {returnPreview.data.department.department_name}
                  </p>
                  <p>
                    <strong>File cần sửa:</strong> {returnPreview.data.source_table}
                  </p>
                  <p className="text-slate-600">{returnPreview.data.note}</p>
                  {returnPreview.data.existing_issue_id && (
                    <p className="text-amber-800">
                      Hồ sơ đã có yêu cầu. Khi duyệt, hệ thống cập nhật người nhận và giữ lịch sử
                      của yêu cầu đó.
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {!returnToUploader && (
            <div className="contents">
              <div className="space-y-1">
                <label htmlFor="qi-dept" className="block font-semibold text-slate-700">
                  2. Phòng ban phụ trách *
                </label>
                <select
                  id="qi-dept"
                  className={inputClass}
                  value={effectiveDepartmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value)
                    setAssigneeUserId('')
                  }}
                >
                  <option value="">Chọn phòng ban</option>
                  {(departmentsQuery.data ?? [])
                    .filter(
                      (department) =>
                        firstRecord?.owner_department_id == null ||
                        department.department_id === firstRecord.owner_department_id
                    )
                    .map((d) => (
                      <option key={d.department_id} value={String(d.department_id)}>
                        {d.department_name} ({d.department_code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="qi-assignee" className="block font-semibold text-slate-700">
                  3. Người phụ trách (tùy chọn)
                </label>
                <select
                  id="qi-assignee"
                  className={inputClass}
                  disabled={
                    !effectiveDepartmentId ||
                    !inferredDomain ||
                    assigneesQuery.isFetching ||
                    assigneesQuery.isError
                  }
                  value={assigneeUserId}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                >
                  <option value="">
                    {!effectiveDepartmentId || !inferredDomain
                      ? 'Chọn hồ sơ và phòng ban trước'
                      : assigneesQuery.isPending
                        ? 'Đang tải danh sách nhân viên…'
                        : 'Chưa giao ngay / Chọn người phụ trách'}
                  </option>
                  {(assigneesQuery.data ?? []).map((a) => (
                    <option key={a.user_id} value={String(a.user_id)}>
                      {a.full_name} (@{a.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="qi-title" className="block font-semibold text-slate-700">
              Tiêu đề yêu cầu *
            </label>
            <input
              id="qi-title"
              className={inputClass}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="vd. Bổ sung số CCCD thí sinh còn thiếu"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="qi-desc" className="block font-semibold text-slate-700">
              Mô tả chi tiết
            </label>
            <textarea
              id="qi-desc"
              rows={2}
              maxLength={4000}
              className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {!returnToUploader && departmentsQuery.isError && (
          <ErrorState
            message={getApiErrorMessage(
              departmentsQuery.error,
              'Không tải được danh sách phòng ban.'
            )}
            retrying={departmentsQuery.isFetching}
            onRetry={() => void departmentsQuery.refetch()}
          />
        )}
        {!returnToUploader && assigneesQuery.isError && (
          <ErrorState
            message={getApiErrorMessage(assigneesQuery.error, 'Không tải được người phụ trách.')}
            retrying={assigneesQuery.isFetching}
            onRetry={() => void assigneesQuery.refetch()}
          />
        )}
        {!returnToUploader &&
          effectiveDepartmentId &&
          inferredDomain &&
          assigneesQuery.isSuccess &&
          assigneesQuery.data.length === 0 && (
            <p className="text-amber-800">
              Chưa có nhân viên đủ quyền và đang được phân công tại phòng này. Có thể tạo yêu cầu
              cho phòng ban trước, rồi giao người phụ trách ở trang Chất lượng dữ liệu.
            </p>
          )}
        {!returnToUploader && !assigneeUserId && (
          <p className="text-slate-600">
            Chọn người phụ trách để nhân viên có thể tải bản sửa và báo đã xử lý.
          </p>
        )}
        {(formError || createMutation.isError) && (
          <p
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-rose-700"
          >
            {formError ??
              getApiErrorMessage(createMutation.error, 'Không thể tạo yêu cầu xử lý dữ liệu lỗi.')}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Hủy
          </Button>
          <Button
            loading={createMutation.isPending}
            type="submit"
            variant="primary"
            disabled={
              createMutation.isPending ||
              (returnToUploader &&
                (!returnPreview.data || returnPreview.isFetching || returnPreview.isError))
            }
          >
            {createMutation.isPending
              ? 'Đang gửi…'
              : returnToUploader
                ? 'Duyệt gửi về người nạp'
                : 'Tạo yêu cầu'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
