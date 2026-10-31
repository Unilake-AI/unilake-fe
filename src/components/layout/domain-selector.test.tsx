import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { DOMAIN_STORAGE_KEY } from '@/config/domains'
import { DomainProvider } from '@/hooks/use-domain'

import { DomainSelector } from './domain-selector'

function renderSelector() {
  return render(
    <DomainProvider>
      <DomainSelector />
    </DomainProvider>
  )
}

describe('DomainSelector', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('starts on "Tất cả phân hệ" and lists the three V1.0 domains', async () => {
    const user = userEvent.setup()
    renderSelector()

    const trigger = screen.getByRole('button', { name: 'Chọn phân hệ nghiệp vụ' })
    expect(trigger).toHaveTextContent('Tất cả phân hệ')

    await user.click(trigger)

    expect(await screen.findByRole('menuitem', { name: /Tuyển sinh/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Đào tạo/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Nhân sự/ })).toBeInTheDocument()
  })

  it('switches the domain on the trigger and remembers it for the session', async () => {
    const user = userEvent.setup()
    renderSelector()

    await user.click(screen.getByRole('button', { name: 'Chọn phân hệ nghiệp vụ' }))
    await user.click(await screen.findByRole('menuitem', { name: /Nhân sự/ }))

    expect(screen.getByRole('button', { name: 'Chọn phân hệ nghiệp vụ' })).toHaveTextContent(
      'Nhân sự'
    )
    expect(window.sessionStorage.getItem(DOMAIN_STORAGE_KEY)).toBe('hr')
  })

  it('restores the stored domain on mount', async () => {
    window.sessionStorage.setItem(DOMAIN_STORAGE_KEY, 'academic')
    renderSelector()

    expect(await screen.findByText('Đào tạo')).toBeInTheDocument()
  })
})
