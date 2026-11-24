import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { getMenuItemsForRole } from '@/config/menu'
import { ROLE_PRIORITY } from '@/config/roles'

import { Sidebar } from './sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/staff/quality-issues/42',
}))

vi.mock('./domain-selector', () => ({
  DomainSelector: () => null,
}))

describe('Sidebar', () => {
  it.each(ROLE_PRIORITY)('hiển thị các mục menu của %s mà không có tiêu đề nhóm', async (role) => {
    const user = userEvent.setup()
    render(<Sidebar role={role} />)
    await user.click(screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' }))

    const navigation = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }))
    expect(navigation.queryByRole('heading', { hidden: true })).not.toBeInTheDocument()
    expect(navigation.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      getMenuItemsForRole(role).map((item) => item.href)
    )
  })

  it('thu gọn bằng Escape và trả focus về nút mở rộng', async () => {
    const user = userEvent.setup()
    render(<Sidebar role="HR_STAFF" />)

    const toggle = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' })
    await user.click(toggle)
    expect(toggle).toHaveAccessibleName('Thu gọn thanh điều hướng')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const activeLink = screen.getByRole('link', { name: 'Yêu cầu xử lý dữ liệu lỗi' })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
    activeLink.focus()
    await user.keyboard('{Escape}')

    expect(toggle).toHaveAccessibleName('Mở rộng thanh điều hướng')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })
})
