import { LoaderCircle, Store } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Branded full-screen wait state for the auth bootstrap — shown while the
 * session is being resolved, before we know which shell to render.
 */
export function AppSplash({
  message = "Checking your session…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-dvh items-center justify-center bg-background",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Store className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}
