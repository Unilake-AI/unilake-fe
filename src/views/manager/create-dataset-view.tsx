'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { API_ListSourceSystems } from '@/api/admindata/datasets'
import { getApiErrorMessage } from '@/api/http'
import { API_ManagerCreateDataset } from '@/api/manager/catalog'
import type { ManagerContext } from '@/api/manager/reports'
import { PageHeader, Card, Tag } from '@/components/page/page-parts'

import { ManagerGate } from './report-parts'

const formSchema = z.object({
  dataset_name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên bộ dữ liệu.')
    .max(200, 'Tên bộ dữ liệu tối đa 200 ký tự.'),
  dataset_code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã bộ dữ liệu.')
    .max(100, 'Mã bộ dữ liệu tối đa 100 ký tự.'),
  description: z.string().max(4000, 'Mô tả tối đa 4000 ký tự.').optional(),
})

function toDatasetCode(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function ManagerCreateDatasetView() {
  return (
    <ManagerGate>
      {(context) => <CreateDatasetForm context={context} key={context.user_id} />}
    </ManagerGate>
  )
}

const domainDepartments = { hr: 'PNS', academic: 'PDT', admissions: 'PTS' }

function CreateDatasetForm({ context }: { context: ManagerContext }) {
  const [domain, setDomain] = useState<'hr' | 'academic' | 'admissions'>(
    (context.default_domain ?? context.domains[0]?.domain ?? 'hr') as
      'hr' | 'academic' | 'admissions'
  )
  const department = context.departments.find(
    (department) => department.department_code === domainDepartments[domain]
  )
  const departmentName = department?.department_name
  const router = useRouter()
  const queryClient = useQueryClient()

  const [datasetName, setDatasetName] = useState('')
  const [datasetCode, setDatasetCode] = useState('')
  const [isCodeManual, setIsCodeManual] = useState(false)
  const [sourceSystemId, setSourceSystemId] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const sourcesQuery = useQuery({
    queryKey: ['source-systems', 'manager', context.user_id],
    queryFn: API_ListSourceSystems,
    retry: false,
  })

  const sourceOptions =
    sourcesQuery.data?.filter(
      (source) =>
        source.owner_department_id == null ||
        source.owner_department_id === department?.department_id
    ) ?? []

  const createMutation = useMutation({
    mutationFn: API_ManagerCreateDataset,
    onSuccess: (data) => {
      toast.success(`Đã tạo bộ dữ liệu "${data.dataset_name}" thành công!`)
      void queryClient.invalidateQueries({ queryKey: ['manager', 'catalog'] })
      void queryClient.invalidateQueries({ queryKey: ['datasets'] })
      router.push('/manager/catalog')
    },
    onError: (err) => {
      setValidationError(getApiErrorMessage(err, 'Không thể tạo bộ dữ liệu.'))
    },
  })

  const handleNameChange = (val: string) => {
    setDatasetName(val)
    if (!isCodeManual) {
      const generated = toDatasetCode(val)
      setDatasetCode(generated ? `${domain}_${generated}` : '')
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const result = formSchema.safeParse({
      dataset_name: datasetName,
      dataset_code: datasetCode,
      description,
    })

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Dữ liệu nhập không hợp lệ.')
      return
    }

    const selectedSource = sourceOptions.find(
      (source) => String(source.source_system_id) === sourceSystemId
    )
    if (!selectedSource) {
      setValidationError('Vui lòng chọn hệ thống nguồn đang hoạt động.')
      return
    }

    createMutation.mutate({
      dataset_name: datasetName.trim(),
      dataset_code: datasetCode.trim(),
      domain,
      source_system_id: selectedSource.source_system_id,
      description: description.trim() || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/manager/catalog"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-800"
        >
          <ArrowLeft className="size-3.5" />
          <span>Quay lại danh mục bộ dữ liệu</span>
        </Link>
        <PageHeader
          icon={<PlusCircle />}
          title="Quy hoạch bộ dữ liệu mới"
          description="Tạo bộ dữ liệu để nhân viên phòng ban nạp tệp CSV hoặc Excel."
        />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {validationError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              {validationError}
            </div>
          )}

          {/* Dataset Name */}
          <div className="space-y-1.5">
            <label htmlFor="dataset-name" className="block text-xs font-semibold text-slate-700">
              Tên bộ dữ liệu *
            </label>
            <input
              id="dataset-name"
              type="text"
              required
              maxLength={200}
              placeholder="Ví dụ: Danh sách cán bộ giảng viên năm 2026"
              value={datasetName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <p className="text-[11px] text-slate-400">
              Nhập tên rõ ràng, có dấu để nhân viên dễ dàng nhận biết khi nạp file.
            </p>
          </div>

          {/* Dataset Code */}
          <div className="space-y-1.5">
            <label htmlFor="dataset-code" className="block text-xs font-semibold text-slate-700">
              Mã bộ dữ liệu (Mã hệ thống) *
            </label>
            <input
              id="dataset-code"
              type="text"
              required
              maxLength={100}
              placeholder="Ví dụ: hr_can_bo_giang_vien_2026"
              value={datasetCode}
              onChange={(e) => {
                setIsCodeManual(true)
                setDatasetCode(e.target.value)
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 font-mono text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <p className="text-[11px] text-slate-400">
              Tự động sinh từ tên bộ dữ liệu hoặc có thể tự chỉnh sửa (chữ thường không dấu, phân
              tách bằng dấu gạch dưới).
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="manager-source-system"
              className="block text-xs font-semibold text-slate-700"
            >
              Hệ thống nguồn *
            </label>
            <select
              id="manager-source-system"
              value={sourceSystemId}
              onChange={(event) => setSourceSystemId(event.target.value)}
              required
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs"
            >
              <option value="">
                {sourcesQuery.isPending ? 'Đang tải…' : 'Chọn hệ thống nguồn'}
              </option>
              {sourceOptions.map((source) => (
                <option key={source.source_system_id} value={source.source_system_id}>
                  {source.source_name}
                </option>
              ))}
            </select>
            {sourcesQuery.isError && (
              <p role="alert" className="text-xs text-rose-700">
                {getApiErrorMessage(sourcesQuery.error, 'Không tải được hệ thống nguồn.')}
              </p>
            )}
            {sourcesQuery.isSuccess && sourceOptions.length === 0 && (
              <p className="text-xs text-slate-600">
                Cần Data Admin đăng ký hệ thống nguồn cho phòng ban.
              </p>
            )}
          </div>

          {/* Domain & Department (Read-only Scoped) */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200/80 bg-slate-50 p-3 sm:grid-cols-2">
            <div>
              <span className="block text-[11px] font-medium text-slate-500">Lĩnh vực quản lý</span>
              {context.domains.length > 1 && (
                <select
                  aria-label="Lĩnh vực tạo bộ dữ liệu"
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                  value={domain}
                  onChange={(event) => {
                    const nextDomain = event.target.value as typeof domain
                    setDomain(nextDomain)
                    setSourceSystemId('')
                    setValidationError(null)
                    if (!isCodeManual) {
                      const generated = toDatasetCode(datasetName)
                      setDatasetCode(generated ? `${nextDomain}_${generated}` : '')
                    }
                  }}
                >
                  {context.domains.map((item) => (
                    <option key={item.domain} value={item.domain}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-1 flex items-center gap-2">
                <Tag tone="indigo">{domain.toUpperCase()}</Tag>
                <span className="text-xs font-medium text-slate-600">
                  {domain === 'hr' ? 'Nhân sự' : domain === 'academic' ? 'Đào tạo' : 'Tuyển sinh'}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-500">Phòng ban sở hữu</span>
              <span className="mt-1 block text-xs font-semibold text-slate-800">
                {departmentName ?? 'Phòng ban của Quản lý'}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-500">
                Tầng dữ liệu mặc định
              </span>
              <div className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                BRONZE (Raw Storage)
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-500">Phân quyền nạp</span>
              <span className="mt-1 block text-xs text-slate-600">Toàn bộ nhân viên phòng ban</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="dataset-description"
              className="block text-xs font-semibold text-slate-700"
            >
              Mô tả mục đích sử dụng (Tùy chọn)
            </label>
            <textarea
              id="dataset-description"
              rows={3}
              maxLength={4000}
              placeholder="Ghi chú về định dạng file mong đợi, chu kỳ nạp hoặc hướng dẫn cho nhân viên…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
            <Link
              href="/manager/catalog"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !datasetName.trim() ||
                !datasetCode.trim() ||
                !sourceSystemId
              }
              className="shadow-xs action-positive inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="size-3.5" />
              <span>{createMutation.isPending ? 'Đang tạo…' : 'Lưu bộ dữ liệu'}</span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
