import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import Cookies from 'js-cookie'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_SignIn } from '@/api/api_auth'
import type { LoginResponse } from '@/types/auth'

import { LoginView, loginSchema } from './login-view'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock('@/api/api_auth', () => ({
  API_SignIn: vi.fn(),
}))

const signIn = vi.mocked(API_SignIn)

function loginResponse(role: string): LoginResponse {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    user: { user_id: 1, username: 'admin', role },
  }
}

function axiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', { headers }, undefined, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data,
  })
}

async function fillAndSubmit(username: string, password: string) {
  const user = userEvent.setup()
  if (username) {
    await user.type(screen.getByLabelText('Email hoặc tên đăng nhập'), username)
  }
  if (password) {
    await user.type(screen.getByLabelText('Mật khẩu'), password)
  }
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  return user
}

describe('loginSchema', () => {
  it('chấp nhận tên đăng nhập hoặc email hợp lệ', () => {
    expect(loginSchema.safeParse({ username: 'admin', password: 'x' }).success).toBe(true)
    expect(loginSchema.safeParse({ username: 'a@dtu.edu.vn', password: 'x' }).success).toBe(true)
  })

  it('từ chối email sai định dạng và trường để trống', () => {
    expect(loginSchema.safeParse({ username: 'a@b', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ username: '   ', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ username: 'admin', password: '' }).success).toBe(false)
  })
})

describe('LoginView', () => {
  beforeEach(() => {
    signIn.mockReset()
    push.mockReset()
    refresh.mockReset()
    localStorage.clear()
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
  })

  it('báo phiên hết hạn khi bị chuyển về /login?expired=1', () => {
    window.history.pushState({}, '', '/login?expired=1')
    render(<LoginView />)
    expect(screen.getByRole('status')).toHaveTextContent('Phiên đăng nhập đã hết hạn')
    window.history.pushState({}, '', '/')
  })

  it('không báo phiên hết hạn khi vào trang đăng nhập bình thường', () => {
    render(<LoginView />)
    expect(screen.queryByText('Phiên đăng nhập đã hết hạn')).not.toBeInTheDocument()
  })

  it('báo lỗi từng trường khi để trống và không gọi API', async () => {
    render(<LoginView />)
    await fillAndSubmit('', '')

    expect(await screen.findByText('Vui lòng nhập tên đăng nhập hoặc email.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email hoặc tên đăng nhập')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(signIn).not.toHaveBeenCalled()
  })

  it('báo lỗi khi email sai định dạng', async () => {
    render(<LoginView />)
    await fillAndSubmit('admin@unilake', 'Password@123')

    expect(await screen.findByText('Email không đúng định dạng.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('đăng nhập thành công: lưu token và chuyển tới trang của vai trò', async () => {
    signIn.mockResolvedValueOnce(loginResponse('data_admin'))
    render(<LoginView />)
    await fillAndSubmit('  dataadmin ', 'Password@123')

    await waitFor(() => expect(push).toHaveBeenCalledWith('/data'))
    expect(signIn).toHaveBeenCalledWith({ username: 'dataadmin', password: 'Password@123' })
    expect(Cookies.get('access_token')).toBe('access-token')
    expect(Cookies.get('refresh_token')).toBe('refresh-token')
    expect(localStorage.getItem('access_token')).toBe('access-token')
    expect(JSON.parse(localStorage.getItem('user') ?? '{}')).toMatchObject({ username: 'admin' })
    expect(refresh).toHaveBeenCalled()
  })

  it('chuyển vai trò lạ về trang mặc định', async () => {
    signIn.mockResolvedValueOnce(loginResponse('unknown_role'))
    render(<LoginView />)
    await fillAndSubmit('someone', 'Password@123')

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1))
    expect(push.mock.calls[0]?.[0]).toMatch(/^\//)
  })

  it('hiện thông báo lỗi do backend trả về', async () => {
    signIn.mockRejectedValueOnce(
      axiosError(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sai tên đăng nhập hoặc mật khẩu.' },
      })
    )
    render(<LoginView />)
    await fillAndSubmit('admin', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent('Sai tên đăng nhập hoặc mật khẩu.')
    expect(push).not.toHaveBeenCalled()
    expect(Cookies.get('access_token')).toBeUndefined()
  })

  it('dùng thông báo mặc định khi backend không gửi nội dung lỗi', async () => {
    signIn.mockRejectedValueOnce(axiosError(500, {}))
    render(<LoginView />)
    await fillAndSubmit('admin', 'Password@123')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tên đăng nhập hoặc mật khẩu chưa đúng'
    )
  })

  it('báo không kết nối được khi lỗi không đến từ HTTP', async () => {
    signIn.mockRejectedValueOnce(new Error('boom'))
    render(<LoginView />)
    await fillAndSubmit('admin', 'Password@123')

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối đến máy chủ')
  })

  it('khoá nút và hiện trạng thái đang xác thực khi đang gửi', async () => {
    let resolve: (value: LoginResponse) => void = () => undefined
    signIn.mockReturnValueOnce(
      new Promise<LoginResponse>((r) => {
        resolve = r
      })
    )
    render(<LoginView />)
    await fillAndSubmit('admin', 'Password@123')

    const button = await screen.findByRole('button', { name: /Đang xác thực/ })
    expect(button).toBeDisabled()

    resolve(loginResponse('admin'))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin'))
  })

  it('đóng được thông báo lỗi', async () => {
    signIn.mockRejectedValueOnce(new Error('boom'))
    render(<LoginView />)
    const user = await fillAndSubmit('admin', 'Password@123')

    await user.click(await screen.findByRole('button', { name: 'Đóng thông báo lỗi' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('bật/tắt hiển thị mật khẩu', async () => {
    const user = userEvent.setup()
    render(<LoginView />)
    const password = screen.getByLabelText('Mật khẩu')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }))
    expect(password).toHaveAttribute('type', 'password')
  })
})
