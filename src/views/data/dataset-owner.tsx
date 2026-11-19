'use client'

import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { API_OwnerDepartments, API_SetDatasetOwner } from '@/api/admindata/datasets'
import { getApiErrorMessage } from '@/api/http'
import { Button } from '@/components/page/page-parts'
import type { DatasetItem } from '@/types/datasets'

const codes: Record<string, string> = { hr: 'PNS', academic: 'PDT', admissions: 'PTS' }

export function DatasetOwner({ dataset }: { dataset: DatasetItem }) {
  const client = useQueryClient()
  const [choice, setChoice] = useState(String(dataset.owner_department_id ?? ''))
  const departments = useQuery({ queryKey: ['owner-departments'], queryFn: API_OwnerDepartments })
  const update = useMutation({
    mutationFn: () =>
      API_SetDatasetOwner(dataset.dataset_id, Number(choice), dataset.owner_department_id ?? null),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['datasets'] })
      toast.success('Đã lưu phòng sở hữu')
    },
  })
  const suggested = departments.data?.find((d) => d.department_code === codes[dataset.domain])
  return (
    <div className="space-y-2 text-sm">
      <label htmlFor={`owner-${dataset.dataset_id}`} className="font-semibold">
        Phòng sở hữu
      </label>
      <select
        id={`owner-${dataset.dataset_id}`}
        className="w-full rounded-lg border border-slate-300 bg-white p-2"
        value={choice}
        disabled={update.isPending || !departments.data}
        onChange={(e) => {
          setChoice(e.target.value)
          update.reset()
        }}
      >
        <option value="">Chưa cấu hình</option>
        {departments.data?.map((d) => (
          <option key={d.department_id} value={d.department_id}>
            {d.department_code} — {d.department_name}
          </option>
        ))}
      </select>
      {suggested && !dataset.owner_department_id && (
        <p className="text-slate-500">
          Theo lĩnh vực, phòng tương ứng là {suggested.department_name}. Kiểm tra nội dung trước khi
          chọn và lưu.
        </p>
      )}
      <p className="text-slate-500">
        Manager chỉ đọc khi lĩnh vực và phòng sở hữu khớp với phân công đang hiệu lực.
      </p>
      <Button
        disabled={!choice || update.isPending || Number(choice) === dataset.owner_department_id}
        onClick={() => update.mutate()}
      >
        Lưu phòng sở hữu
      </Button>
      {(update.isError || departments.isError) && (
        <p role="alert" className="text-red-700">
          {getApiErrorMessage(
            update.error ?? departments.error,
            'Không thể hoàn tất thao tác. Vui lòng thử lại.'
          )}
        </p>
      )}
      {departments.isError && (
        <Button onClick={() => void departments.refetch()}>Thử tải lại phòng ban</Button>
      )}
    </div>
  )
}
