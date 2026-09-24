import { cn } from "@/lib/utils"

/**
 * Loading placeholder. Sweeps a highlight when motion is allowed; falls back to
 * an opacity pulse under `prefers-reduced-motion`.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-xl bg-muted",
        "motion-safe:animate-shimmer motion-safe:skeleton-shimmer",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
