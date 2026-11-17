'use client'

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getApiErrorMessage } from '@/api/http'
import { API_ReviewQueue, API_ApproveProfile, API_RevokeApproval } from '@/api/manager/reviews'
import type { ReviewProfile } from '@/api/manager/reviews'
import { EmptyState, ErrorState, LoadingState } from '@/components/page/page-parts'
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
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Quản lý đơn vị</span>
          <span>/</span>
          <span className="font-semibold text-slate-700">Phê duyệt nguồn</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Phê duyệt Source Profile
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Chỉ xuất hiện khi Manager được cấp quyền Domain Owner.
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Thay vì hiện JSON, SQL hoặc mapping kỹ thuật, UI nên trình bày:
        </p>
      </div>

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
  const client = useQueryClient()

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

      {/* Technical details toggle */}
      <details className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">
          Xem chi tiết mapping và quy tắc kỹ thuật
        </summary>
        <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700">
          {JSON.stringify(definition, null, 2)}
        </pre>
      </details>

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
