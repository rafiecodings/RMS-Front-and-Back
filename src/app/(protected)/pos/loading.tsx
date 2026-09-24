import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors POS: header bar, then product grid beside the cart panel. */
export default function PosLoading() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
        {/* Product grid */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 space-y-2 p-3 pb-0">
            <Skeleton className="h-9 w-full rounded-lg" />
            <div className="flex gap-2 overflow-hidden">
              {[64, 88, 72, 96, 80].map((w, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" style={{ width: w }} />
              ))}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-hidden p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Cart panel */}
        <div className="flex w-full shrink-0 flex-col gap-3 border-t p-3 xl:w-96 xl:border-l xl:border-t-0">
          <Skeleton className="h-6 w-28" />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t pt-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
