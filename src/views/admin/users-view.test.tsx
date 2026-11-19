import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as adminClient from '@/api/admin/client'
import * as domainOwnersApi from '@/api/shared/domain-owners'
import { useAuth } from '@/hooks/use-auth'

import { UsersView } from './users-view'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/api/admin/client', () => ({
  listAccounts: vi.fn(),
  getAccountSummary: vi.fn(),
  createAccount: vi.fn(),
  updateAccountAccess: vi.fn(),
  getOrganization: vi.fn(),
  listEmployees: vi.fn(),
  linkEmployee: vi.fn(),
  createAssignment: vi.fn(),
  listAuditEvents: vi.fn(),
  listDomainOwnerAuditEvents: vi.fn(),
  parseValidationErrors: vi.fn(),
}))

vi.mock('@/api/shared/domain-owners', () => ({
  listDomainOwnerGrants: vi.fn(),
  grantDomainOwner: vi.fn(),
  revokeDomainOwner: vi.fn(),
}))

describe('UsersView (Trang quản trị tài khoản và phân quyền)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, username: 'admin.main', fullName: 'Quản trị viên' } as any,
      roles: ['ADMIN', 'DATA_ADMIN'],
      primaryRole: 'ADMIN',
      isAuthenticated: true,
      isLoading: false,
      isError: false,
      isSuperAdmin: true,
      hasRole: (r: string) => r === 'ADMIN' || r === 'DATA_ADMIN',
      hasAnyRole: () => true,
      logout: vi.fn(),
      isLoggingOut: false,
    })

    vi.mocked(adminClient.getAccountSummary).mockResolvedValue({
      total: 15,
      active: 13,
      departments: [
        { department_name: 'Phòng Tuyển sinh', accounts: 5 },
        { department_name: 'Phòng Đào tạo', accounts: 4 },
        { department_name: 'Phòng Nhân sự', accounts: 4 },
      ],
    })

    vi.mocked(adminClient.listAccounts).mockResolvedValue([
      {
        user_id: 1,
        username: 'admin.main',
        full_name: 'Quản trị viên chính',
        is_active: true,
        roles: ['ADMIN', 'DATA_ADMIN'],
        departments: [{ department_id: 1, department_name: 'Phòng CNTT' }],
        employee_id: 10,
      },
      {
        user_id: 2,
        username: 'manager.ts',
        full_name: 'Trưởng phòng Tuyển sinh',
        is_active: true,
        roles: ['ADMISSIONS_MANAGER'],
        departments: [{ department_id: 2, department_name: 'Phòng Tuyển sinh' }],
        employee_id: 20,
      },
    ])

    vi.mocked(adminClient.getOrganization).mockResolvedValue({
      departments: [
        { department_id: 1, department_code: 'CNTT', department_name: 'Phòng CNTT', is_active: true },
        { department_id: 2, department_code: 'TS', department_name: 'Phòng Tuyển sinh', is_active: true },
      ],
      positions: [
        { position_id: 1, position_code: 'TP', position_name: 'Trưởng phòng' },
        { position_id: 2, position_code: 'NV', position_name: 'Nhân viên' },
      ],
    })

    vi.mocked(domainOwnersApi.listDomainOwnerGrants).mockResolvedValue([
      {
        grant_id: 'grant-ts-1234',
        domain: 'admissions',
        user_id: 2,
      },
    ])

    vi.mocked(adminClient.listAuditEvents).mockResolvedValue([
      {
        event_id: 101,
        occurred_at: '2026-11-19T10:00:00Z',
        username: 'admin.main',
        action: 'ACCOUNT_CREATED',
        target_id: 2,
        outcome: 'SUCCESS',
        changes: { username: 'manager.ts', roles: ['ADMISSIONS_MANAGER'] },
        error_code: null,
      },
    ])
  })

  function renderView() {
    return render(
      <QueryClientProvider client={queryClient}>
        <UsersView />
      </QueryClientProvider>
    )
  }

  it('hiển thị đầy đủ tổng quan KPI và nút chuyển không gian làm việc khi có cả ADMIN và DATA_ADMIN', async () => {
    renderView()

    expect(await screen.findByText('Quản trị tài khoản & Phân quyền')).toBeInTheDocument()
    expect(screen.getByText('Không gian làm việc kép')).toBeInTheDocument()
    expect(screen.getByText(/Chuyển sang Quản trị Dữ liệu/i)).toBeInTheDocument()

    // KPI cards (chờ summary query hoàn tất)
    expect(await screen.findByText('Tổng số tài khoản')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('Đã khóa')).toBeInTheDocument()
  })

  it('hiển thị danh sách tài khoản với vai trò, phòng ban và trạng thái', async () => {
    renderView()

    expect(await screen.findByText('admin.main')).toBeInTheDocument()
    expect(screen.getByText('manager.ts')).toBeInTheDocument()
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0)
  })

  it('mở modal tạo tài khoản và cho phép tạo tài khoản mới', async () => {
    vi.mocked(adminClient.createAccount).mockResolvedValue({ user_id: 99 })

    renderView()

    const createBtn = screen.getByRole('button', { name: /Tạo tài khoản mới/i })
    fireEvent.click(createBtn)

    expect(await screen.findByText('Tạo tài khoản người dùng mới')).toBeInTheDocument()

    const usernameInput = screen.getByPlaceholderText(/nguyen.van.a/i)
    const passwordInput = screen.getByPlaceholderText(/ít nhất 12 ký tự/i)

    fireEvent.change(usernameInput, { target: { value: 'staff.academic' } })
    fireEvent.change(passwordInput, { target: { value: 'SecretPassword123' } })

    // Chọn role
    const staffRoleBtn = screen.getByText('Nhân viên Đào tạo')
    fireEvent.click(staffRoleBtn)

    const submitBtn = screen.getByRole('button', { name: /Xác nhận tạo tài khoản/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(adminClient.createAccount).toHaveBeenCalledWith(
        'staff.academic',
        'SecretPassword123',
        ['ACADEMIC_STAFF']
      )
    })
  })

  it('bảo vệ tài khoản quản trị khi tự sửa: chặn tự gỡ ADMIN và chặn tự khóa', async () => {
    renderView()

    // Nhấn "Sửa quyền" trên dòng tài khoản của chính mình (admin.main - ID 1)
    const editButtons = await screen.findAllByRole('button', { name: /Sửa quyền/i })
    fireEvent.click(editButtons[0]!)

    expect(await screen.findByText(/Bạn đang chỉnh sửa chính tài khoản của mình/i)).toBeInTheDocument()

    // Checkbox vai trò ADMIN bị disabled
    const adminCheckbox = screen.getAllByRole('checkbox').find((cb: any) =>
      cb.closest('button')?.textContent?.includes('Quản trị Hệ thống')
    )
    expect(adminCheckbox).toBeDisabled()

    // Checkbox hoạt động cũng bị disabled
    const activeSwitch = screen.getAllByRole('checkbox').find((cb: any) =>
      cb.closest('div')?.textContent?.includes('Trạng thái hoạt động')
    )
    expect(activeSwitch).toBeDisabled()
  })

  it('cho phép chuyển tab sang Cơ cấu tổ chức & Phân công và Domain Owner', async () => {
    renderView()

    // Chuyển sang tab Cơ cấu tổ chức
    const orgTab = screen.getByRole('tab', { name: /Cơ cấu tổ chức/i })
    fireEvent.click(orgTab)

    expect(await screen.findByText('Phòng ban hoạt động')).toBeInTheDocument()
    expect(await screen.findByText('Phòng CNTT')).toBeInTheDocument()

    // Chuyển sang tab Domain Owner
    const ownersTab = screen.getByRole('tab', { name: /Domain Owner/i })
    fireEvent.click(ownersTab)

    expect(
      await screen.findByRole('heading', { name: 'Người phụ trách lĩnh vực (Domain Owner)' })
    ).toBeInTheDocument()
    expect(await screen.findByText(/grant-ts…1234/i)).toBeInTheDocument()
  })

  it('cho phép xem tab Nhật ký kiểm toán IAM', async () => {
    renderView()

    const auditTab = screen.getByRole('tab', { name: /Nhật ký kiểm toán/i })
    fireEvent.click(auditTab)

    expect(await screen.findByText('Nhật ký kiểm toán bảo mật (IAM Audit Logs)')).toBeInTheDocument()
    expect(await screen.findByText('Tạo tài khoản')).toBeInTheDocument()
    expect(screen.getByText('Thành công')).toBeInTheDocument()
  })
})
