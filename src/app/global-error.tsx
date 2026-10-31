'use client'

/**
 * Lỗi ở chính root layout. Thay toàn bộ layout nên phải tự có html/body và không dùng
 * provider hay CSS module của ứng dụng; chỉ dùng class Tailwind có sẵn trong globals.css.
 */
import '../styles/globals.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
          <h1 className="text-xl font-bold text-slate-900">UniLake AI tạm thời không khả dụng</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Ứng dụng gặp sự cố khi khởi động. Vui lòng tải lại trang sau ít phút.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Thử lại
          </button>
          {error.digest && (
            <p className="mt-4 font-mono text-xs text-slate-400">Mã tra cứu: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  )
}
