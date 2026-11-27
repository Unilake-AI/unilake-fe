import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { API_AskNlq } from '@/api/shared/nlq'
import { DomainProvider } from '@/hooks/use-domain'

import { AskAiView } from './ask-ai-view'

vi.mock('@/api/shared/nlq', () => ({ API_AskNlq: vi.fn() }))

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

it('đưa gợi ý Nhân sự vào cuộc hội thoại và lưu câu hỏi trong lịch sử', async () => {
  localStorage.setItem('user', JSON.stringify({ user_id: 21 }))
  const user = userEvent.setup()
  const client = new QueryClient()
  vi.mocked(API_AskNlq)
    .mockResolvedValueOnce({
      answer: 'Có 35 nhân sự đang công tác.',
      sql: 'SELECT 35',
      rows: [{ total: 35 }],
    })
    .mockResolvedValueOnce({ answer: 'Có dữ liệu để đối chiếu.', sql: '', rows: [] })
  render(
    <QueryClientProvider client={client}>
      <DomainProvider role="HR_STAFF">
        <AskAiView workspace="STAFF" />
      </DomainProvider>
    </QueryClientProvider>
  )

  const suggestions = within(screen.getByRole('list', { name: 'Câu hỏi gợi ý' }))
  const question = 'Thống kê tổng số nhân sự đang công tác hiện tại'
  expect(suggestions.getAllByRole('button')).toHaveLength(3)
  expect(suggestions.getByRole('button', { name: 'Số nhân sự theo từng phòng ban?' })).toBeVisible()
  await user.click(suggestions.getByRole('button', { name: question }))
  expect(API_AskNlq).toHaveBeenCalledWith(question, 'STAFF')
  const conversation = within(screen.getByRole('log', { name: 'Cuộc hội thoại' }))
  expect(await conversation.findByText('Có 35 nhân sự đang công tác.')).toBeVisible()
  expect(conversation.getByRole('table')).toHaveTextContent('35')

  const composer = screen.getByRole('textbox', { name: 'Câu hỏi về dữ liệu' })
  await user.type(composer, 'So sánh với năm trước{Enter}')
  expect(API_AskNlq).toHaveBeenLastCalledWith('So sánh với năm trước', 'STAFF')
  expect(await conversation.findByText('Có dữ liệu để đối chiếu.')).toBeVisible()

  const history = within(screen.getByRole('complementary', { name: 'Điều khiển và lịch sử chat' }))
  const savedQuestion = history.getByRole('button', { name: question })
  expect(savedQuestion).toBeVisible()
  expect(history.queryByText('Lịch sử', { exact: true })).not.toBeInTheDocument()

  await user.click(history.getByRole('button', { name: 'Chat mới' }))
  expect(screen.queryByRole('log')).not.toBeInTheDocument()
  expect(composer).toHaveValue('')
  expect(savedQuestion).toBeVisible()

  await user.click(savedQuestion)
  expect(composer).toHaveValue(question)
  expect(API_AskNlq).toHaveBeenCalledTimes(2)
})
