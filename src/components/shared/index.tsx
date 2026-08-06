"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatLabel, safeNumber } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader = memo(function PageHeader({
  title,
  description,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">{action}{children}</div>
    </div>
  );
});

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {icon && (
        <div className="text-muted-foreground mb-6">{icon}</div>
      )}
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 text-center max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface ChartEmptyStateProps {
  height?: number;
  message?: string;
}

export const ChartEmptyState = memo(function ChartEmptyState({
  height = 200,
  message = "No data available",
}: ChartEmptyStateProps) {
  return (
    <div
      className="flex items-center justify-center text-muted-foreground text-sm"
      style={{ height: `${height}px` }}
    >
      {message}
    </div>
  );
});

export function LoadingSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-muted", className)}
      {...props}
    />
  );
}

export const LoadingSpinner = memo(function LoadingSpinner({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2
      className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)}
    />
  );
});

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const StatusBadge = memo(function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const variants: Record<string, string> = {
    available: "bg-success/10 text-success",
    occupied: "bg-destructive/10 text-destructive",
    reserved: "bg-warning/10 text-warning",
    needs_cleaning: "bg-warning/10 text-warning",
    maintenance: "bg-muted text-muted-foreground",
    placed: "bg-info/10 text-info",
    confirmed: "bg-info/10 text-info",
    preparing: "bg-warning/10 text-warning",
    ready: "bg-success/10 text-success",
    served: "bg-success/10 text-success",
    completed: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
    voided: "bg-destructive/10 text-destructive",
    received: "bg-info/10 text-info",
    in_progress: "bg-warning/10 text-warning",
    draft: "bg-muted text-muted-foreground",
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    ordered: "bg-info/10 text-info",
    partial: "bg-warning/10 text-warning",
    paid: "bg-success/10 text-success",
    unpaid: "bg-warning/10 text-warning",
    refunded: "bg-info/10 text-info",
    active: "bg-success/10 text-success",
    inactive: "bg-muted text-muted-foreground",
    on_hold: "bg-warning/10 text-warning",
    expired: "bg-muted text-muted-foreground",
    low: "bg-warning/10 text-warning",
    critical: "bg-destructive/10 text-destructive",
    out_of_stock: "bg-destructive/10 text-destructive",
    normal: "bg-info/10 text-info",
    rush: "bg-destructive/10 text-destructive",
    waiting: "bg-warning/10 text-warning",
    seated: "bg-success/10 text-success",
    no_show: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-current/15 px-2.5 py-0.5 font-mono text-[11px] font-medium leading-4",
        variants[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {formatLabel(status)}
    </span>
  );
});

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  format?: "currency" | "number" | "percentage";
  trend?: { value: number; isPositive: boolean };
}

export const StatsCard = memo(function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  format = "number",
  trend,
}: StatsCardProps) {
  const num = safeNumber(value);
  const formattedValue =
    format === "currency"
      ? formatCurrency(num)
      : format === "percentage"
        ? `${num.toFixed(1)}%`
        : num.toLocaleString();

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">{title}</p>
            <p className="font-heading text-3xl font-bold tracking-tight">{formattedValue}</p>
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5",
                    trend.isPositive
                      ? "text-success bg-success/10"
                      : "text-destructive bg-destructive/10"
                  )}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              )}
              {description && (
                <span className="text-xs text-muted-foreground">{description}</span>
              )}
            </div>
          </div>
          {Icon && (
            <div className="ml-4 rounded-lg bg-primary/10 p-3">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const TablePagination = memo(function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

export function TableLoadingRows({
  rows = 5,
  colSpan = 6,
}: {
  rows?: number;
  colSpan?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="h-5 bg-muted rounded animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function TableEmptyRow({
  message = "No data found",
  colSpan = 6,
}: {
  message?: string;
  colSpan?: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-muted-foreground"
      >
        {message}
      </td>
    </tr>
  );
}

interface PeriodFilterProps {
  value: string;
  onChange: (period: string) => void;
  periods?: { label: string; value: string }[];
}

const DEFAULT_PERIODS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom", value: "custom" },
];

export function PeriodFilter({
  value,
  onChange,
  periods = DEFAULT_PERIODS,
}: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-1.5">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={value === period.value ? "default" : "outline"}
          size="sm"
          className="rounded-lg"
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}

interface ActiveBadgeProps {
  isActive: boolean;
}

export const ActiveBadge = memo(function ActiveBadge({ isActive }: ActiveBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-transparent",
        isActive
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
});

export { SearchInput } from "./SearchInput";
export { EntityActionDropdown } from "./EntityActionDropdown";
export { ErrorBoundary } from "./ErrorBoundary";
