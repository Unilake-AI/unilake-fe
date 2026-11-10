'use client'

import Link from 'next/link'

import { RefreshCw } from 'lucide-react'

import {
  ErrorScreen,
  primaryActionClass,
  secondaryActionClass,
} from '@/components/page/error-screen'

/** Lỗi bất ngờ khi hiển thị trang: báo thân thiện, không hiện stack trace. */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      title="Đã có lỗi khi hiển thị trang"
      description="Vui lòng thử lại. Nếu trang vẫn không mở được, hãy liên hệ quản trị viên."
    >
      <button type="button" onClick={reset} className={primaryActionClass}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Thử lại
      </button>
      <Link href="/" className={secondaryActionClass}>
        Về trang chủ
      </Link>
    </ErrorScreen>
  )
}
