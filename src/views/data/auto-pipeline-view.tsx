'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  API_GetAutoSilverPolicy,
  API_ListSilverWorkers,
  API_SaveAutoSilverPolicy,
} from '@/api/admindata/auto-pipeline'
import { API_ListDatasets } from '@/api/admindata/datasets'
import { API_ListProfiles } from '@/api/admindata/profiles'
import { getApiErrorMessage } from '@/api/http'
import { API_ListAutoSilverJobs } from '@/api/shared/auto-pipeline'
import { AutoSilverJobDetail, AutoSilverStatusTag } from '@/components/data/auto-silver-jobs'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  formatDateTime,
} from '@/components/page/page-parts'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import type { AutoSilverPolicy } from '@/types/auto-pipeline'
import type { SilverProfileRead } from '@/types/silver-profiles'

import { IngestionFlowMonitor } from './ingestion-flow-monitor'

const inputClass = 'w-full rounded-md border border-slate-300 bg-white p-2 text-sm'
const PAGE_SIZE = 20

function PolicyEditor({
  datasetId,
  policy,
  profiles,
  reload,
  onSaved,
}: {
  datasetId: number
  policy: AutoSilverPolicy | null
  profiles: SilverProfileRead[]
  reload: () => void
  onSaved: () => void
}) {
  const client = useQueryClient()
  const [profileId, setProfileId] = useState(
    policy?.definition.profile_id ?? (profiles.length === 1 ? profiles[0]!.profile_id : '')
  )
  const [enabled, setEnabled] = useState(policy?.enabled ?? false)
  const [partial, setPartial] = useState(policy?.definition.allow_partial_publication ?? false)
  const [attempts, setAttempts] = useState(String(policy?.definition.max_attempts ?? 3))
  const [delay, setDelay] = useState(String(policy?.definition.retry_delay_seconds ?? 30))
  const valid =
    Boolean(profileId) &&
    Number.isInteger(Number(attempts)) &&
    Number(attempts) >= 1 &&
    Number(attempts) <= 10 &&
    Number.isInteger(Number(delay)) &&
    Number(delay) >= 1 &&
    Number(delay) <= 3600
  const profileAvailable = profiles.some((profile) => profile.profile_id === profileId)
  const save = useMutation({
    mutationFn: () =>
      API_SaveAutoSilverPolicy(datasetId, {
        expected_revision: policy?.revision ?? 0,
        enabled,
        profile_id: profileId,
        allow_partial_publication: partial,
        max_attempts: Number(attempts),
        retry_delay_seconds: Number(delay),
      }),
    onSuccess: async (value) => {
      // Giữ phiên bản vừa lưu trong bộ nhớ; lần sửa sau phải dùng đúng phiên bản này.
      client.setQueryData(['auto-silver', 'policy', datasetId], value)
      onSaved()
      await client.invalidateQueries({ queryKey: ['auto-silver', 'jobs'] })
    },
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid && (!enabled || profileAvailable) && !save.isPending) save.mutate()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">
        {policy
          ? `Cấu hình hiện tại: bản ${policy.revision}, ${policy.enabled ? 'đang bật' : 'đang tắt'}.`
          : 'Bộ dữ liệu này chưa bật tự chạy Silver.'}
      </p>
      <fieldset disabled={save.isPending} className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span>Cách xử lý đã lưu</span>
          <select
            aria-label="Cách xử lý tự động"
            className={inputClass}
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
          >
            <option value="">Chọn cách xử lý của bộ dữ liệu</option>
            {profiles.map((profile) => (
              <option key={profile.profile_id} value={profile.profile_id}>
                {profile.definition.entity} · {profile.definition.source_table} · bản{' '}
                {profile.revision}
              </option>
            ))}
            {profileId && !profileAvailable && (
              <option value={profileId}>Cách xử lý hiện tại không còn trong danh sách</option>
            )}
          </select>
        </label>
        {profiles.length === 0 && (
          <p className="text-amber-800">
            Chưa có cách xử lý cho bộ dữ liệu này. Hãy thiết lập và kiểm tra tại{' '}
            <Link href="/data/cleaning" className="font-semibold underline">
              Làm sạch &amp; Kiểm tra
            </Link>{' '}
            trước khi bật tự chạy.
          </p>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Tự xử lý Silver cho các lần nạp mới
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={partial}
            onChange={(event) => setPartial(event.target.checked)}
          />
          Cho phép công bố các dòng hợp lệ khi có dòng bị cách ly
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Số lần thử tối đa</span>
            <input
              aria-label="Số lần thử tối đa"
              type="number"
              min="1"
              max="10"
              required
              className={inputClass}
              value={attempts}
              onChange={(event) => setAttempts(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Thời gian chờ trước khi thử lại (giây)</span>
            <input
              aria-label="Thời gian chờ trước khi thử lại (giây)"
              type="number"
              min="1"
              max="3600"
              required
              className={inputClass}
              value={delay}
              onChange={(event) => setDelay(event.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <p className="text-xs text-slate-600">
        Cấu hình chỉ áp dụng cho lần nạp đạt Bronze sau khi lưu. File cần đúng tên, loại và cấu trúc
        của cách xử lý đã chọn. Tự chạy không tự gửi hồ sơ lỗi về nhân viên; DATA_ADMIN vẫn duyệt
        việc giao sửa.
      </p>
      {save.isError && (
        <ErrorState
          message={getApiErrorMessage(
            save.error,
            'Không lưu được cấu hình. Nếu có người vừa thay đổi, hãy tải lại bản mới nhất.'
          )}
          onRetry={reload}
        />
      )}
      <Button
        loading={save.isPending}
        type="submit"
        variant="primary"
        disabled={!valid || (enabled && !profileAvailable) || save.isPending}
      >
        {save.isPending ? 'Đang lưu…' : 'Lưu cấu hình tự chạy'}
      </Button>
    </form>
  )
}

function DatasetPolicy({ datasetId }: { datasetId: number }) {
  const [profileOffset, setProfileOffset] = useState(0)
  const [saved, setSaved] = useState(false)
  const policy = useQuery({
    queryKey: ['auto-silver', 'policy', datasetId],
    queryFn: () => API_GetAutoSilverPolicy(datasetId),
    retry: false,
  })
  const profiles = useQuery({
    queryKey: ['auto-silver', 'profiles', datasetId, profileOffset],
    queryFn: () => API_ListProfiles({ dataset_id: datasetId, limit: 100, offset: profileOffset }),
    placeholderData: keepPreviousData,
  })
  const [loaded, setLoaded] = useState<SilverProfileRead[]>([])
  const options = [...loaded, ...(profiles.data ?? [])].filter(
    (profile, index, all) =>
      all.findIndex((item) => item.profile_id === profile.profile_id) === index
  )
  if (policy.isPending || profiles.isPending)
    return <LoadingState label="Đang tải cấu hình và cách xử lý…" />
  if (policy.isError || profiles.isError)
    return (
      <ErrorState
        message={getApiErrorMessage(
          policy.error ?? profiles.error,
          'Không tải được cấu hình tự chạy.'
        )}
        onRetry={() => {
          void policy.refetch()
          void profiles.refetch()
        }}
      />
    )
  return (
    <div className="space-y-3">
      <PolicyEditor
        key={`${datasetId}-${policy.data?.revision ?? 0}`}
        datasetId={datasetId}
        policy={policy.data}
        profiles={options}
        reload={() => {
          setSaved(false)
          void policy.refetch()
        }}
        onSaved={() => setSaved(true)}
      />
      {saved && (
        <p role="status" className="text-emerald-800">
          Đã lưu cấu hình tự chạy.
        </p>
      )}
      {profiles.data.length === 100 && (
        <Button
          disabled={profiles.isFetching}
          onClick={() => {
            setLoaded(options)
            setProfileOffset((value) => value + 100)
          }}
        >
          Tải thêm cách xử lý
        </Button>
      )}
      {policy.data && (
        <p className="text-xs text-slate-500">
          Cập nhật: {formatDateTime(policy.data.updated_at)} · Bản {policy.data.revision}
        </p>
      )}
    </div>
  )
}

export function AutoPipelineView() {
  const [datasetId, setDatasetId] = useState('')
  const [datasetSearch, setDatasetSearch] = useState('')
  const [search, setSearch] = useState('')
  const [datasetOffset, setDatasetOffset] = useState(0)
  const [offset, setOffset] = useState(0)
  const [ingestionInput, setIngestionInput] = useState('')
  const [ingestionFilter, setIngestionFilter] = useState<number | undefined>()
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(true)
  const datasets = useQuery({
    queryKey: ['auto-silver', 'datasets', search, datasetOffset],
    queryFn: () =>
      API_ListDatasets({ search: search || undefined, limit: 100, offset: datasetOffset }),
  })
  const jobs = useQuery({
    queryKey: ['auto-silver', 'jobs', datasetId, ingestionFilter, offset],
    queryFn: () =>
      API_ListAutoSilverJobs({
        dataset_id: datasetId ? Number(datasetId) : undefined,
        ingestion_job_id: ingestionFilter,
        limit: PAGE_SIZE,
        offset,
      }),
    refetchInterval: refresh ? 5000 : false,
  })
  const workers = useQuery({
    queryKey: ['auto-silver', 'workers'],
    queryFn: API_ListSilverWorkers,
    refetchInterval: refresh ? 5000 : false,
  })
  function changeDataset(value: string) {
    setDatasetId(value)
    setOffset(0)
    setSelectedJob(null)
  }
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Quản trị dữ liệu', 'Xử lý Silver tự động']}
        title="Xử lý Silver tự động"
        description="Bật xử lý sau khi nạp Bronze, theo dõi kết quả và thử lại các lượt thất bại."
        actions={
          <>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={refresh}
                onChange={(event) => setRefresh(event.target.checked)}
              />
              Tự làm mới mỗi 5 giây
            </label>
            <Button
              reading={jobs.isFetching || workers.isFetching}
              onClick={() => {
                void jobs.refetch()
                void workers.refetch()
              }}
            >
              Làm mới
            </Button>
          </>
        }
      />
      <IngestionFlowMonitor refresh={refresh} />
      <Card title="Chọn bộ dữ liệu và cách tự xử lý">
        <form
          className="mb-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(datasetSearch.trim())
            setDatasetOffset(0)
            changeDataset('')
          }}
        >
          <input
            aria-label="Tìm bộ dữ liệu tự chạy"
            className={inputClass}
            value={datasetSearch}
            onChange={(event) => setDatasetSearch(event.target.value)}
            placeholder="Tìm theo tên bộ dữ liệu"
          />
          <Button type="submit">Tìm bộ dữ liệu</Button>
        </form>
        {datasets.isPending ? (
          <LoadingState />
        ) : datasets.isError ? (
          <ErrorState
            message={getApiErrorMessage(datasets.error, 'Không tải được bộ dữ liệu.')}
            retrying={datasets.isFetching}
            onRetry={() => void datasets.refetch()}
          />
        ) : (
          <>
            <label className="block space-y-1 text-sm">
              <span>Bộ dữ liệu</span>
              <select
                aria-label="Bộ dữ liệu tự chạy"
                className={inputClass}
                value={datasetId}
                onChange={(event) => changeDataset(event.target.value)}
              >
                <option value="">Chọn bộ dữ liệu — danh sách lượt chạy đang hiện tất cả</option>
                {datasets.data.map((dataset) => (
                  <option key={dataset.dataset_id} value={String(dataset.dataset_id)}>
                    {dataset.dataset_name} · {dataset.domain}
                  </option>
                ))}
              </select>
            </label>
            <div className="my-3 flex gap-2">
              <Button
                disabled={datasetOffset === 0}
                onClick={() => {
                  setDatasetOffset((value) => Math.max(0, value - 100))
                  changeDataset('')
                }}
              >
                Trang bộ dữ liệu trước
              </Button>
              <Button
                disabled={datasets.data.length < 100}
                onClick={() => {
                  setDatasetOffset((value) => value + 100)
                  changeDataset('')
                }}
              >
                Trang bộ dữ liệu sau
              </Button>
            </div>
          </>
        )}
        {datasetId ? (
          <DatasetPolicy key={datasetId} datasetId={Number(datasetId)} />
        ) : (
          <p className="text-sm text-slate-500">Chọn bộ dữ liệu để xem hoặc cấu hình tự chạy.</p>
        )}
      </Card>
      <Card title="Các lượt tự xử lý Silver">
        <form
          className="mb-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const value = Number(ingestionInput)
            if (!ingestionInput.trim() || (Number.isInteger(value) && value > 0)) {
              setIngestionFilter(ingestionInput.trim() ? value : undefined)
              setOffset(0)
              setSelectedJob(null)
            }
          }}
        >
          <input
            aria-label="Lọc theo lần nạp Bronze"
            type="number"
            min="1"
            className={inputClass}
            value={ingestionInput}
            onChange={(event) => setIngestionInput(event.target.value)}
            placeholder="Lần nạp Bronze (tùy chọn)"
          />
          <Button type="submit">Lọc lượt chạy</Button>
        </form>
        {jobs.isPending ? (
          <TableSkeleton columns={6} />
        ) : jobs.isError ? (
          <ErrorState
            message={getApiErrorMessage(jobs.error, 'Không tải được các lượt tự xử lý.')}
            retrying={jobs.isFetching}
            onRetry={() => void jobs.refetch()}
          />
        ) : jobs.data.length === 0 ? (
          <EmptyState title="Chưa có lượt tự xử lý phù hợp" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {[
                    'Lượt xử lý',
                    'Lần nạp / Bộ dữ liệu',
                    'Trạng thái',
                    'Đã thử',
                    'Tạo lúc',
                    'Mã lỗi',
                  ].map((label) => (
                    <th key={label} scope="col" className="p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.data.map((job) => (
                  <tr key={job.job_id} className="border-t">
                    <td className="p-2">
                      <button
                        className="font-semibold text-[#a9162e] underline"
                        onClick={() => setSelectedJob(job.job_id)}
                      >
                        Xem lượt {job.job_id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="p-2">
                      #{job.ingestion_job_id} / #{job.dataset_id}
                    </td>
                    <td className="p-2">
                      <AutoSilverStatusTag job={job} />
                    </td>
                    <td className="p-2">{job.attempt_number}</td>
                    <td className="p-2">{formatDateTime(job.created_at)}</td>
                    <td className="p-2">{job.error_code ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button
            disabled={offset === 0}
            onClick={() => {
              setOffset((value) => Math.max(0, value - PAGE_SIZE))
              setSelectedJob(null)
            }}
          >
            Trước
          </Button>
          <Button
            disabled={!jobs.data || jobs.data.length < PAGE_SIZE}
            onClick={() => {
              setOffset((value) => value + PAGE_SIZE)
              setSelectedJob(null)
            }}
          >
            Sau
          </Button>
        </div>
      </Card>
      {selectedJob && (
        <Card
          title="Chi tiết lượt tự xử lý"
          right={<Button onClick={() => setSelectedJob(null)}>Đóng chi tiết</Button>}
        >
          <AutoSilverJobDetail key={selectedJob} jobId={selectedJob} canRetry />
        </Card>
      )}
      <Card title="Tiến trình xử lý Silver">
        {workers.isPending ? (
          <TableSkeleton columns={4} />
        ) : workers.isError ? (
          <ErrorState
            message={getApiErrorMessage(workers.error, 'Không tải được tiến trình xử lý Silver.')}
            retrying={workers.isFetching}
            onRetry={() => void workers.refetch()}
          />
        ) : workers.data.length === 0 ? (
          <EmptyState
            title="Chưa ghi nhận tiến trình xử lý Silver"
            description="Cần có Silver Worker đang chạy để nhận các lượt đã xếp hàng."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th scope="col" className="p-2">
                    Bộ xử lý
                  </th>
                  <th scope="col" className="p-2">
                    Lượt đang xử lý
                  </th>
                  <th scope="col" className="p-2">
                    Liên lạc gần nhất
                  </th>
                </tr>
              </thead>
              <tbody>
                {workers.data.map((worker) => (
                  <tr key={worker.worker_id} className="border-t">
                    <td className="p-2">{worker.worker_id}</td>
                    <td className="p-2">
                      {worker.current_job_id ? (
                        <button
                          className="text-[#a9162e] underline"
                          onClick={() => setSelectedJob(worker.current_job_id)}
                        >
                          Xem lượt đang xử lý
                        </button>
                      ) : (
                        'Chưa giữ lượt xử lý'
                      )}
                    </td>
                    <td className="p-2">{formatDateTime(worker.last_heartbeat_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
