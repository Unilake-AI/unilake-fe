import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Cookies from 'js-cookie'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearStoredSession, redirectToLoginExpired } from '@/lib/session'

import AppError from './error'
import NotFound from './not-found'

describe('AppError', () => {
  it('báo lỗi thân thiện, không lộ nội dung lỗi gốc, cho thử lại', async () => {
    const reset = vi.fn()
    const error = Object.assign(new Error('TypeError: x is undefined at foo.tsx:12'), {
      digest: 'abc123',
    })
    render(<AppError error={error} reset={reset} />)

    expect(
      screen.getByRole('heading', { name: 'Đã có lỗi khi hiển thị trang' })
    ).toBeInTheDocument()
    expect(screen.getByText('Mã tra cứu: abc123')).toBeInTheDocument()
    expect(screen.queryByText(/TypeError/)).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
  })
})

describe('NotFound', () => {
  it('hiện trang 404 có đường về trang chủ', () => {
    render(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
  })
})

describe('session helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('xoá token và thông tin người dùng đã lưu', () => {
    Cookies.set('access_token', 'a')
    Cookies.set('refresh_token', 'b')
    localStorage.setItem('access_token', 'a')
    localStorage.setItem('user', '{}')

    clearStoredSession()

    expect(Cookies.get('access_token')).toBeUndefined()
    expect(Cookies.get('refresh_token')).toBeUndefined()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('chuyển về /login?expired=1, trừ khi đang ở trang đăng nhập', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { pathname: '/data', assign })
    redirectToLoginExpired()
    expect(assign).toHaveBeenCalledWith('/login?expired=1')

    assign.mockReset()
    vi.stubGlobal('location', { pathname: '/login', assign })
    redirectToLoginExpired()
    expect(assign).not.toHaveBeenCalled()
  })
})
