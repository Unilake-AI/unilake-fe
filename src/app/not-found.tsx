import Link from 'next/link'

import { ErrorScreen, primaryActionClass } from '@/components/page/error-screen'

export const metadata = { title: 'Không tìm thấy trang | UniLake AI' }

export default function NotFound() {
  return (
    <ErrorScreen
      title="Không tìm thấy trang"
      description="Trang này có thể đã được chuyển hoặc xóa. Bạn có thể kiểm tra lại địa chỉ hoặc quay về trang chủ."
    >
      <Link href="/" className={primaryActionClass}>
        Về trang chủ
      </Link>
    </ErrorScreen>
  )
}
