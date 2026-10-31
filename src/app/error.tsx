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
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorScreen
      code="Lỗi"
      title="Đã có lỗi khi hiển thị trang"
      description="Hệ thống gặp sự cố ngoài dự kiến. Bạn thử tải lại trang; nếu vẫn lỗi, gửi mã tra cứu bên dưới cho Quản trị Hệ thống."
    >
      <button type="button" onClick={reset} className={primaryActionClass}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Thử lại
      </button>
      <Link href="/" className={secondaryActionClass}>
        Về trang chủ
      </Link>
      {error.digest && (
        <p className="w-full pt-2 font-mono text-xs text-slate-400">Mã tra cứu: {error.digest}</p>
      )}
    </ErrorScreen>
  )
}
