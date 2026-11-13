'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  CircleAlert,
  Clock,
  Eye,
  EyeOff,
  Info,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { API_SignIn } from '@/api/auth/client'
import { getApiErrorMessage } from '@/api/http'
import campus from '@/assets/login/ai-campus-composition.webp'
import aiLake from '@/assets/login/ai-data-lake-3d.png'
import aiLeavesLeft from '@/assets/login/ai-leaves-left.png'
import aiLeavesTop from '@/assets/login/ai-leaves-top-left.png'
import aiAmbient from '@/assets/login/ai-login-ambient.webp'
import aiSky from '@/assets/login/ai-sky-background.webp'
import officialMark from '@/assets/login/duy-tan-official-mark.png'
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

function UniversityBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? styles.cardUniversityLogo : styles.universityLogo}
      aria-label="Duy Tân University"
    >
      <Image src={officialMark} alt="" width={60} height={60} />
      <span>
        <strong>DUY TÂN</strong>
        <small>UNIVERSITY</small>
      </span>
    </div>
  )
}

function UniLakeMark() {
  return (
    <svg viewBox="0 0 44 42" width="36" height="36" aria-hidden="true" fill="currentColor">
      <ellipse cx="22" cy="8" rx="20" ry="7" />
      <path d="M2 17c5 4 12 6 20 6s15-2 20-6v5c0 5-9 8-20 8S2 27 2 22v-5Z" />
      <path d="M2 28c5 4 12 6 20 6s15-2 20-6v5c0 5-9 8-20 8S2 38 2 33v-5Z" />
    </svg>
  )
}

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
      const role = toRoleCode(data.user?.role)
      if (!role) {
        setServerError('Tài khoản chưa được gán vai trò phù hợp. Vui lòng liên hệ quản trị viên.')
        return
      }

      storeSession(data)

      const redirectPath = getDefaultHomeForRoles([role])

      router.push(redirectPath)
      router.refresh()
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
      <div className={styles.sky} aria-hidden="true">
        <Image src={aiSky} alt="" fill sizes="100vw" priority />
      </div>
      <div className={styles.ambient} aria-hidden="true">
        <Image src={aiAmbient} alt="" fill sizes="70vw" />
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
      <section className={styles.intro} aria-label="Giới thiệu UniLake AI">
        <div className={styles.brandRow}>
          <UniversityBrand />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.uniLakeBrand}>
            <span className={styles.databaseMark} aria-hidden="true">
              <UniLakeMark />
            </span>
            UniLake AI
          </span>
        </div>
        <div className={styles.introCopy}>
          <span className={styles.redRule} aria-hidden="true" />
          <h1>UniLake AI</h1>
          <p className={styles.introTagline}>
            Nền tảng Data Lake
            <br />
            cho Trường Đại học Duy Tân
          </p>
          <p className={styles.introDescription}>
            Gom dữ liệu từ các phòng ban, làm sạch và chuẩn hóa qua 3 tầng dữ liệu Bronze – Silver –
            Gold, kiểm soát chất lượng dữ liệu và hỗ trợ lãnh đạo ra quyết định bằng Hỏi AI.
          </p>
        </div>
        <ul className={styles.features} aria-label="Các tính năng chính">
          <li>
            <span className={styles.featureIcon}>
              <Layers3 size={21} />
            </span>
            <span>
              <strong>Tích hợp dữ liệu</strong>
              <small>Tuyển sinh · Đào tạo · Nhân sự</small>
            </span>
          </li>
          <li>
            <span className={styles.featureIcon}>
              <ShieldCheck size={21} />
            </span>
            <span>
              <strong>Dữ liệu tin cậy</strong>
              <small>Làm sạch & kiểm soát chất lượng</small>
            </span>
          </li>
          <li>
            <span className={styles.featureIcon}>
              <Sparkles size={21} />
            </span>
            <span>
              <strong>Hỏi AI thông minh</strong>
              <small>Tra cứu, phân tích và ra quyết định</small>
            </span>
          </li>
        </ul>
        <div className={styles.campus} aria-hidden="true">
          <Image src={campus} alt="" width={563} height={355} priority />
        </div>
      </section>
      <section className={styles.formArea} aria-label="Đăng nhập hệ thống">
        <div className={styles.card}>
          <header className={styles.cardBrand}>
            <div className={styles.cardBrandText}>
              <UniversityBrand compact />
              <span className={styles.cardLake}>
                <span className={styles.databaseMark} aria-hidden="true">
                  <UniLakeMark />
                </span>
                UniLake AI
              </span>
              <p>Nền tảng Data Lake cho Trường Đại học Duy Tân</p>
            </div>
            <div
              className={styles.lakeIllustration}
              aria-label="Ba tầng dữ liệu Gold, Silver, Bronze"
              role="img"
            >
              <Image
                className={styles.lakeArt}
                src={aiLake}
                alt=""
                width={190}
                height={190}
                sizes="190px"
              />
              <span className={styles.lakeGold}>Gold</span>
              <span className={styles.lakeSilver}>Silver</span>
              <span className={styles.lakeBronze}>Bronze</span>
            </div>
          </header>
          <div className={styles.cardDivider} />
          <div className={styles.formHeading}>
            <h2>Đăng nhập</h2>
            <p>Vui lòng đăng nhập bằng tài khoản công vụ của nhà trường.</p>
          </div>
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
                <UserRound size={17} aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
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
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
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
            <button type="submit" disabled={isSubmitting} className={styles.submit}>
              {isSubmitting ? (
                <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" />
              ) : (
                <LogIn size={18} aria-hidden="true" />
              )}
              {isSubmitting ? 'Đang xác thực…' : 'Đăng nhập'}
            </button>
          </form>
          <aside className={styles.notice}>
            <Info size={20} aria-hidden="true" />
            <span>
              <strong>Lưu ý</strong>
              <br />
              Sử dụng tài khoản được cấp bởi Trường Đại học Duy Tân. Nếu gặp vấn đề khi đăng nhập,
              vui lòng liên hệ Quản trị hệ thống.
            </span>
          </aside>
        </div>
      </section>
    </main>
  )
}
