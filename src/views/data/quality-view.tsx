'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Plus,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { API_ListCleaningRuns } from '@/api/admindata/cleaning'
import {
  API_AssignQualityIssue,
  API_ListIssueAssignees,
  API_ListIssueDepartments,
  API_VerifyQualityIssue,
} from '@/api/admindata/quality-issues'
import { getApiErrorMessage } from '@/api/http'
import { API_GetIngestionJob } from '@/api/shared/ingestion'
import {
  API_GetQualityIssue,
  API_ListQualityIssues,
  API_GetQualityIssueStats,
} from '@/api/shared/quality-issues'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  LoadingState,
  PageHeader,
  Tag,
  formatDateTime,
  formatNumber,
  statusLabel,
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
import { TableSkeleton } from '@/components/ui/table-skeleton'

import { CreateIssuePanel } from './create-quality-issue-panel'
import { domainLabel } from './data-helpers'

const PAGE_SIZE = 20

const inputClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91830]/30'

function IssueDetailPanel({ issueId }: { issueId: string }) {
  const queryClient = useQueryClient()
  const [assigneeId, setAssigneeId] = useState('')
  const [selectedRunId, setSelectedRunId] = useState('')
  const [verifiedChoice, setVerifiedChoice] = useState<boolean>(true)
  const [confirmedRecordIds, setConfirmedRecordIds] = useState<string[]>([])
  const [verifyNote, setVerifyNote] = useState('')
  const [confirmVerifyOpen, setConfirmVerifyOpen] = useState(false)
  const [verifyFormError, setVerifyFormError] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['quality-issues', 'detail', issueId],
    queryFn: () => API_GetQualityIssue(issueId),
  })

  const issue = detailQuery.data

  const assigneesQuery = useQuery({
    queryKey: ['quality-issues', 'assignees', issue?.department_id, issue?.domain],
    queryFn: () =>
      API_ListIssueAssignees({
        department_id: issue!.department_id,
        domain: issue!.domain as 'hr' | 'academic' | 'admissions',
        limit: 100,
        offset: 0,
      }),
    enabled: Boolean(issue && issue.status === 'ASSIGNED'),
  })

  const resolutionJobQuery = useQuery({
    queryKey: ['ingestion-jobs', issue?.resolution_job_id],
    queryFn: () => API_GetIngestionJob(issue!.resolution_job_id!),
    enabled: Boolean(issue?.resolution_job_id),
  })

  const cleaningRunsQuery = useQuery({
    queryKey: ['cleaning-runs', 'for-verification', issue?.resolution_job_id, issue?.dataset_id],
    queryFn: () =>
      API_ListCleaningRuns({
        ingestion_job_id: issue!.resolution_job_id!,
        dataset_id: issue!.dataset_id,
        limit: 20,
        offset: 0,
      }),
    enabled: Boolean(issue && issue.status === 'PENDING_VERIFICATION' && issue.resolution_job_id),
  })

  useEffect(() => {
    if (issue) {
      setAssigneeId(issue.assignee_user_id ? String(issue.assignee_user_id) : '')
      setConfirmedRecordIds([])
      setSelectedRunId('')
      setVerifyNote('')
      setVerifyFormError(null)
    }
  }, [issue])

  const assignMutation = useMutation({
    mutationFn: (nextAssigneeId: number) =>
      API_AssignQualityIssue(issueId, { assignee_user_id: nextAssigneeId }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(['quality-issues', 'detail', issueId], updated)
      await queryClient.invalidateQueries({ queryKey: ['quality-issues'] })
      toast.success('Đã cập nhật người phụ trách.')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      API_VerifyQualityIssue(issueId, {
        cleaning_run_id: selectedRunId,
        verified: verifiedChoice,
        note: verifyNote.trim(),
        confirmed_record_ids: verifiedChoice ? confirmedRecordIds : [],
      }),
    onSuccess: async (updated) => {
      setConfirmVerifyOpen(false)
      queryClient.setQueryData(['quality-issues', 'detail', issueId], updated)
      await queryClient.invalidateQueries({ queryKey: ['quality-issues'] })
      toast.success(
        updated.status === 'VERIFIED'
          ? 'Đã xác minh yêu cầu hoàn tất (VERIFIED).'
          : 'Đã từ chối xác minh và trả yêu cầu về trạng thái Cần xử lý.'
      )
    },
    onError: () => {
      setConfirmVerifyOpen(false)
    },
  })

  if (detailQuery.isPending) return <LoadingState />
  if (detailQuery.isError || !issue) {
    return (
      <ErrorState
        message={getApiErrorMessage(detailQuery.error, 'Không tải được chi tiết yêu cầu.')}
        retrying={detailQuery.isFetching}
        onRetry={() => void detailQuery.refetch()}
      />
    )
  }

  const runs = cleaningRunsQuery.data ?? []
  const selectedRun = runs.find((r) => r.run_id === selectedRunId)

  function openVerifyConfirmation(event: FormEvent) {
    event.preventDefault()
    setVerifyFormError(null)
    if (!selectedRunId) {
      setVerifyFormError('Vui lòng chọn lượt Cleaning Run của job sửa lỗi.')
      return
    }
    if (!verifyNote.trim()) {
      setVerifyFormError('Vui lòng nhập ghi chú xác minh hoặc lý do từ chối.')
      return
    }
    if (
      verifiedChoice &&
      issue &&
      confirmedRecordIds.length !== issue.quarantine_record_ids.length
    ) {
      setVerifyFormError('Khi xác minh đạt, cần xác nhận đủ toàn bộ hồ sơ lỗi liên quan.')
      return
    }
    setConfirmVerifyOpen(true)
  }

  return (
    <div className="space-y-4 text-xs">
      <dl className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div>
          <dt className="text-slate-500">Trạng thái</dt>
          <dd className="mt-0.5">
            <Tag tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Tag>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Bộ dữ liệu / Lĩnh vực</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            Dataset #{issue.dataset_id} · {domainLabel(issue.domain)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Đơn vị / Phụ trách</dt>
          <dd className="mt-0.5 font-mono text-slate-900">
            Dept #{issue.department_id} ·{' '}
            {issue.assignee_user_id ? `User #${issue.assignee_user_id}` : 'Chưa giao'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Job sửa / Verification Run</dt>
          <dd className="mt-0.5 font-mono text-slate-900">
            {issue.resolution_job_id ? `#${issue.resolution_job_id}` : '—'} ·{' '}
            {issue.verification_run_id ? `${issue.verification_run_id.slice(0, 8)}…` : '—'}
          </dd>
        </div>
      </dl>

      {/* Phân công / Giao lại khi ASSIGNED */}
      {issue.status === 'ASSIGNED' && (
        <div className="space-y-2 rounded-md border border-slate-200 p-3">
          <p className="font-semibold text-slate-900">Giao / Đổi người phụ trách</p>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Chọn người phụ trách"
              className={`${inputClass} flex-1`}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Chọn nhân viên đủ điều kiện</option>
              {(assigneesQuery.data ?? []).map((a) => (
                <option key={a.user_id} value={String(a.user_id)}>
                  {a.full_name} (@{a.username})
                </option>
              ))}
            </select>
            <Button
              loading={assignMutation.isPending}
              variant="outline"
              disabled={!assigneeId || assignMutation.isPending}
              onClick={() => assignMutation.mutate(Number(assigneeId))}
              icon={<UserCheck className="size-3.5" aria-hidden="true" />}
            >
              {assignMutation.isPending ? 'Đang lưu…' : 'Cập nhật phụ trách'}
            </Button>
          </div>
          {assignMutation.isError && (
            <p role="alert" className="text-rose-600">
              {getApiErrorMessage(assignMutation.error, 'Không cập nhật được người phụ trách.')}
            </p>
          )}
        </div>
      )}

      {/* Xác minh khi PENDING_VERIFICATION */}
      {issue.status === 'PENDING_VERIFICATION' && (
        <div className="space-y-3 rounded-md border border-sky-200 bg-sky-50/50 p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Quy trình Xác minh bản sửa</p>
            {issue.resolution_job_id && (
              <Link
                href={`/data/cleaning?jobId=${issue.resolution_job_id}`}
                className="font-semibold text-[#b91830] hover:underline"
              >
                Chạy Cleaning cho Job #{issue.resolution_job_id}
              </Link>
            )}
          </div>

          {resolutionJobQuery.data && (
            <div className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2">
              <span>Job sửa #{resolutionJobQuery.data.ingestion_job_id}:</span>
              <Tag tone={statusTone(resolutionJobQuery.data.status)}>
                {statusLabel(resolutionJobQuery.data.status)}
              </Tag>
              <span className="font-mono text-slate-600">
                {resolutionJobQuery.data.source_table ?? '—'}
              </span>
            </div>
          )}

          <form className="space-y-3" onSubmit={openVerifyConfirmation} noValidate>
            <div className="space-y-1">
              <label htmlFor="verify-run-select" className="block font-semibold text-slate-700">
                Chọn Cleaning Run của Job sửa *
              </label>
              <select
                id="verify-run-select"
                className={inputClass}
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
              >
                <option value="">
                  {cleaningRunsQuery.isPending
                    ? 'Đang tải lượt Cleaning…'
                    : runs.length === 0
                      ? 'Chưa có lượt Cleaning nào cho Job này'
                      : 'Chọn lượt Cleaning Run'}
                </option>
                {runs.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {run.run_id.slice(0, 8)}… · {run.cleaning_status} · {run.publication_status} (
                    {run.records_passed ?? 0} đạt / {run.records_quarantined ?? 0} cách ly)
                  </option>
                ))}
              </select>
            </div>

            {selectedRun && (
              <div className="flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-2">
                <Tag tone={statusTone(selectedRun.cleaning_status)}>
                  Cleaning: {selectedRun.cleaning_status}
                </Tag>
                <Tag tone={statusTone(selectedRun.publication_status)}>
                  Silver: {selectedRun.publication_status}
                </Tag>
                <span className="font-mono text-slate-700">
                  Đạt {formatNumber(selectedRun.records_passed)} · Cách ly{' '}
                  {formatNumber(selectedRun.records_quarantined)}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-1.5 font-medium text-emerald-800">
                <input
                  type="radio"
                  name="verify-decision"
                  checked={verifiedChoice}
                  onChange={() => setVerifiedChoice(true)}
                  className="accent-emerald-600"
                />
                Xác minh đạt (VERIFIED)
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 font-medium text-rose-800">
                <input
                  type="radio"
                  name="verify-decision"
                  checked={!verifiedChoice}
                  onChange={() => setVerifiedChoice(false)}
                  className="accent-rose-600"
                />
                Từ chối, trả về ASSIGNED
              </label>
            </div>

            {verifiedChoice && (
              <div className="space-y-1.5 rounded border border-slate-200 bg-white p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    Xác nhận đủ hồ sơ đã khắc phục ({confirmedRecordIds.length}/
                    {issue.quarantine_record_ids.length})
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmedRecordIds([...issue.quarantine_record_ids])}
                  >
                    Chọn tất cả
                  </Button>
                </div>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {issue.quarantine_records.map((rec) => (
                    <label key={rec.record_id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={confirmedRecordIds.includes(rec.record_id)}
                        onChange={() =>
                          setConfirmedRecordIds((prev) =>
                            prev.includes(rec.record_id)
                              ? prev.filter((id) => id !== rec.record_id)
                              : [...prev, rec.record_id]
                          )
                        }
                        className="size-3.5 accent-[#b91830]"
                      />
                      <span className="font-mono">Dòng {rec.record_position}</span>
                      <span className="text-slate-500">({rec.error_codes.join(', ')})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="verify-note" className="block font-semibold text-slate-700">
                Ghi chú xác minh *
              </label>
              <textarea
                id="verify-note"
                rows={2}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder={
                  verifiedChoice
                    ? 'Đã kiểm tra lượt Cleaning và xuất bản Silver đạt yêu cầu.'
                    : 'Nêu rõ lý do chưa đạt để nhân viên chỉnh sửa lại.'
                }
              />
            </div>

            {(verifyFormError || verifyMutation.isError) && (
              <p role="alert" className="text-rose-700">
                {verifyFormError ??
                  getApiErrorMessage(verifyMutation.error, 'Không thể gửi kết quả xác minh.')}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={verifyMutation.isPending}
                icon={
                  verifiedChoice ? (
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="size-3.5" aria-hidden="true" />
                  )
                }
              >
                {verifiedChoice ? 'Xác nhận VERIFIED' : 'Từ chối xác minh'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Hồ sơ lỗi & Lịch sử */}
      <div className="space-y-1.5">
        <p className="font-semibold text-slate-800">
          Hồ sơ liên quan ({issue.quarantine_records.length})
        </p>
        <ul className="space-y-1">
          {issue.quarantine_records.map((rec) => (
            <li
              key={rec.record_id}
              className="flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5"
            >
              <span className="font-mono">
                Dòng {rec.record_position} · {rec.source_table ?? '—'}
              </span>
              <span className="flex gap-1">
                {rec.error_codes.map((c) => (
                  <Tag key={c} tone="rose">
                    {c}
                  </Tag>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="font-semibold text-slate-800">Lịch sử thay đổi ({issue.history.length})</p>
        <ul className="space-y-1.5">
          {issue.history.map((ev) => (
            <li
              key={ev.event_id}
              className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{ev.event_type}</span>
                <span className="text-slate-500">{formatDateTime(ev.created_at)}</span>
              </div>
              <p className="text-slate-600">
                {ev.from_status ? `${statusLabel(ev.from_status)} → ` : ''}
                {statusLabel(ev.to_status)}
                {typeof ev.details.note === 'string' ? ` · ${ev.details.note}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={confirmVerifyOpen} onOpenChange={setConfirmVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifiedChoice ? 'Xác nhận hoàn tất (VERIFIED)' : 'Xác nhận từ chối xác minh'}
            </DialogTitle>
            <DialogDescription>
              {verifiedChoice
                ? 'Yêu cầu sẽ chuyển sang trạng thái Đã xác minh (VERIFIED) dựa trên lượt Cleaning Run đã chọn.'
                : 'Yêu cầu sẽ quay về trạng thái Cần xử lý (ASSIGNED) để nhân viên tải bản sửa mới.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={verifyMutation.isPending}
              onClick={() => setConfirmVerifyOpen(false)}
            >
              Hủy
            </Button>
            <Button
              loading={verifyMutation.isPending}
              variant="primary"
              onClick={() => verifyMutation.mutate()}
            >
              {verifyMutation.isPending ? 'Đang gửi…' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function QualityView() {
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const departmentsQuery = useQuery({
    queryKey: ['quality-issues', 'departments'],
    queryFn: API_ListIssueDepartments,
  })

  const parsedDept = departmentFilter ? Number(departmentFilter) : undefined
  const parsedAssignee = assigneeFilter ? Number(assigneeFilter) : undefined

  const filterParams = {
    status: (statusFilter as 'ASSIGNED' | 'PENDING_VERIFICATION' | 'VERIFIED') || undefined,
    department_id: parsedDept,
    assignee_user_id:
      parsedAssignee && Number.isInteger(parsedAssignee) && parsedAssignee > 0
        ? parsedAssignee
        : undefined,
  }

  const statsQuery = useQuery({
    queryKey: ['quality-issues', 'stats', filterParams],
    queryFn: () => API_GetQualityIssueStats(filterParams),
  })

  const listQuery = useQuery({
    queryKey: ['quality-issues', 'list', { ...filterParams, limit: PAGE_SIZE, offset }],
    queryFn: () =>
      API_ListQualityIssues({
        ...filterParams,
        limit: PAGE_SIZE,
        offset,
      }),
  })

  const deptMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const d of departmentsQuery.data ?? []) {
      m.set(d.department_id, d.department_name)
    }
    return m
  }, [departmentsQuery.data])

  const issues = listQuery.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Yêu cầu xử lý dữ liệu lỗi']}
        title="Quản lý yêu cầu xử lý dữ liệu lỗi"
        description="Tạo yêu cầu từ hồ sơ Quarantine, phân công phòng ban/nhân viên và xác minh kết quả sửa lỗi trước khi hoàn tất."
        actions={
          <>
            <Button
              onClick={() => {
                void listQuery.refetch()
                void statsQuery.refetch()
              }}
              reading={listQuery.isFetching}
              icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
              icon={<Plus className="size-3.5" aria-hidden="true" />}
            >
              Tạo yêu cầu xử lý
            </Button>
          </>
        }
      />

      {showCreate && (
        <CreateIssuePanel
          onClose={() => setShowCreate(false)}
          onCreated={(issue) => setSelectedIssueId(issue.issue_id)}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng yêu cầu"
          value={statsQuery.data ? formatNumber(statsQuery.data.total) : '—'}
        />
        <KpiCard
          label="Cần xử lý (ASSIGNED)"
          value={statsQuery.data ? formatNumber(statsQuery.data.assigned) : '—'}
          tone="amber"
        />
        <KpiCard
          label="Chờ xác minh"
          value={statsQuery.data ? formatNumber(statsQuery.data.pending_verification) : '—'}
          tone="sky"
        />
        <KpiCard
          label="Đã xác minh"
          value={statsQuery.data ? formatNumber(statsQuery.data.verified) : '—'}
          tone="emerald"
        />
      </div>

      {/* Bộ lọc */}
      <Card>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div className="space-y-1">
            <label htmlFor="admin-qi-status" className="block font-semibold text-slate-700">
              Trạng thái
            </label>
            <select
              id="admin-qi-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
            >
              <option value="">Tất cả</option>
              <option value="ASSIGNED">Cần xử lý (ASSIGNED)</option>
              <option value="PENDING_VERIFICATION">Chờ xác minh</option>
              <option value="VERIFIED">Đã xác minh</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-qi-dept" className="block font-semibold text-slate-700">
              Phòng ban
            </label>
            <select
              id="admin-qi-dept"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value)
                setOffset(0)
              }}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
            >
              <option value="">Tất cả phòng ban</option>
              {(departmentsQuery.data ?? []).map((d) => (
                <option key={d.department_id} value={String(d.department_id)}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="admin-qi-assignee" className="block font-semibold text-slate-700">
              Lọc mã người phụ trách
            </label>
            <input
              id="admin-qi-assignee"
              inputMode="numeric"
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value)
                setOffset(0)
              }}
              placeholder="ID người phụ trách"
              className="h-9 w-40 rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_460px]">
        <Card title="Danh sách yêu cầu xử lý" bodyClassName="p-0">
          {listQuery.isPending ? (
            <TableSkeleton columns={6} />
          ) : listQuery.isError ? (
            <div className="p-4">
              <ErrorState
                message={getApiErrorMessage(listQuery.error, 'Không tải được danh sách yêu cầu.')}
                retrying={listQuery.isFetching}
                onRetry={() => void listQuery.refetch()}
              />
            </div>
          ) : issues.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu xử lý nào"
              description="Tạo yêu cầu mới từ hồ sơ Quarantine để giao phòng ban xử lý."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[660px] text-left text-xs">
                  <thead className="bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['Yêu cầu', 'Đơn vị / Lĩnh vực', 'Phụ trách', 'Trạng thái', 'Cập nhật'].map(
                        (h) => (
                          <th key={h} scope="col" className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issues.map((issue) => {
                      const active = selectedIssueId === issue.issue_id
                      return (
                        <tr
                          key={issue.issue_id}
                          className={active ? 'bg-[#fff3f5]/60' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => setSelectedIssueId(issue.issue_id)}
                              className="text-left font-semibold text-[#b91830] hover:underline"
                            >
                              {issue.title}
                            </button>
                            <p className="font-mono text-[10px] text-slate-400">
                              Dataset #{issue.dataset_id}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {deptMap.get(issue.department_id) ?? `Dept #${issue.department_id}`} ·{' '}
                            {domainLabel(issue.domain)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-700">
                            {issue.assignee_user_id ? `#${issue.assignee_user_id}` : 'Chưa giao'}
                          </td>
                          <td className="px-3 py-2.5">
                            <Tag tone={statusTone(issue.status)}>{statusLabel(issue.status)}</Tag>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">
                            {formatDateTime(issue.updated_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                <span>Hiển thị {issues.length} yêu cầu</span>
                <div className="flex gap-1.5">
                  <Button
                    disabled={offset === 0}
                    onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                    icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                  >
                    Trước
                  </Button>
                  <Button
                    disabled={issues.length < PAGE_SIZE}
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

        <Card title="Chi tiết, Phân công & Xác minh">
          {!selectedIssueId ? (
            <EmptyState
              title="Chọn một yêu cầu để xem chi tiết"
              description="Xem hồ sơ lỗi, phân công lại nhân viên hoặc xác minh kết quả sửa lỗi từ STAFF."
            />
          ) : (
            <IssueDetailPanel issueId={selectedIssueId} />
          )}
        </Card>
      </div>
    </div>
  )
}
