import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared";

/** Analytics pages lean on stat tiles and charts rather than tables. */
export default function AnalyticsLoading() {
  return (
    <div className="min-w-0 space-y-8">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <ChartSkeleton height={280} />
      <div className="grid gap-8 lg:grid-cols-2">
        <ChartSkeleton height={220} />
        <ChartSkeleton height={220} />
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
