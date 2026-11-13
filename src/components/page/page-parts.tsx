import type { ReactNode } from 'react'

import Image from 'next/image'
import type { StaticImageData } from 'next/image'

import {
  CheckCircle2,
  ChartNoAxesCombined,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  FileClock,
  FileWarning,
  GitBranch,
  Layers3,
  LoaderCircle,
  Network,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  UploadCloud,
  UsersRound,
} from 'lucide-react'

import emptyData from '@/assets/dashboard/empty-data.webp'
import campusArtwork from '@/assets/login/duy-tan-campus-source.png'
import { cn } from '@/lib/utils'
import type { StatusTone } from '@/types/page/page-parts'

/** Biểu tượng của từng nhóm trang, dùng chung cho ba phân hệ phòng ban. */
function getPageIcon(title: string) {
  if (/người dùng|phân quyền|hồ sơ cá nhân/i.test(title)) return UsersRound
  if (/nhật ký|lịch sử|phiên đăng nhập/i.test(title)) return FileClock
  if (/cấu hình|profiles|settings/i.test(title)) return Settings2
  if (/lineage|truy vết/i.test(title)) return GitBranch
  if (/quarantine|lỗi|chất lượng|quality/i.test(title)) return FileWarning
  if (/nguồn dữ liệu|bộ dữ liệu|catalog|silver|bronze/i.test(title)) return Layers3
  if (/nạp dữ liệu|ingestion|upload/i.test(title)) return UploadCloud
  if (/worker|pipeline|làm sạch|cleaning/i.test(title)) return Network
  if (/khám phá|tìm kiếm/i.test(title)) return Search
  if (/hỏi ai|nlq/i.test(title)) return Sparkles
  if (/tổng quan|dashboard|bảng điều khiển|phân tích|so sánh|điều hành/i.test(title))
    return ChartNoAxesCombined
  return Database
}

/** Khung trang theo Figma: breadcrumb, biểu tượng, tiêu đề, mô tả và thao tác. */
export function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
  illustration,
}: {
  breadcrumb: string[]
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Hình minh hoạ đặt ở góc phải (vd. robot ở trang Hỏi AI); thay cho ảnh khuôn viên. */
  illustration?: StaticImageData
}) {
  const Icon = getPageIcon(title)
  const isOverview = /tổng quan|dashboard|điều hành/i.test(title)
  return (
    <header className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[#e5e9f5] bg-[radial-gradient(circle_at_88%_15%,rgba(210,221,255,.72),transparent_34%),linear-gradient(110deg,#fff_0%,#f5f6ff_100%)] p-5 shadow-[0_8px_24px_rgba(31,43,83,.045)] sm:px-6 lg:min-h-[145px] lg:flex-row lg:items-end lg:justify-between">
      {illustration ? (
        <Image
          src={illustration}
          alt=""
          aria-hidden="true"
          width={260}
          height={260}
          priority
          className="pointer-events-none absolute -bottom-16 right-0 hidden h-auto w-44 object-contain sm:right-7 sm:block sm:w-56"
        />
      ) : (
        isOverview && (
          <Image
            src={campusArtwork}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[45%] object-cover object-center opacity-[.13] [mask-image:linear-gradient(to_right,transparent,black_45%)] lg:block"
          />
        )
      )}
      <div
        className={cn(
          'relative z-10 min-w-0 space-y-3',
          illustration && 'sm:max-w-[calc(100%-15rem)]'
        )}
      >
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#63708d]">
            {breadcrumb.map((item, index) => (
              <li key={`${item}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
                <span
                  className={
                    index === breadcrumb.length - 1 ? 'font-semibold text-[#ad1830]' : undefined
                  }
                >
                  {item}
                </span>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9eaff] text-[#514cf2] shadow-[inset_0_0_0_1px_rgba(94,89,232,.08)] sm:size-12">
            <Icon className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[#0f1831] sm:text-[30px]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#596884]">{description}</p>
            )}
          </div>
        </div>
      </div>
      {actions && (
        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  )
}

export function Card({
  title,
  subtitle,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-[#dfe4f2] bg-white shadow-[0_8px_24px_rgba(31,43,83,.055)]',
        className
      )}
    >
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e5e9f3] px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-[#111a35]">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-[#65718d]">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: StatusTone
}) {
  const Icon =
    tone === 'emerald'
      ? CheckCircle2
      : tone === 'amber'
        ? Clock3
        : tone === 'rose'
          ? CircleAlert
          : Database
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#dfe4f2] bg-white p-5 shadow-[0_8px_24px_rgba(31,43,83,.055)]">
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -bottom-12 -right-12 size-32 rounded-full blur-2xl',
          {
            'bg-[#e5e7ff]': tone === 'indigo' || tone === 'slate',
            'bg-[#dcf8e5]': tone === 'emerald',
            'bg-[#fff0d4]': tone === 'amber',
            'bg-[#ffe0e8]': tone === 'rose',
            'bg-[#e4f1ff]': tone === 'sky',
          }
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'relative mb-3 flex size-11 items-center justify-center rounded-2xl text-xl font-bold',
          {
            'bg-[#eef0ff] text-[#4f52e8]': tone === 'indigo' || tone === 'slate',
            'bg-[#e5f8ea] text-[#15913a]': tone === 'emerald',
            'bg-[#fff3df] text-[#e58a00]': tone === 'amber',
            'bg-[#fce8ee] text-[#c51c3d]': tone === 'rose',
            'bg-[#e8f3ff] text-[#2376d6]': tone === 'sky',
          }
        )}
      >
        <Icon className="size-6" />
      </div>
      <p className="relative text-xs font-semibold text-[#4a5875]">{label}</p>
      <p className="relative mt-1 text-3xl font-bold text-[#111a35]">{value}</p>
      {hint && <p className={cn('relative mt-1 text-xs', HINT_TONE[tone])}>{hint}</p>}
    </div>
  )
}

const TAG_TONE: Record<StatusTone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
}

const HINT_TONE: Record<StatusTone, string> = {
  slate: 'text-slate-500',
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  sky: 'text-sky-600',
}

export function Tag({ children, tone = 'slate' }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded border px-1.5 py-px font-mono text-[10px] font-bold uppercase',
        TAG_TONE[tone]
      )}
    >
      {children}
    </span>
  )
}

/** Màu nhãn theo trạng thái job/nguồn/truy vấn trả về từ backend. */
export function statusTone(status: string | null | undefined): StatusTone {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'PUBLISHED':
    case 'PASSED':
    case 'VERIFIED':
    case 'HEALTHY':
      return 'emerald'
    case 'RUNNING':
    case 'QUEUED':
    case 'RETRY_WAIT':
    case 'PROCESSING':
    case 'BRONZE':
    case 'ASSIGNED':
    case 'PUBLISHED_WITH_QUARANTINE':
      return 'amber'
    case 'PENDING_VERIFICATION':
      return 'sky'
    case 'FAILED':
    case 'REJECTED':
    case 'OFFLINE':
    case 'BLOCKED':
    case 'PERMISSION_DENIED':
    case 'VALIDATION_FAILED':
      return 'rose'
    case 'SILVER':
      return 'slate'
    case 'GOLD':
      return 'amber'
    default:
      return 'slate'
  }
}

const STATUS_LABELS = new Map([
  ['ACTIVE', 'Đang hoạt động'],
  ['COMPLETED', 'Hoàn tất'],
  ['SUCCESS', 'Thành công'],
  ['CLEANED', 'Đã làm sạch'],
  ['PUBLISHED', 'Đã xuất bản'],
  ['PUBLISHED_WITH_QUARANTINE', 'Đã xuất bản một phần'],
  ['QUEUED', 'Đang chờ'],
  ['RETRY_WAIT', 'Chờ thử lại'],
  ['RUNNING', 'Đang chạy'],
  ['PROCESSING', 'Đang xử lý'],
  ['FAILED', 'Không thành công'],
  ['REJECTED', 'Bị từ chối'],
  ['CANCELLED', 'Đã hủy'],
  ['NO_DATA', 'Không có kết quả'],
  ['EMPTY', 'Không còn dữ liệu'],
  ['QUARANTINED', 'Có dữ liệu cần kiểm tra'],
  ['VALIDATION', 'Kiểm tra thông tin'],
  ['VALIDATING', 'Đang kiểm tra dữ liệu'],
  ['VALIDATION_FAILED', 'Dữ liệu chưa hợp lệ'],
  ['READING', 'Đang đọc dữ liệu'],
  ['WRITING', 'Đang lưu dữ liệu'],
  ['COMMITTING', 'Đang hoàn tất'],
  ['ASSIGNED', 'Cần xử lý'],
  ['PENDING_VERIFICATION', 'Chờ xác minh'],
  ['VERIFIED', 'Đã xác minh'],
  ['HEALTHY', 'Hoạt động'],
  ['OFFLINE', 'Ngoại tuyến'],
  ['BLOCKED', 'Bị chặn xuất bản'],
  ['SKIPPED', 'Bỏ qua xuất bản'],
  ['NOT_STARTED', 'Chưa bắt đầu'],
])

export function statusLabel(status: string): string {
  return STATUS_LABELS.get(status.toUpperCase()) ?? 'Chưa rõ'
}

export function ProgressRow({
  label,
  value,
  percent,
  tone = 'indigo',
}: {
  label: ReactNode
  value: ReactNode
  percent: number
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose'
}) {
  const fill = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[tone]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={cn('h-2 rounded-full', fill)}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}

export function Button({
  children,
  variant = 'outline',
  icon,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'soft' | 'ghost'
  icon?: ReactNode
}) {
  const styles = {
    primary: 'bg-[#b91830] text-white hover:bg-[#9e1429] disabled:bg-[#b91830]/60',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    soft: 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant]
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91830] disabled:cursor-not-allowed disabled:opacity-70',
        styles,
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

export function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cbd4e3] bg-white px-3 text-xs shadow-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </span>
  )
}

export function LoadingState({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"
      role="status"
    >
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-[#fff5f7] px-4 py-7 text-center"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
        <CircleAlert className="size-4" aria-hidden="true" />
        {message}
      </div>
      {onRetry && (
        <Button onClick={onRetry} icon={<RefreshCw className="size-3.5" aria-hidden="true" />}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Image src={emptyData} alt="" width={92} height={92} className="size-20 object-contain" />
      <p className="text-sm font-bold text-[#17233d]">{title}</p>
      {description && <p className="max-w-md text-xs leading-5 text-[#65718d]">{description}</p>}
    </div>
  )
}

export function MockNotice() {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-amber-300 bg-[#fffae9] px-4 py-3 text-xs font-medium text-amber-900 shadow-sm"
      role="note"
    >
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      <span>Trang này đang hiển thị dữ liệu minh họa.</span>
    </div>
  )
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  // Backend lưu UTC không kèm timezone (xem docs/udl-12-ingestion-handover.md).
  const normalized = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString('vi-VN')
}
