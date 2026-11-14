'use client'

import { useEffect, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronLeft, ChevronRight, Info, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { API_ListProfiles } from '@/api/admindata/profiles'
import {
  API_ActivateSnapshot,
  API_GetActiveSnapshot,
  API_GetSnapshot,
  API_GetSnapshotData,
  API_ListSnapshots,
} from '@/api/admindata/snapshots'
import { getApiErrorMessage } from '@/api/http'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
  formatNumber,
} from '@/components/page/page-parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { formatCellValue } from './data-helpers'

const SNAPSHOT_PAGE_SIZE = 20
const DATA_PAGE_SIZE = 20

function extractEntitiesFromManifest(
  manifest: Record<string, unknown> | null | undefined
): string[] {
  if (!manifest) return []
  if (manifest.tables && typeof manifest.tables === 'object' && !Array.isArray(manifest.tables)) {
    return Object.keys(manifest.tables)
  }
  if (
    manifest.entities &&
    typeof manifest.entities === 'object' &&
    !Array.isArray(manifest.entities)
  ) {
    return Object.keys(manifest.entities)
  }
  if (Array.isArray(manifest.entities)) {
    return manifest.entities.filter((x): x is string => typeof x === 'string')
  }
  return []
}

export function SilverView() {
  const queryClient = useQueryClient()
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [snapshotOffset, setSnapshotOffset] = useState(0)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState('')
  const [dataOffset, setDataOffset] = useState(0)
  const [confirmActivateId, setConfirmActivateId] = useState<string | null>(null)

  const profilesQuery = useQuery({
    queryKey: ['silver-profiles', { limit: 100, offset: 0 }],
    queryFn: () => API_ListProfiles({ limit: 100, offset: 0 }),
  })

  useEffect(() => {
    if (!selectedProfileId && profilesQuery.data && profilesQuery.data.length > 0) {
      setSelectedProfileId(profilesQuery.data[0]!.profile_id)
    }
  }, [profilesQuery.data, selectedProfileId])

  const selectedProfile = (profilesQuery.data ?? []).find((p) => p.profile_id === selectedProfileId)

  const activeQuery = useQuery({
    queryKey: ['silver-snapshots', 'active', selectedProfileId],
    queryFn: () => API_GetActiveSnapshot(selectedProfileId),
    enabled: Boolean(selectedProfileId),
  })

  const listQuery = useQuery({
    queryKey: [
      'silver-snapshots',
      'list',
      selectedProfileId,
      { limit: SNAPSHOT_PAGE_SIZE, offset: snapshotOffset },
    ],
    queryFn: () =>
      API_ListSnapshots({
        profile_id: selectedProfileId,
        limit: SNAPSHOT_PAGE_SIZE,
        offset: snapshotOffset,
      }),
    enabled: Boolean(selectedProfileId),
  })

  const detailQuery = useQuery({
    queryKey: ['silver-snapshots', 'detail', selectedProfileId, selectedSnapshotId],
    queryFn: () => API_GetSnapshot(selectedSnapshotId!, selectedProfileId),
    enabled: Boolean(selectedProfileId && selectedSnapshotId),
  })

  const manifestEntities = extractEntitiesFromManifest(detailQuery.data)
  const fallbackEntity = selectedProfile?.definition.entity ?? ''

  useEffect(() => {
    if (manifestEntities.length > 0 && !manifestEntities.includes(selectedEntity)) {
      setSelectedEntity(manifestEntities[0]!)
    } else if (!selectedEntity && fallbackEntity) {
      setSelectedEntity(fallbackEntity)
    }
  }, [fallbackEntity, manifestEntities, selectedEntity])

  const dataQuery = useQuery({
    queryKey: [
      'silver-snapshots',
      'data',
      selectedProfileId,
      selectedSnapshotId,
      selectedEntity,
      { limit: DATA_PAGE_SIZE, offset: dataOffset },
    ],
    queryFn: () =>
      API_GetSnapshotData({
        snapshotId: selectedSnapshotId!,
        profileId: selectedProfileId,
        entity: selectedEntity,
        limit: DATA_PAGE_SIZE,
        offset: dataOffset,
      }),
    enabled: Boolean(selectedProfileId && selectedSnapshotId && selectedEntity),
    retry: false,
  })

  const activateMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      // Lấy lại phiên bản hiện hành mới nhất trước khi gửi expected_current_snapshot
      const latestActive = await API_GetActiveSnapshot(selectedProfileId)
      return API_ActivateSnapshot(snapshotId, selectedProfileId, latestActive.snapshot_id)
    },
    onSuccess: async (res) => {
      setConfirmActivateId(null)
      await queryClient.invalidateQueries({ queryKey: ['silver-snapshots'] })
      toast.success(`Đã kích hoạt phiên bản Silver ${res.snapshot_id}.`)
    },
    onError: () => {
      setConfirmActivateId(null)
    },
  })

  const snapshots = listQuery.data?.items ?? []
  const activeSnapshotId =
    activeQuery.data?.snapshot_id ?? listQuery.data?.active_snapshot_id ?? null
  const previewRows = dataQuery.data?.items ?? []
  const previewColumns = Array.from(new Set(previewRows.flatMap((row) => Object.keys(row))))

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Phiên bản Silver (Snapshots)']}
        title="Quản lý phiên bản Silver (Snapshots)"
        description="Theo dõi lịch sử các phiên bản Silver đã xuất bản theo Silver Profile, xem trước dữ liệu bảng và chuyển đổi phiên bản đang hoạt động."
        actions={
          <Button
            onClick={() => {
              void activeQuery.refetch()
              void listQuery.refetch()
            }}
            disabled={!selectedProfileId || listQuery.isFetching}
            icon={
              <RefreshCw
                className={`size-3.5 ${listQuery.isFetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            }
          >
            Làm mới
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <Info className="mt-0.5 size-4 shrink-0 text-[#b91830]" aria-hidden="true" />
        <p>
          <strong>Mô hình phiên bản Silver:</strong> Mỗi lần công bố Silver tạo một snapshot hoàn
          chỉnh cho toàn bộ thực thể/bảng (entity/table) thuộc phạm vi của profile, không cập nhật
          từng dòng rời rạc.
        </p>
      </div>

      {/* Chọn Profile */}
      <Card>
        <div className="flex flex-wrap items-end gap-4 text-xs">
          <div className="min-w-[260px] flex-1 space-y-1">
            <label htmlFor="silver-profile-select" className="block font-semibold text-slate-700">
              Chọn Silver Profile *
            </label>
            <select
              id="silver-profile-select"
              value={selectedProfileId}
              onChange={(e) => {
                setSelectedProfileId(e.target.value)
                setSelectedSnapshotId(null)
                setSnapshotOffset(0)
                setDataOffset(0)
              }}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">
                {profilesQuery.isPending ? 'Đang tải danh sách profile…' : 'Chọn profile'}
              </option>
              {(profilesQuery.data ?? []).map((prof) => (
                <option key={prof.profile_id} value={prof.profile_id}>
                  {prof.profile_id} (scope: {prof.definition.scope} · entity:{' '}
                  {prof.definition.entity})
                </option>
              ))}
            </select>
          </div>

          {activeQuery.data && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-[11px] text-emerald-700">
                Phiên bản đang hoạt động (Active):
              </span>
              <p className="font-mono text-xs font-semibold text-emerald-900">
                {activeSnapshotId ?? 'Chưa kích hoạt snapshot nào'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {activateMutation.isError && (
        <ErrorState
          message={getApiErrorMessage(
            activateMutation.error,
            'Không thể kích hoạt phiên bản Silver.'
          )}
        />
      )}

      {!selectedProfileId ? (
        <Card>
          <EmptyState title="Vui lòng chọn Silver Profile để xem các phiên bản Silver" />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          {/* Danh sách Snapshots */}
          <Card
            title="Danh sách Snapshots"
            subtitle={listQuery.data ? `Scope: ${listQuery.data.scope}` : undefined}
            bodyClassName="p-0"
          >
            {listQuery.isPending ? (
              <LoadingState />
            ) : listQuery.isError ? (
              <div className="p-4">
                <ErrorState
                  message={getApiErrorMessage(
                    listQuery.error,
                    'Không tải được danh sách snapshot.'
                  )}
                  onRetry={() => void listQuery.refetch()}
                />
              </div>
            ) : snapshots.length === 0 ? (
              <EmptyState title="Chưa có Silver Snapshot nào cho profile này" />
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {snapshots.map((snap) => {
                    const isActive = snap.snapshot_id === activeSnapshotId
                    const isSelected = snap.snapshot_id === selectedSnapshotId
                    return (
                      <li
                        key={snap.snapshot_id}
                        className={`flex items-center justify-between gap-2 px-4 py-3 text-xs ${
                          isSelected ? 'bg-[#fff3f5]/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSnapshotId(snap.snapshot_id)
                            setDataOffset(0)
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate font-mono font-semibold text-[#a9162e] hover:underline">
                            {snap.snapshot_id}
                          </p>
                          <p className="truncate font-mono text-[10px] text-slate-400">
                            {snap.scope}
                          </p>
                        </button>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {isActive ? (
                            <Tag tone="emerald">Đang hoạt động</Tag>
                          ) : (
                            <Button
                              variant="outline"
                              disabled={activateMutation.isPending}
                              onClick={() => setConfirmActivateId(snap.snapshot_id)}
                            >
                              Kích hoạt
                            </Button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
                  <span>{snapshots.length} snapshot</span>
                  <div className="flex gap-1">
                    <Button
                      disabled={snapshotOffset === 0}
                      onClick={() => setSnapshotOffset((p) => Math.max(0, p - SNAPSHOT_PAGE_SIZE))}
                      icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                    >
                      Trước
                    </Button>
                    <Button
                      disabled={snapshots.length < SNAPSHOT_PAGE_SIZE}
                      onClick={() => setSnapshotOffset((p) => p + SNAPSHOT_PAGE_SIZE)}
                      icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Chi tiết Manifest & Xem trước dữ liệu */}
          <div className="space-y-4">
            <Card
              title={
                selectedSnapshotId
                  ? `Chi tiết Snapshot ${selectedSnapshotId}`
                  : 'Chi tiết và Dữ liệu Snapshot'
              }
              right={
                selectedSnapshotId &&
                selectedSnapshotId === activeSnapshotId && (
                  <Tag tone="emerald">
                    <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                    Active Snapshot
                  </Tag>
                )
              }
            >
              {!selectedSnapshotId ? (
                <EmptyState
                  title="Chọn một Snapshot bên trái để xem manifest và dữ liệu"
                  description="Bạn có thể xem nguồn gốc, danh sách bảng (entities) và dữ liệu từng trang."
                />
              ) : detailQuery.isPending ? (
                <LoadingState />
              ) : detailQuery.isError ? (
                <ErrorState
                  message={getApiErrorMessage(
                    detailQuery.error,
                    'Không tải được manifest snapshot.'
                  )}
                  onRetry={() => void detailQuery.refetch()}
                />
              ) : (
                <div className="space-y-4 text-xs">
                  <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer font-semibold text-slate-800">
                      Xem Manifest &amp; Nguồn gốc phiên bản
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-white p-2 font-mono text-[11px] text-slate-800">
                      {JSON.stringify(detailQuery.data, null, 2)}
                    </pre>
                  </details>

                  {/* Chọn entity & xem dữ liệu */}
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="silver-entity-input"
                        className="block font-semibold text-slate-700"
                      >
                        Bảng dữ liệu (Entity)
                      </label>
                      {manifestEntities.length > 0 ? (
                        <select
                          id="silver-entity-input"
                          className="h-8 rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs"
                          value={selectedEntity}
                          onChange={(e) => {
                            setSelectedEntity(e.target.value)
                            setDataOffset(0)
                          }}
                        >
                          {manifestEntities.map((ent) => (
                            <option key={ent} value={ent}>
                              {ent}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id="silver-entity-input"
                          className="h-8 rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs"
                          value={selectedEntity}
                          onChange={(e) => {
                            setSelectedEntity(e.target.value)
                            setDataOffset(0)
                          }}
                          placeholder="vd. employee"
                        />
                      )}
                    </div>

                    {dataQuery.data && (
                      <span className="font-mono text-slate-500">
                        Tổng {formatNumber(dataQuery.data.total)} bản ghi
                      </span>
                    )}
                  </div>

                  {dataQuery.isPending ? (
                    <LoadingState label="Đang tải dữ liệu bảng Silver…" />
                  ) : dataQuery.isError ? (
                    <ErrorState
                      message={getApiErrorMessage(
                        dataQuery.error,
                        'Không tải được dữ liệu bảng trong snapshot này.'
                      )}
                      onRetry={() => void dataQuery.refetch()}
                    />
                  ) : previewRows.length === 0 ? (
                    <EmptyState title="Bảng không có dữ liệu" />
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-md border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500">
                            <tr>
                              {previewColumns.map((col) => (
                                <th key={col} scope="col" className="px-3 py-2 font-medium">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewRows.map((row, idx) => (
                              <tr key={idx}>
                                {previewColumns.map((col) => (
                                  <td
                                    key={col}
                                    className="max-w-[200px] truncate px-3 py-2 font-mono text-slate-700"
                                  >
                                    {formatCellValue(row[col])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Hiển thị {dataOffset + 1}–{dataOffset + previewRows.length} /{' '}
                          {formatNumber(dataQuery.data?.total)}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            disabled={dataOffset === 0}
                            onClick={() => setDataOffset((p) => Math.max(0, p - DATA_PAGE_SIZE))}
                            icon={<ChevronLeft className="size-3.5" aria-hidden="true" />}
                          >
                            Trước
                          </Button>
                          <Button
                            disabled={
                              dataOffset + previewRows.length >= (dataQuery.data?.total ?? 0)
                            }
                            onClick={() => setDataOffset((p) => p + DATA_PAGE_SIZE)}
                            icon={<ChevronRight className="size-3.5" aria-hidden="true" />}
                          >
                            Sau
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <Dialog
        open={confirmActivateId !== null}
        onOpenChange={(open) => !open && setConfirmActivateId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận kích hoạt phiên bản Silver</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ chuyển tham chiếu phiên bản Silver đang hoạt động của profile{' '}
              <strong className="font-mono">{selectedProfileId}</strong> sang snapshot{' '}
              <strong className="font-mono">{confirmActivateId}</strong>. Hệ thống sẽ kiểm tra
              checksum và cấu trúc dữ liệu trước khi chuyển đổi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={activateMutation.isPending}
              onClick={() => setConfirmActivateId(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={activateMutation.isPending}
              onClick={() => {
                if (confirmActivateId) activateMutation.mutate(confirmActivateId)
              }}
            >
              {activateMutation.isPending ? 'Đang kích hoạt…' : 'Xác nhận kích hoạt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
