'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { ArrowRight, CircleAlert, Clock, Eye, EyeOff, Layers, LoaderCircle, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { API_SignIn } from '@/api/api_auth'
import { getDefaultHomeForRoles } from '@/config/roles'
import { SESSION_EXPIRED_PARAM, storeSession } from '@/lib/session'
import type { ApiErrorBody, LoginFormValues, RoleCode } from '@/types/auth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên đăng nhập hoặc email.')
    .refine((value) => !value.includes('@') || EMAIL_PATTERN.test(value), {
      message: 'Email không đúng định dạng.',
    }),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
})

const DEFAULT_LOGIN_ERROR = 'Tên đăng nhập hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.'

const fieldClass =
  'h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2'
const fieldOk = 'border-slate-300 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30'
const fieldInvalid =
  'border-2 border-rose-500 bg-rose-50 focus-visible:border-rose-500 focus-visible:ring-rose-500/30'

export function LoginView() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Bị đưa về đây vì token hết hạn (/login?expired=1): báo cho người dùng biết lý do.
  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).has(SESSION_EXPIRED_PARAM))
  }, [])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    setSessionExpired(false)
    try {
      const data = await API_SignIn(values)

      storeSession(data)

      const role = data.user?.role?.toUpperCase() as RoleCode | undefined
      const userRoles: RoleCode[] = role ? [role] : ['VIEWER']
      const redirectPath = getDefaultHomeForRoles(userRoles)

      router.push(redirectPath)
      router.refresh()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as ApiErrorBody | undefined
        setServerError(body?.error?.message ?? body?.detail ?? body?.message ?? DEFAULT_LOGIN_ERROR)
      } else {
        setServerError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-white lg:grid lg:grid-cols-[2fr_3fr]">
      <section
        className="flex flex-col justify-between gap-6 bg-slate-900 px-6 py-8 lg:px-14 lg:py-12"
        aria-label="Giới thiệu UniLake AI"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Layers className="size-5" />
          </div>
          <span className="text-lg font-bold text-white">UniLake AI</span>
          <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-px font-mono text-[10px] font-bold text-indigo-700">
            v1.0
          </span>
        </div>

        <div className="space-y-5">
          <p className="hidden font-mono text-[10px] font-medium uppercase tracking-widest text-indigo-200 lg:block">
            Data lake đa nguồn · AI Analytics
          </p>
          <h1 className="text-2xl font-bold leading-tight text-white lg:text-[34px] lg:leading-[42px]">
            Dữ liệu quản trị đại học, hỏi bằng ngôn ngữ tự nhiên.
          </h1>
          <p className="hidden text-sm leading-6 text-slate-400 lg:block">
            Tích hợp dữ liệu Tuyển sinh, Đào tạo và Nhân sự trên kiến trúc Bronze – Silver – Gold,
            có quản trị chất lượng và truy vết nguồn gốc.
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Các phân hệ dữ liệu">
            {['Tuyển sinh', 'Đào tạo', 'Nhân sự'].map((domain) => (
              <li
                key={domain}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200"
              >
                {domain}
              </li>
            ))}
          </ul>
          <ol
            className="hidden flex-wrap items-center gap-2 lg:flex"
            aria-label="Luồng xử lý dữ liệu"
          >
            {['Nguồn', 'Bronze', 'Silver', 'Gold'].map((layer, index) => (
              <li key={layer} className="flex items-center gap-2">
                {index > 0 && <ArrowRight className="size-3.5 text-slate-500" aria-hidden="true" />}
                <span
                  className={`rounded-md bg-slate-800 px-2.5 py-1 font-mono text-[11px] font-bold ${
                    layer === 'Bronze' || layer === 'Gold' ? 'text-amber-500' : 'text-slate-300'
                  }`}
                >
                  {layer}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden font-mono text-[10px] font-medium text-slate-500 lg:block">
          Phiên bản 1.0 · Capstone C1SE.11 · Đại học Duy Tân
        </p>
      </section>

      <section className="flex flex-1 items-start justify-center px-6 py-8 lg:items-center">
        <div className="w-full max-w-[400px] space-y-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-indigo-600">
            Cổng truy cập
          </p>
          <header className="space-y-1">
            <h2 className="text-[26px] font-bold leading-8 text-slate-900">Đăng nhập</h2>
            <p className="text-[13px] leading-5 text-slate-500">
              Dùng tài khoản của trường để truy cập hệ thống.
            </p>
          </header>

          {sessionExpired && !serverError && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <Clock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-800">Phiên đăng nhập đã hết hạn</p>
                <p className="text-xs leading-[17px] text-slate-700">
                  Vui lòng đăng nhập lại để tiếp tục làm việc.
                </p>
              </div>
            </div>
          )}

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-700" aria-hidden="true" />
              <div className="flex-1 space-y-0.5">
                <p className="text-xs font-bold text-rose-700">Đăng nhập không thành công</p>
                <p className="text-xs leading-[17px] text-slate-700">{serverError}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng thông báo lỗi"
                onClick={() => setServerError(null)}
                className="rounded p-0.5 text-rose-700 hover:bg-rose-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          >
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700">
                Email hoặc tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="tenban@university.edu.vn"
                aria-invalid={errors.username ? true : undefined}
                aria-describedby={errors.username ? 'username-error' : undefined}
                className={`${fieldClass} ${errors.username ? fieldInvalid : fieldOk}`}
                {...register('username')}
              />
              {errors.username && (
                <p id="username-error" className="text-xs text-rose-600">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`${fieldClass} pr-10 ${errors.password ? fieldInvalid : fieldOk}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-1 top-1 flex size-8 items-center justify-center rounded text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-rose-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300 accent-indigo-600"
                />
                Ghi nhớ đăng nhập
              </label>
              <a
                href="#forgot-password"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-600/70"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? 'Đang xác thực…' : 'Đăng nhập'}
            </button>
          </form>

          <p className="text-[11px] leading-4 text-slate-500">
            Quyền truy cập được cấp theo vai trò. Liên hệ Quản trị Hệ thống nếu bị từ chối.
          </p>
        </div>
      </section>
    </main>
  )
}
