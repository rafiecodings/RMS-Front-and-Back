import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared";

/** Report pages: filters, KPI row, a wide chart, then a breakdown table. */
export default function ReportsLoading() {
  return (
    <div className="min-w-0 space-y-6">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <ChartSkeleton height={300} />
      <TableSkeleton rows={7} columns={5} />
    </div>
  );
}
