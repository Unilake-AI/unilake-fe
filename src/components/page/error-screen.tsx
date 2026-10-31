import type { ReactNode } from 'react'

import { Layers } from 'lucide-react'

/** Khung toàn màn hình cho trang lỗi và trang 404 (không dùng app shell vì có thể chưa đăng nhập). */
export function ErrorScreen({
  code,
  title,
  description,
  children,
}: {
  code: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Layers className="size-5" aria-hidden="true" />
        </div>
        <span className="text-lg font-bold text-slate-900">UniLake AI</span>
      </div>
      <p className="mt-8 font-mono text-5xl font-bold text-indigo-600">{code}</p>
      <h1 className="mt-3 text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div>
    </main>
  )
}

export const primaryActionClass =
  'inline-flex h-9 items-center gap-1.5 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

export const secondaryActionClass =
  'inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
