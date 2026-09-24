import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared";

/** Mirrors the dashboard's KPI row → chart pair → table rhythm. */
export default function DashboardLoading() {
  return (
    <div className="min-w-0">
      <PageHeaderSkeleton />
      <div className="space-y-8">
        <StatsCardsSkeleton count={4} />
        <div className="grid gap-8 lg:grid-cols-2">
          <ChartSkeleton height={240} />
          <ChartSkeleton height={240} />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <TableSkeleton rows={5} columns={3} showToolbar={false} />
          <TableSkeleton rows={5} columns={3} showToolbar={false} />
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
