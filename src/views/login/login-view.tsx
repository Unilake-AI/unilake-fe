'use client'

import { useEffect, useState, useTransition } from 'react'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Clock, Eye, EyeOff, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { API_SignIn } from '@/api/auth/client'
import { getApiErrorMessage } from '@/api/http'
import campus from '@/assets/login/ai-campus-composition.webp'
import aiLeavesLeft from '@/assets/login/ai-leaves-left.png'
import aiLeavesTop from '@/assets/login/ai-leaves-top-left.png'
import aiAmbient from '@/assets/login/ai-login-ambient.webp'
import aiSky from '@/assets/login/ai-sky-background.webp'
import { DatabaseLoader, PendingOverlay } from '@/components/page/page-parts'
import { getDefaultHomeForRoles, toRoleCode } from '@/config/roles'
import { SESSION_EXPIRED_PARAM, storeSession } from '@/lib/session'
import type { LoginFormValues } from '@/types/auth'

import styles from './login-view.module.css'

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

export function LoginView() {
  const router = useRouter()
  const [isNavigating, startNavigation] = useTransition()
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
  const isSigningIn = isSubmitting || isNavigating

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    setSessionExpired(false)
    try {
      const data = await API_SignIn(values)
      const role = toRoleCode(data.user?.role)
      if (!role) {
        setServerError('Tài khoản chưa được gán vai trò phù hợp. Vui lòng liên hệ quản trị viên.')
        return
      }

      storeSession(data)

      const redirectPath = getDefaultHomeForRoles([role])

      startNavigation(() => {
        router.push(redirectPath)
        router.refresh()
      })
    } catch (err: unknown) {
      setServerError(
        getApiErrorMessage(
          err,
          'Không thể đăng nhập lúc này. Vui lòng thử lại.',
          DEFAULT_LOGIN_ERROR
        )
      )
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        <Image src={aiSky} alt="" fill sizes="60vw" />
      </div>
      <div className={styles.ambient} aria-hidden="true">
        <Image src={aiAmbient} alt="" fill sizes="50vw" />
      </div>
      <Image
        className={styles.leavesTop}
        src={aiLeavesTop}
        alt=""
        width={230}
        height={250}
        aria-hidden="true"
      />
      <Image
        className={styles.leavesSide}
        src={aiLeavesLeft}
        alt=""
        width={230}
        height={250}
        aria-hidden="true"
      />
      <Image
        className={styles.waves}
        src="/login/waves.svg"
        alt=""
        width={720}
        height={180}
        aria-hidden="true"
      />
      <Image
        className={`${styles.waves} ${styles.wavesTop}`}
        src="/login/waves.svg"
        alt=""
        width={720}
        height={180}
        aria-hidden="true"
      />
      <div className={styles.panel}>
        <section className={styles.intro} aria-label="Giới thiệu UniLake AI">
          <div className={styles.cover} aria-hidden="true">
            <Image src={campus} alt="" fill sizes="(max-width: 680px) 100vw, 570px" priority />
          </div>
          <div className={styles.introCopy}>
            <p className={styles.introTagline}>Nền tảng Data Lake</p>
            <p className={styles.introDescription}>
              Tích hợp, chuẩn hóa và tra cứu dữ liệu Tuyển sinh, Đào tạo và Nhân sự.
            </p>
          </div>
        </section>
        <section className={styles.formArea} aria-label="Đăng nhập hệ thống">
          <div className={styles.brand}>
            <Image className={styles.brandLogo} src="/logo.png" alt="" width={44} height={44} />
            <span>UniLake AI</span>
          </div>
          <div className={styles.formContent}>
            <header className={styles.formHeading}>
              <h1>Đăng nhập</h1>
              <p>Dùng tài khoản do Trường Đại học Duy Tân cấp.</p>
            </header>
            <div className={styles.formBody}>
              {sessionExpired && !serverError && (
                <div role="status" className={styles.statusBox}>
                  <Clock size={18} aria-hidden="true" />
                  <span>
                    <strong>Phiên đăng nhập đã hết hạn</strong>
                    <br />
                    Vui lòng đăng nhập lại để tiếp tục làm việc.
                  </span>
                </div>
              )}
              {serverError && (
                <div role="alert" className={styles.errorBox}>
                  <CircleAlert size={18} aria-hidden="true" />
                  <span>
                    <strong>Đăng nhập không thành công</strong>
                    <br />
                    {serverError}
                  </span>
                  <button
                    type="button"
                    aria-label="Đóng thông báo lỗi"
                    onClick={() => setServerError(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <form
                noValidate
                className={styles.form}
                onSubmit={(event) => void handleSubmit(onSubmit)(event)}
              >
                <div className={styles.field}>
                  <label htmlFor="username">Tên đăng nhập hoặc email</label>
                  <div className={styles.inputWrap}>
                    <input
                      id="username"
                      readOnly={isSigningIn}
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="Nhập tên đăng nhập hoặc email"
                      aria-invalid={errors.username ? true : undefined}
                      aria-describedby={errors.username ? 'username-error' : undefined}
                      {...register('username')}
                    />
                  </div>
                  {errors.username && (
                    <p id="username-error" className={styles.fieldError} role="alert">
                      {errors.username.message}
                    </p>
                  )}
                </div>
                <div className={styles.field}>
                  <label htmlFor="password">Mật khẩu</label>
                  <div className={styles.inputWrap}>
                    <input
                      id="password"
                      readOnly={isSigningIn}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      disabled={isSigningIn}
                      onClick={() => setShowPassword((current) => !current)}
                      aria-controls="password"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className={styles.fieldError} role="alert">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSigningIn}
                  aria-busy={isSigningIn}
                  className={styles.submit}
                >
                  {isSigningIn && <DatabaseLoader compact />}
                  {isSigningIn ? 'Đang xác thực…' : 'Đăng nhập'}
                </button>
              </form>
            </div>
            <aside className={styles.notice}>
              <span>
                <strong>Cần hỗ trợ?</strong> Liên hệ quản trị hệ thống nếu bạn gặp sự cố về tài
                khoản.
              </span>
            </aside>
          </div>
        </section>
      </div>
      {isSigningIn && (
        <PendingOverlay
          label="Đang đăng nhập…"
          description="Đang kết nối với hệ thống UniLake AI."
        />
      )}
    </main>
  )
}
