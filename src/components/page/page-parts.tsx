import type { ReactNode } from 'react'

import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  LayoutTemplate,
  RefreshCw,
} from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatusTone } from '@/types/page/page-parts'

export function PageHeader({
  breadcrumb = [],
  icon = <LayoutTemplate />,
  title,
  description,
  actions,
}: {
  breadcrumb?: readonly string[]
  icon?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  const context = breadcrumb.at(-1) === title ? breadcrumb.slice(0, -1) : breadcrumb

  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary sm:size-12 [&_svg]:size-5"
        >
          {icon}
        </div>
        <div className="min-w-0">
          {context.length > 0 && (
            <nav
              aria-label="Vị trí trang"
              className="mb-1 text-xs font-medium text-muted-foreground"
            >
              <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {context.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex min-w-0 items-center gap-1.5">
                    {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
                    <span className="break-words">{item}</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="text-balance break-words text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl lg:text-[28px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
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
    <section className={cn('min-w-0 rounded-lg border bg-card', className)}>
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-[#65718d]">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'slate',
  dashboard = false,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: StatusTone
  dashboard?: boolean
  className?: string
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
    <div
      className={cn(
        'min-w-0 bg-card p-3.5',
        dashboard ? 'p-4 sm:p-5' : 'rounded-lg border',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon aria-hidden="true" className={cn('size-4 shrink-0', HINT_TONE[tone])} />
      </div>
      <p
        className={cn(
          'mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground',
          dashboard && 'sm:text-3xl'
        )}
      >
        {value}
      </p>
      {hint && <p className={cn('mt-1 text-xs', HINT_TONE[tone])}>{hint}</p>}
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
  slate: 'text-slate-500 dark:text-slate-300',
  indigo: 'text-indigo-600 dark:text-indigo-300',
  emerald: 'text-emerald-600 dark:text-emerald-300',
  amber: 'text-amber-600 dark:text-amber-300',
  rose: 'text-rose-600 dark:text-rose-300',
  sky: 'text-sky-600 dark:text-sky-300',
}

export function Tag({ children, tone = 'slate' }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[11px] font-medium',
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
    case 'SUCCEEDED':
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
    case 'QUARANTINED':
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
  ['SUCCEEDED', 'Thành công'],
  ['UNKNOWN', 'Chưa xác định'],
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
  loading = false,
  reading = false,
  disabled,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'positive' | 'outline' | 'soft' | 'ghost'
  icon?: ReactNode
  loading?: boolean
  reading?: boolean
}) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    positive: 'action-positive',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    soft: 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant]
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70',
        styles,
        className
      )}
      {...props}
      aria-busy={loading || reading || props['aria-busy']}
      disabled={disabled || loading || reading}
    >
      {loading ? (
        <DatabaseLoader compact />
      ) : reading ? (
        <Skeleton aria-hidden="true" className="h-3 w-4 bg-current opacity-35" />
      ) : (
        icon
      )}
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

export function DatabaseLoader({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn('database-loader', compact && 'database-loader-compact')}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </span>
  )
}

export function PendingOverlay({ label, description }: { label: string; description?: string }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-sidebar/45 p-4">
      <div
        role="status"
        className="flex w-full max-w-xs items-center gap-3 rounded-lg border bg-card p-4 text-foreground shadow-sm"
      >
        <DatabaseLoader />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          {description && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function LoadingState({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div className="space-y-3 p-4" role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  retrying = false,
}: {
  message: string
  onRetry?: () => void
  retrying?: boolean
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-[#fff5f7] px-4 py-7 text-center dark:border-rose-300/30 dark:bg-rose-400/10"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-200">
        <CircleAlert className="size-4" aria-hidden="true" />
        {message}
      </div>
      {onRetry && (
        <Button
          className="dark:border-input dark:bg-card dark:text-foreground dark:hover:bg-muted"
          onClick={onRetry}
          reading={retrying}
          icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
        >
          Thử lại
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
      <Database aria-hidden="true" className="size-5 text-muted-foreground" />
      <p className="text-sm font-bold text-foreground">{title}</p>
      {description && (
        <p className="max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
      )}
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
