import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanSkeleton } from "@/components/shared";

/** Mirrors the kitchen board: toolbar, stat cards, then kanban columns. */
export default function KitchenLoading() {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-7 w-44" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-7 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>

      <KanbanSkeleton />
    </div>
  );
}
