import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton blocks shaped like the real components they stand in for, so the
 * swap from loading to loaded is a content change rather than a reflow.
 */

/** Deterministic widths keep rows from reflowing between renders. */
const BAR_WIDTHS = [
  "w-3/4",
  "w-2/3",
  "w-1/2",
  "w-3/5",
  "w-2/5",
  "w-1/3",
  "w-4/5",
] as const;

export function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-7 w-48 sm:h-8 sm:w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {action && <Skeleton className="h-10 w-28 shrink-0 rounded-lg" />}
    </div>
  );
}

export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="size-11 shrink-0 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** For lists rendered as a responsive card grid rather than a table. */
export function CardGridSkeleton({
  count = 8,
  className = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  lines = 3,
}: {
  count?: number;
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            {Array.from({ length: lines }).map((_, j) => (
              <Skeleton
                key={j}
                className={cn("h-3.5", BAR_WIDTHS[(i + j) % BAR_WIDTHS.length])}
              />
            ))}
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {  return (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="mb-5 h-5 w-40" />
        <div
          className="flex items-end gap-2 sm:gap-3"
          style={{ height: `${height}px` }}
          aria-hidden="true"
        >
          {[45, 70, 35, 85, 55, 90, 60, 75, 40, 65, 80, 50].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-md"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 6,
  showToolbar = true,
  showFooter = true,
}: {
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
  showFooter?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {Array.from({ length: columns }).map((_, c) => (
                <th key={c} className="px-4 py-3 text-left">
                  <Skeleton className="h-3.5 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b last:border-0">
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    <Skeleton
                      className={cn("h-4", BAR_WIDTHS[(r + c) % BAR_WIDTHS.length])}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showFooter && (
        <div className="flex items-center justify-between border-t p-4">
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="size-8 rounded-lg" />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Default body for a list/CRUD page: page header, optional stat row, then a
 * table. Used by the route-level `loading.tsx` files.
 */
export function ListPageSkeleton({
  stats = 4,
  rows = 8,
  columns = 6,
}: {
  stats?: number;
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="min-w-0">
      <PageHeaderSkeleton />
      {stats > 0 && (
        <div className="mb-6">
          <StatsCardsSkeleton count={stats} />
        </div>
      )}
      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );
}

/** Compact skeleton for a dialog body that fetches its own detail. */
export function DialogBodySkeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-4 py-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className={cn("h-4", BAR_WIDTHS[i % BAR_WIDTHS.length])} />
        </div>
      ))}
    </div>
  );
}

/** Kanban board placeholder — used by the kitchen page and its route loader. */
export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex h-full min-h-[400px] gap-4 overflow-hidden pb-2">
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="flex w-[280px] shrink-0 flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          {Array.from({ length: 3 - (col % 2) }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Create/edit pages: header, a two-column field grid, then form actions. */
export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="min-w-0">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t pt-5">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Detail page: heading, a two-column field grid, and a body block. */
export function DetailPageSkeleton() {
  return (
    <div className="min-w-0 space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-full max-w-sm" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
