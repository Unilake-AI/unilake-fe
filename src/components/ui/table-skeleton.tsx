import { Skeleton } from '@/components/ui/skeleton'

export function TableSkeleton({
  columns,
  rows = 5,
  label = 'Đang tải dữ liệu bảng…',
}: {
  columns: number
  rows?: number
  label?: string
}) {
  const cells = Array.from({ length: columns }, (_, index) => index)
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }

  return (
    <div role="status" className="min-w-0">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="divide-y">
        <div className="grid gap-2 bg-muted/45 p-3 sm:gap-4 sm:px-4" style={grid}>
          {cells.map((column) => (
            <Skeleton key={column} className="h-2.5 w-2/3" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div className="grid gap-2 p-3 sm:gap-4 sm:px-4" key={row} style={grid}>
            {cells.map((column) => (
              <Skeleton key={column} className={column % 3 === 0 ? 'h-3 w-full' : 'h-3 w-3/4'} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
