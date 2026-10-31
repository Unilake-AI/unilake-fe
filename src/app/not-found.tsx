import Link from 'next/link'

import { ErrorScreen, primaryActionClass } from '@/components/page/error-screen'

export const metadata = { title: 'Không tìm thấy trang | UniLake AI' }

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc đã được chuyển. Kiểm tra lại địa chỉ, hoặc quay về trang chủ theo vai trò của bạn."
    >
      <Link href="/" className={primaryActionClass}>
        Về trang chủ
      </Link>
    </ErrorScreen>
  )
}
