'use client'

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, History } from 'lucide-react'

import { getApiErrorMessage } from '@/api/http'
import {
  API_ApproveProfile,
  API_ProfileRevisions,
  API_ReviewQueue,
  API_RevokeApproval,
} from '@/api/manager/reviews'
import type { ReviewProfile } from '@/api/manager/reviews'
import { PageHeader, EmptyState, ErrorState, LoadingState, formatDateTime } from '@/components/page/page-parts'
import { cn } from '@/lib/utils'

import { ManagerGate, label } from './report-parts'

export function ManagerApprovalsView() {
  return (
    <ManagerGate>
      {(context) => <ReviewList key={context.user_id} userId={context.user_id} />}
    </ManagerGate>
  )
}

function ReviewList({ userId }: { userId: number }) {
  const query = useQuery({
    queryKey: ['manager', 'reviews', userId],
    queryFn: API_ReviewQueue,
    refetchInterval: 15_000,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardCheck />}
        breadcrumb={['Quản lý đơn vị', 'Phê duyệt nguồn']}
        title="Phê duyệt quy tắc chuẩn hóa dữ liệu"
        description="Xem các quy tắc chuẩn hóa dữ liệu do Data Admin đề xuất, tra cứu lịch sử phiên bản và phê duyệt hoặc thu hồi trong phạm vi Domain Owner."
      />

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={getApiErrorMessage(query.error, 'Không thể tải cấu hình cần duyệt.')}
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.grants.length ? (
        <EmptyState
          title="Bạn chưa được cấp quyền phê duyệt nguồn"
          description="ADMIN cần cấp grant cho lĩnh vực tương ứng."
        />
      ) : !query.data.items.length ? (
        <EmptyState title="Chưa có cấu hình nguồn cần xem" />
      ) : (
        query.data.items.map((profile) => (
          <ReviewItem
            key={JSON.stringify([
              profile.profile_id,
              profile.revision,
              profile.status,
              profile.can_approve,
              profile.can_revoke,
            ])}
            profile={profile}
            grantId={
              query.data.grants.find((grant) => grant.domain === profile.definition.domain)!
                .grant_id
            }
          />
        ))
      )}
    </div>
  )
}

function ReviewItem({ profile, grantId }: { profile: ReviewProfile; grantId: string }) {
  const [evidence, setEvidence] = useState('')
  const [partial, setPartial] = useState('')
  const [showRevisions, setShowRevisions] = useState(false)
  const client = useQueryClient()

  const revisionsQuery = useQuery({
    queryKey: ['manager', 'reviews', 'revisions', profile.profile_id],
    queryFn: () => API_ProfileRevisions(profile.profile_id),
    enabled: showRevisions,
  })

  const mutation = useMutation({
    mutationFn: (action: 'approve' | 'revoke') =>
      action === 'approve'
        ? API_ApproveProfile(profile.profile_id, {
            expected_revision: profile.revision,
            expected_fingerprint: profile.fingerprint,
            grant_id: grantId,
            evidence: evidence.trim(),
            allow_partial_publication: partial === 'yes',
          })
        : API_RevokeApproval(profile.profile_id, profile.revision, evidence.trim()),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['manager', 'reviews'] })
    },
  })

  const definition = profile.definition
  const isApproved = profile.status === 'APPROVED'
  const isRevoked = profile.status === 'REVOKED'

  const dataSourceName =
    definition.domain === 'academic'
      ? 'Danh sách học phần Academic'
      : definition.domain === 'hr'
        ? 'Danh sách nhân sự & vị trí PNS'
        : 'Danh sách hồ sơ tuyển sinh PTS'

  const profileDisplay = profile.profile_id

  const changesDescription =
    Object.keys(definition.field_mapping).length > 0
      ? `Chuẩn hóa ${Object.keys(definition.field_mapping).join(', ')} và trạng thái`
      : 'Chuẩn hóa mã học phần, tín chỉ và trạng thái'

  const excludedDataRule = definition.collapse_exact_duplicates
    ? 'Bản ghi thiếu mã môn, mã trùng hoặc tín chỉ sai (gộp bản ghi trùng hoàn toàn)'
    : 'Bản ghi thiếu mã môn, mã trùng hoặc tín chỉ sai'

  return (
    <div className="shadow-xs space-y-6 rounded-xl border border-slate-200/90 bg-white p-6">
      {/* Header status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{profile.profile_id}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {label(definition.domain)} · {label(definition.entity)} · Phiên bản {profile.revision}
          </p>
        </div>

        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            isApproved
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : isRevoked
                ? 'border border-rose-200 bg-rose-50 text-rose-700'
                : 'border border-amber-200 bg-amber-50 text-amber-700'
          )}
        >
          {isApproved ? 'Đã phê duyệt' : isRevoked ? 'Đã thu hồi' : 'Chờ phê duyệt'}
        </span>
      </div>

      {/* Structured Business View (Image 5 in Light Theme) */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th className="w-1/3 px-4 py-3 font-semibold">Nội dung</th>
              <th className="w-2/3 px-4 py-3 font-semibold">Hiển thị cho Manager</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-500">Nguồn dữ liệu</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{dataSourceName}</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-500">Profile</td>
              <td className="px-4 py-3">
                <code className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800">
                  {profileDisplay}
                </code>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-500">Người đề xuất</td>
              <td className="px-4 py-3 font-semibold text-slate-900">DATA_ADMIN</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-500">Những gì thay đổi</td>
              <td className="px-4 py-3">{changesDescription}</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-500">Dữ liệu có thể bị loại</td>
              <td className="px-4 py-3 font-medium text-amber-700">{excludedDataRule}</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-500">Bằng chứng</td>
              <td className="px-4 py-3 text-slate-800">
                {evidence || 'Kết quả preview/test nếu có'}
              </td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="px-4 py-3 font-medium text-slate-500">Quyết định</td>
              <td className="px-4 py-3 font-semibold text-slate-900">
                Phê duyệt hoặc yêu cầu chỉnh sửa
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Technical details & revision history toggles */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRevisions((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <History className="size-3.5 text-primary" aria-hidden="true" />
            <span>{showRevisions ? 'Ẩn lịch sử phiên bản' : 'Xem lịch sử phiên bản'}</span>
          </button>
        </div>

        {showRevisions && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs">
            <h3 className="mb-2.5 font-semibold text-slate-800">
              Lịch sử phiên bản quy tắc ({profile.profile_id})
            </h3>
            {revisionsQuery.isPending ? (
              <LoadingState label="Đang tải lịch sử phiên bản…" />
            ) : revisionsQuery.isError ? (
              <ErrorState
                message={getApiErrorMessage(
                  revisionsQuery.error,
                  'Không thể tải lịch sử phiên bản quy tắc.'
                )}
                onRetry={() => void revisionsQuery.refetch()}
              />
            ) : !revisionsQuery.data?.length ? (
              <p className="text-slate-500">Chưa có lịch sử phiên bản nào được ghi nhận.</p>
            ) : (
              <div className="space-y-2">
                {revisionsQuery.data.map((rev, idx) => (
                  <div
                    key={`${rev.revision}-${idx}`}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-slate-900">
                        Phiên bản {rev.revision}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          rev.status === 'APPROVED'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : rev.status === 'REVOKED'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700'
                              : 'border border-amber-200 bg-amber-50 text-amber-700'
                        )}
                      >
                        {label(rev.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {rev.revoked_by != null
                        ? `Người thu hồi: #${rev.revoked_by}`
                        : rev.approved_by != null
                          ? `Người duyệt: #${rev.approved_by}`
                          : rev.actor_id != null
                            ? `Người thực hiện: #${rev.actor_id}`
                            : 'Hệ thống'}
                      {' · '}
                      {formatDateTime(rev.revoked_at ?? rev.approved_at ?? rev.created_at ?? null)}
                    </p>
                    {rev.approved_by != null && rev.revoked_by != null && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Đã duyệt bởi #{rev.approved_by} · {formatDateTime(rev.approved_at)}
                      </p>
                    )}
                    {(rev.evidence || rev.note) && (
                      <p className="mt-1.5 rounded bg-slate-50 p-2 text-slate-700">
                        {rev.evidence || rev.note}
                      </p>
                    )}
                    {(rev.revocation_reason || rev.reason) && (
                      <p className="mt-1.5 rounded bg-rose-50 p-2 text-rose-700">
                        Lý do thu hồi: {rev.revocation_reason || rev.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <details className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">
            Xem chi tiết mapping và quy tắc kỹ thuật
          </summary>
          <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700">
            {JSON.stringify(definition, null, 2)}
          </pre>
        </details>
      </div>

      {/* Decision form */}
      {(profile.can_approve || profile.can_revoke) && (
        <form
          className="space-y-4 border-t border-slate-100 pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate(profile.can_approve ? 'approve' : 'revoke')
          }}
        >
          <div>
            <label
              htmlFor="evidence-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              {profile.can_approve ? 'Căn cứ phê duyệt nghiệp vụ' : 'Lý do thu hồi phê duyệt'}
            </label>
            <textarea
              id="evidence-input"
              required
              minLength={10}
              maxLength={2000}
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="Nhập căn cứ nghiệp vụ (tối thiểu 10 ký tự)..."
              className="shadow-xs mt-1.5 min-h-20 w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {profile.can_approve && (
            <div>
              <label
                htmlFor="partial-select"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Khi có bản ghi lỗi, có cho phép công bố phần dữ liệu hợp lệ?
              </label>
              <select
                id="partial-select"
                required
                value={partial}
                onChange={(event) => setPartial(event.target.value)}
                className="shadow-xs mt-1.5 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Chọn quyết định</option>
                <option value="no">Không cho phép</option>
                <option value="yes">Cho phép</option>
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={
                mutation.isPending ||
                evidence.trim().length < 10 ||
                (profile.can_approve && !partial)
              }
              className="shadow-xs rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending
                ? 'Đang gửi…'
                : profile.can_approve
                  ? `Phê duyệt phiên bản ${profile.revision}`
                  : 'Thu hồi phê duyệt'}
            </button>

            {profile.can_approve && (
              <button
                type="button"
                onClick={() => {
                  if (evidence.trim().length >= 10) {
                    mutation.mutate('revoke')
                  }
                }}
                className="shadow-xs rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Yêu cầu chỉnh sửa
              </button>
            )}
          </div>
        </form>
      )}

      {mutation.isError && (
        <ErrorState
          message={getApiErrorMessage(
            mutation.error,
            'Không thể lưu quyết định. Tải lại để kiểm tra phiên bản và quyền phê duyệt.'
          )}
        />
      )}
    </div>
  )
}
