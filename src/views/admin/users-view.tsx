'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Link as LinkIcon,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'

import {
  createAccount,
  createAssignment,
  getAccountSummary,
  getOrganization,
  linkEmployee,
  listAccounts,
  listAuditEvents,
  listEmployees,
  parseValidationErrors,
  updateAccountAccess,
} from '@/api/admin/client'
import type {
  Account,
  AssignmentCreatePayload,
  DepartmentItem,
  EmployeeItem,
  PositionItem,
  ValidationErrorItem,
} from '@/api/admin/client'
import { getApiErrorMessage } from '@/api/http'
import { DomainOwners } from '@/components/page/domain-owners'
import { Card, EmptyState, KpiCard, PageHeader, Tag } from '@/components/page/page-parts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROLE_DEFINITIONS, ROLE_PRIORITY } from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import type { StatusTone } from '@/types/page/page-parts'
import type { RoleCode } from '@/types/roles'

import { SessionsPanel } from './sessions-panel'

const ROLE_TONE: Record<RoleCode, StatusTone> = {
  ADMIN: 'rose',
  DATA_ADMIN: 'indigo',
  VIEWER: 'slate',
  ADMISSIONS_MANAGER: 'amber',
  ADMISSIONS_STAFF: 'emerald',
  ACADEMIC_MANAGER: 'amber',
  ACADEMIC_STAFF: 'emerald',
  HR_MANAGER: 'amber',
  HR_STAFF: 'emerald',
}

const AUDIT_ACTIONS: Record<string, string> = {
  LOGIN: 'Đăng nhập',
  ACCOUNT_CREATED: 'Tạo tài khoản',
  ACCOUNT_LOCKED: 'Khóa tài khoản',
  ACCOUNT_UNLOCKED: 'Mở khóa tài khoản',
  ROLES_UPDATED: 'Đổi vai trò',
  ACCOUNT_ACCESS_UPDATED: 'Cập nhật quyền truy cập',
  GRANTED: 'Cấp quyền Domain Owner',
  REVOKED: 'Thu hồi quyền Domain Owner',
  EMPLOYEE_LINKED: 'Liên kết hồ sơ nhân viên',
  ASSIGNMENT_CREATED: 'Tạo phân công nhân sự',
}

/** Form tạo tài khoản mới (POST /users) */
function CreateAccountModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (userId: number) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<RoleCode[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[] | null>(null)

  function toggleRole(role: RoleCode) {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập.')
      return
    }
    if (password.length < 12 || password.length > 256) {
      setError('Mật khẩu phải có độ dài từ 12 đến 256 ký tự.')
      return
    }
    if (selectedRoles.length === 0) {
      setError('Vui lòng chọn ít nhất một vai trò.')
      return
    }

    setPending(true)
    setError('')
    setValidationErrors(null)

    try {
      const result = await createAccount(username.trim(), password, selectedRoles)
      onCreated(result?.user_id ?? 0)
      onOpenChange(false)
      setUsername('')
      setPassword('')
      setSelectedRoles([])
    } catch (cause: unknown) {
      const vErrors = parseValidationErrors(cause)
      if (vErrors && vErrors.length > 0) {
        setValidationErrors(vErrors)
        setError('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại theo thông báo lỗi bên dưới.')
      } else {
        setError(getApiErrorMessage(cause, 'Không thể tạo tài khoản.'))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="size-5 text-rose-700" />
            Tạo tài khoản người dùng mới
          </DialogTitle>
          <DialogDescription>
            Đăng ký tài khoản với tên đăng nhập, mật khẩu (12–256 ký tự) và vai trò tương ứng.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 pt-2" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Tên đăng nhập</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="vd. nguyen.van.a"
              required
              minLength={3}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Mật khẩu ban đầu (12–256 ký tự)
              </label>
              <span className="text-[11px] text-slate-500">{password.length}/256 ký tự</span>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập ít nhất 12 ký tự bảo mật"
                required
                minLength={12}
                maxLength={256}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {password.length > 0 && password.length < 12 && (
              <p className="text-[11px] text-rose-600">Cần thêm {12 - password.length} ký tự nữa.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Gán vai trò hệ thống</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_PRIORITY.map((role) => {
                const def = ROLE_DEFINITIONS[role]
                const checked = selectedRoles.includes(role)
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                      checked
                        ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(role)}
                      className="mt-0.5 size-4 rounded text-rose-600"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{def.name}</p>
                      <p className="text-[10px] text-slate-500">{role}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
            >
              <p className="font-semibold">{error}</p>
              {validationErrors && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                  {validationErrors.map((v, i) => (
                    <li key={i}>
                      Vị trí: <code className="font-mono">{v.loc.join('.')}</code> · Loại lỗi:{' '}
                      <code className="font-mono">{v.type}</code> ({v.msg})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending || password.length < 12}>
              {pending ? 'Đang tạo…' : 'Xác nhận tạo tài khoản'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Form cập nhật quyền truy cập và khóa/mở khóa (PATCH /users/{user_id}/access) */
function EditAccessModal({
  account,
  currentUserId,
  open,
  onOpenChange,
  onSaved,
}: {
  account: Account | null
  currentUserId?: number | string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [selectedRoles, setSelectedRoles] = useState<RoleCode[]>([])
  const [isActive, setIsActive] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  // Khi modal mở, khởi tạo dữ liệu
  useState(() => {
    if (account) {
      setSelectedRoles(
        account.roles.map((r) => r as RoleCode).filter((r) => ROLE_PRIORITY.includes(r))
      )
      setIsActive(account.is_active)
    }
  })

  if (!account) return null

  const isEditingSelf = String(account.user_id) === String(currentUserId)

  function toggleRole(role: RoleCode) {
    if (isEditingSelf && role === 'ADMIN') return // Chặn tự gỡ ADMIN
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!account) return
    if (selectedRoles.length === 0) {
      setError('Tài khoản phải có ít nhất một vai trò.')
      return
    }

    setPending(true)
    setError('')

    try {
      await updateAccountAccess(account, selectedRoles, isEditingSelf ? true : isActive)
      onSaved()
      onOpenChange(false)
    } catch (cause: unknown) {
      setError(
        getApiErrorMessage(
          cause,
          'Không thể cập nhật quyền. Có thể tài khoản đã thay đổi hoặc thao tác làm mất quyền quản trị.'
        )
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="size-5 text-rose-700" />
            Phân quyền: {account.username} (#{account.user_id})
          </DialogTitle>
          <DialogDescription>
            Cập nhật vai trò, khóa hoặc mở khóa tài khoản với cơ chế bảo vệ quản trị viên.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 pt-2" onSubmit={(e) => void handleSubmit(e)}>
          {isEditingSelf && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <p>
                <span className="font-semibold">Bạn đang chỉnh sửa chính tài khoản của mình:</span>{' '}
                Hệ thống chặn tự khóa và tự gỡ vai trò ADMIN để đảm bảo luôn có tài khoản quản trị
                hợp lệ đang hoạt động.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Vai trò phân công</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_PRIORITY.map((role) => {
                const def = ROLE_DEFINITIONS[role]
                const checked = selectedRoles.includes(role)
                const disabled = isEditingSelf && role === 'ADMIN'
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleRole(role)}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                      checked
                        ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50'
                    } ${disabled ? 'opacity-80 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleRole(role)}
                      className="mt-0.5 size-4 rounded text-rose-600"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">{def.name}</p>
                      <p className="text-[10px] text-slate-500">{role}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">Trạng thái hoạt động</p>
                <p className="text-[11px] text-slate-500">
                  Khóa tài khoản sẽ vô hiệu hóa tất cả access token và refresh token thuộc các phiên
                  đang hoạt động.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isEditingSelf ? true : isActive}
                  disabled={isEditingSelf}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4 rounded text-rose-600"
                />
                <span className="ml-2 text-xs font-medium">
                  {isActive ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </label>
            </div>
            {!isActive && !isEditingSelf && (
              <p className="text-[11px] text-rose-600">
                Lưu ý: Sau khi mở khóa, người dùng sẽ cần đăng nhập lại từ đầu.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Modal liên kết tài khoản với hồ sơ nhân viên (PATCH /users/{user_id}/employee) */
function LinkEmployeeModal({
  account,
  open,
  onOpenChange,
  onLinked,
}: {
  account: Account | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked: () => void
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const employeesQuery = useQuery({
    queryKey: ['admin', 'employees', search],
    queryFn: () => listEmployees(search, 0, 20),
    enabled: open,
  })

  if (!account) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!account) return
    const id = Number(employeeId)
    if (!id || id <= 0) {
      setError('Vui lòng chọn hoặc nhập mã nhân viên hợp lệ.')
      return
    }

    setPending(true)
    setError('')
    try {
      await linkEmployee(account.user_id, id, account.employee_id ?? null)
      onLinked()
      onOpenChange(false)
    } catch (cause: unknown) {
      setError(getApiErrorMessage(cause, 'Không thể liên kết hồ sơ nhân viên.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <LinkIcon className="size-5 text-indigo-600" />
            Liên kết hồ sơ nhân sự: {account.username}
          </DialogTitle>
          <DialogDescription>
            Gắn tài khoản với hồ sơ nhân viên thực tế để tính toán phân công và quyền phụ trách phòng
            ban.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 pt-2" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Tìm kiếm nhân viên</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã nhân viên…"
            />
          </div>

          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
            {employeesQuery.isPending && <p className="text-slate-500">Đang tìm nhân viên…</p>}
            {employeesQuery.data?.map((emp) => (
              <button
                key={emp.employee_id}
                type="button"
                onClick={() => setEmployeeId(String(emp.employee_id))}
                className={`flex w-full items-center justify-between rounded p-1.5 text-left transition-colors ${
                  employeeId === String(emp.employee_id)
                    ? 'bg-indigo-100 font-semibold text-indigo-900'
                    : 'hover:bg-slate-100'
                }`}
              >
                <span>
                  {emp.full_name} {emp.employee_code && `(${emp.employee_code})`}
                </span>
                <span className="font-mono text-slate-500">#{emp.employee_id}</span>
              </button>
            ))}
            {employeesQuery.data?.length === 0 && (
              <p className="text-slate-500">Không tìm thấy nhân viên phù hợp.</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Mã nhân viên (ID)</label>
            <Input
              type="number"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="vd. 102"
              required
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending || !employeeId}>
              {pending ? 'Đang liên kết…' : 'Xác nhận liên kết'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Modal tạo phân công nhân sự (POST /users/assignments) */
function CreateAssignmentModal({
  open,
  onOpenChange,
  onCreated,
  initialEmployeeId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  initialEmployeeId?: number
}) {
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ? String(initialEmployeeId) : '')
  const [departmentId, setDepartmentId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [isPrimary, setIsPrimary] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const orgQuery = useQuery({ queryKey: ['admin', 'organization'], queryFn: getOrganization })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!employeeId || !departmentId || !positionId || !startDate) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.')
      return
    }

    setPending(true)
    setError('')
    try {
      await createAssignment({
        employee_id: Number(employeeId),
        department_id: Number(departmentId),
        position_id: Number(positionId),
        start_date: startDate,
        end_date: endDate.trim() ? endDate.trim() : null,
        is_primary: isPrimary,
      })
      onCreated()
      onOpenChange(false)
    } catch (cause: unknown) {
      setError(getApiErrorMessage(cause, 'Không thể tạo phân công.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="size-5 text-indigo-600" />
            Tạo phân công nhân sự mới
          </DialogTitle>
          <DialogDescription>
            Phân công nhân viên vào phòng ban và chức vụ để xác thực vai trò quản lý hoặc nhân viên.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 pt-2" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Mã nhân viên (Employee ID)</label>
            <Input
              type="number"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="vd. 1"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Phòng ban hoạt động</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">-- Chọn phòng ban --</option>
                {orgQuery.data?.departments?.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Chức vụ</label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                required
                className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">-- Chọn chức vụ --</option>
                {orgQuery.data?.positions?.map((p) => (
                  <option key={p.position_id} value={p.position_id}>
                    {p.position_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ngày bắt đầu</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Ngày kết thúc (tùy chọn)
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="size-4 rounded text-indigo-600"
            />
            Phân công chính (Primary Assignment)
          </label>

          {error && (
            <p
              role="alert"
              className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Đang tạo…' : 'Xác nhận phân công'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Main Admin View */
export function UsersView() {
  const { user, roles } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'accounts' | 'organization' | 'owners' | 'audit' | 'sessions'>('accounts')

  // Search & Pagination
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 20

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [linkingAccount, setLinkingAccount] = useState<Account | null>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Audit filter state
  const [auditOffset, setAuditOffset] = useState(0)

  // Has both ADMIN and DATA_ADMIN
  const hasAdmin = roles.includes('ADMIN')
  const hasDataAdmin = roles.includes('DATA_ADMIN')
  const canSwitchWorkspace = hasAdmin && hasDataAdmin

  // Queries
  const summary = useQuery({ queryKey: ['admin', 'summary'], queryFn: getAccountSummary })
  const accounts = useQuery({
    queryKey: ['admin', 'accounts', search, offset],
    queryFn: () => listAccounts(search, offset, limit),
  })
  const organization = useQuery({
    queryKey: ['admin', 'organization'],
    queryFn: getOrganization,
    enabled: activeTab === 'organization' || showAssignmentModal,
  })
  const auditLogs = useQuery({
    queryKey: ['admin', 'audit-events', auditOffset],
    queryFn: () => listAuditEvents(auditOffset, 20),
    enabled: activeTab === 'audit',
  })

  function handleAccountCreated(userId: number) {
    setSuccessNotice(`Tạo tài khoản thành công! Mã tài khoản: #${userId}`)
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  function handleAccountUpdated() {
    setSuccessNotice('Cập nhật quyền truy cập thành công!')
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  function handleEmployeeLinked() {
    setSuccessNotice('Liên kết hồ sơ nhân viên thành công!')
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  function handleAssignmentCreated() {
    setSuccessNotice('Tạo phân công nhân sự thành công!')
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumb={['Quản trị hệ thống', 'Quản lý tài khoản & phân quyền']}
        title="Quản trị tài khoản & Phân quyền"
        description="Quản lý danh tính, phân công, quyền truy cập hệ thống và lịch sử kiểm toán bảo mật (IAM)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              <UserPlus className="mr-1.5 size-4" />
              Tạo tài khoản mới
            </Button>
          </div>
        }
      />

      {/* Workspace Switcher Banner for dual-role users (ADMIN + DATA_ADMIN) */}
      {canSwitchWorkspace && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 p-4 shadow-xs sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
              <Database className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Không gian làm việc kép
                </span>
                <Tag tone="indigo">ADMIN & DATA_ADMIN</Tag>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                Tài khoản của bạn có đủ quyền vận hành nguồn dữ liệu, dataset hoặc pipeline. Chuyển
                sang không gian Quản trị Dữ liệu để thực hiện.
              </p>
            </div>
          </div>
          <Link href="/data">
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Chuyển sang Quản trị Dữ liệu
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Success Notice Banner */}
      {successNotice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button
            type="button"
            className="text-emerald-700 underline hover:text-emerald-900"
            onClick={() => setSuccessNotice(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      {summary.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Tổng số tài khoản"
            value={summary.data.total}
            hint="Tất cả tài khoản trong hệ thống"
            tone="slate"
          />
          <KpiCard
            label="Đang hoạt động"
            value={summary.data.active}
            hint="Có quyền đăng nhập và thao tác"
            tone="emerald"
          />
          <KpiCard
            label="Đã khóa"
            value={summary.data.total - summary.data.active}
            hint="Đã thu hồi phiên và vô hiệu hóa token"
            tone="rose"
          />
          <KpiCard
            label="Phòng ban có phân công"
            value={summary.data.departments.length}
            hint="Phòng ban có nhân sự hoạt động"
            tone="indigo"
          />
        </div>
      )}

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)}>
        <TabsList className="h-11 w-full justify-start overflow-x-auto rounded-lg border bg-slate-100/70 p-1">
          <TabsTrigger
            value="accounts"
            onClick={() => setActiveTab('accounts')}
            className="gap-2 text-xs font-semibold"
          >
            <Users className="size-4" />
            Danh sách tài khoản ({summary.data?.total ?? accounts.data?.length ?? '…'})
          </TabsTrigger>
          <TabsTrigger
            value="organization"
            onClick={() => setActiveTab('organization')}
            className="gap-2 text-xs font-semibold"
          >
            <Building2 className="size-4" />
            Cơ cấu tổ chức & Phân công
          </TabsTrigger>
          <TabsTrigger
            value="owners"
            onClick={() => setActiveTab('owners')}
            className="gap-2 text-xs font-semibold"
          >
            <ShieldCheck className="size-4" />
            Người phụ trách lĩnh vực (Domain Owner)
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            onClick={() => setActiveTab('audit')}
            className="gap-2 text-xs font-semibold"
          >
            <History className="size-4" />
            Nhật ký kiểm toán (Audit Log)
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            onClick={() => setActiveTab('sessions')}
            className="gap-2 text-xs font-semibold"
          >
            <Lock className="size-4" />
            Phiên đăng nhập
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ACCOUNTS LIST */}
        <TabsContent value="accounts" className="space-y-4 pt-2">
          <Card
            title="Danh sách tài khoản và phân quyền"
            subtitle="Xem xét, gán vai trò, quản lý trạng thái tài khoản và liên kết hồ sơ nhân sự"
            right={
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <UserPlus className="mr-1.5 size-4" />
                  Tạo tài khoản
                </Button>
              </div>
            }
          >
            {/* Search Bar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                <Input
                  aria-label="Tìm theo tên đăng nhập"
                  placeholder="Tìm theo tên đăng nhập…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setOffset(0)
                  }}
                  className="pl-9 text-xs"
                />
              </div>
              <div className="text-xs text-slate-500">
                Hiển thị từ {offset + 1} đến {offset + (accounts.data?.length ?? 0)}
              </div>
            </div>

            {/* Loading & Error States */}
            {accounts.isPending && (
              <p className="py-6 text-center text-sm text-slate-500" role="status">
                Đang tải danh sách tài khoản…
              </p>
            )}
            {accounts.isError && (
              <p className="py-4 text-sm text-rose-700" role="alert">
                {getApiErrorMessage(accounts.error, 'Không thể tải danh sách tài khoản.')}
              </p>
            )}

            {accounts.data?.length === 0 && !accounts.isPending && (
              <EmptyState
                title="Không tìm thấy tài khoản phù hợp"
                description="Thử tìm kiếm với từ khóa khác hoặc tạo tài khoản mới."
              />
            )}

            {/* Table */}
            {accounts.data && accounts.data.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th scope="col" className="p-3">
                        Tài khoản
                      </th>
                      <th scope="col" className="p-3">
                        Vai trò (Roles)
                      </th>
                      <th scope="col" className="p-3">
                        Phòng ban phân công
                      </th>
                      <th scope="col" className="p-3">
                        Trạng thái
                      </th>
                      <th scope="col" className="p-3 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.data.map((acc) => {
                      const isSelf = String(acc.user_id) === String(user?.id)
                      return (
                        <tr
                          key={acc.user_id}
                          className={`transition-colors hover:bg-slate-50/70 ${
                            isSelf ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {acc.username}
                                <span className="ml-1 text-[11px] font-normal text-slate-500">
                                  #{acc.user_id}
                                </span>
                              </p>
                              {isSelf && <Tag tone="rose">Bạn</Tag>}
                            </div>
                            {acc.full_name && (
                              <p className="text-[11px] text-slate-600">{acc.full_name}</p>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {acc.roles.length > 0 ? (
                                acc.roles.map((role) => (
                                  <Tag key={role} tone={ROLE_TONE[role as RoleCode] ?? 'slate'}>
                                    {ROLE_DEFINITIONS[role as RoleCode]?.name ?? role}
                                  </Tag>
                                ))
                              ) : (
                                <span className="text-slate-400">Chưa gán vai trò</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {acc.departments.length > 0 ? (
                              <div className="space-y-0.5">
                                {acc.departments.map((d) => (
                                  <span
                                    key={d.department_id}
                                    className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
                                  >
                                    {d.department_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Tag tone={acc.is_active ? 'emerald' : 'rose'}>
                              {acc.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                            </Tag>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingAccount(acc)}
                                title="Sửa vai trò hoặc khóa/mở khóa tài khoản"
                              >
                                Sửa quyền
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLinkingAccount(acc)}
                                title="Liên kết tài khoản với nhân viên"
                                className="text-slate-600 hover:text-slate-900"
                              >
                                <LinkIcon className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Hiển thị trang {Math.floor(offset / limit) + 1}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(accounts.data?.length ?? 0) < limit}
                  onClick={() => setOffset(offset + limit)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: ORGANIZATION & ASSIGNMENTS */}
        <TabsContent value="organization" className="space-y-4 pt-2">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Active departments list */}
            <Card
              title="Phòng ban hoạt động"
              subtitle="Danh sách các phòng ban đang hoạt động trong toàn hệ thống trường học"
              right={
                <Button size="sm" onClick={() => setShowAssignmentModal(true)}>
                  <Plus className="mr-1 size-3.5" />
                  Tạo phân công
                </Button>
              }
            >
              {organization.isPending && (
                <p className="py-4 text-xs text-slate-500">Đang tải phòng ban…</p>
              )}
              {organization.isError && (
                <p className="py-4 text-xs text-rose-700">
                  {getApiErrorMessage(organization.error, 'Không thể tải cơ cấu tổ chức.')}
                </p>
              )}
              {organization.data?.departments && (
                <div className="divide-y rounded border">
                  {organization.data.departments.map((dept) => (
                    <div
                      key={dept.department_id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{dept.department_name}</p>
                        {dept.department_code && (
                          <p className="text-[11px] text-slate-500">Mã: {dept.department_code}</p>
                        )}
                      </div>
                      <Tag tone="emerald">Hoạt động</Tag>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Positions list */}
            <Card
              title="Danh mục chức vụ"
              subtitle="Các chức vụ nghiệp vụ phục vụ gán quyền và phân cấp trách nhiệm"
            >
              {organization.data?.positions && (
                <div className="divide-y rounded border">
                  {organization.data.positions.map((pos) => (
                    <div
                      key={pos.position_id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <p className="font-semibold text-slate-900">{pos.position_name}</p>
                      <span className="font-mono text-slate-500">ID #{pos.position_id}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Department accounts distribution from summary */}
          {summary.data && summary.data.departments.length > 0 && (
            <Card
              title="Tài khoản hoạt động có phân công theo phòng ban"
              subtitle="Số tài khoản tổng, đang hoạt động và số tài khoản hoạt động có phân công hiện hành theo phòng ban. Một tài khoản có thể xuất hiện ở nhiều phòng."
            >
              <div className="overflow-x-auto rounded border">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Phòng ban</th>
                      <th className="p-3 text-right">Số tài khoản đang phân công</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.data.departments.map((item) => (
                      <tr key={item.department_name} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{item.department_name}</td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {item.accounts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: DOMAIN OWNERS */}
        <TabsContent value="owners" className="pt-2">
          <DomainOwners canManage />
        </TabsContent>

        {/* TAB 4: AUDIT LOGS */}
        <TabsContent value="audit" className="space-y-4 pt-2">
          <Card
            title="Nhật ký kiểm toán bảo mật (IAM Audit Logs)"
            subtitle="Ghi nhận đăng nhập thành công, tạo tài khoản, đổi vai trò, khóa/mở khóa, liên kết hồ sơ và thêm phân công"
            right={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-events'] })}
              >
                <RefreshCw className="mr-1.5 size-3.5" />
                Làm mới
              </Button>
            }
          >
            {auditLogs.isPending && (
              <p className="py-6 text-center text-xs text-slate-500">Đang tải nhật ký kiểm toán…</p>
            )}
            {auditLogs.isError && (
              <p className="py-4 text-xs text-rose-700">
                {getApiErrorMessage(auditLogs.error, 'Không thể tải nhật ký kiểm toán.')}
              </p>
            )}
            {auditLogs.data?.length === 0 && !auditLogs.isPending && (
              <EmptyState
                title="Chưa có sự kiện kiểm toán"
                description="Các hành động liên quan đến tài khoản và quyền sẽ được ghi lại tại đây."
              />
            )}

            {auditLogs.data && auditLogs.data.length > 0 && (
              <div className="overflow-x-auto rounded border">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2.5">Thời điểm</th>
                      <th className="p-2.5">Người thực hiện</th>
                      <th className="p-2.5">Hành động</th>
                      <th className="p-2.5">Mã đối tượng</th>
                      <th className="p-2.5">Kết quả</th>
                      <th className="p-2.5">Chi tiết thay đổi / Mã lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.data.map((evt) => (
                      <tr key={evt.event_id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 text-slate-600">
                          {evt.occurred_at.slice(0, 19).replace('T', ' ')}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900">{evt.username}</td>
                        <td className="p-2.5">
                          {AUDIT_ACTIONS[evt.action] ?? evt.action}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {evt.target_id ? `#${evt.target_id}` : '—'}
                        </td>
                        <td className="p-2.5">
                          <Tag tone={evt.outcome === 'SUCCESS' ? 'emerald' : 'rose'}>
                            {evt.outcome === 'SUCCESS' ? 'Thành công' : 'Bị từ chối'}
                          </Tag>
                        </td>
                        <td className="p-2.5">
                          {evt.error_code && (
                            <code className="rounded bg-rose-50 px-1 py-0.5 text-rose-700">
                              {evt.error_code}
                            </code>
                          )}
                          {evt.changes && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[11px] text-indigo-600 hover:underline">
                                Xem thay đổi
                              </summary>
                              <pre className="mt-1 max-w-xs overflow-auto rounded bg-slate-100 p-2 text-[10px] text-slate-800">
                                {JSON.stringify(evt.changes, null, 2)}
                              </pre>
                            </details>
                          )}
                          {!evt.error_code && !evt.changes && '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Hiển thị trang {Math.floor(auditOffset / 20) + 1}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={auditOffset === 0}
                  onClick={() => setAuditOffset(Math.max(0, auditOffset - 20))}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(auditLogs.data?.length ?? 0) < 20}
                  onClick={() => setAuditOffset(auditOffset + 20)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: SESSIONS */}
        <TabsContent value="sessions" className="pt-2">
          <SessionsPanel />
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}
      <CreateAccountModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={handleAccountCreated}
      />

      <EditAccessModal
        account={editingAccount}
        currentUserId={user?.id}
        open={Boolean(editingAccount)}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        onSaved={handleAccountUpdated}
      />

      <LinkEmployeeModal
        account={linkingAccount}
        open={Boolean(linkingAccount)}
        onOpenChange={(open) => !open && setLinkingAccount(null)}
        onLinked={handleEmployeeLinked}
      />

      <CreateAssignmentModal
        open={showAssignmentModal}
        onOpenChange={setShowAssignmentModal}
        onCreated={handleAssignmentCreated}
      />
    </div>
  )
}
