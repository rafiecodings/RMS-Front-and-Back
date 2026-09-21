'use client';

import { memo, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import { formatLabel } from '@/lib/utils';

export const StatusBadge = memo(function StatusBadge({
  status,
  className,
  label,
  ...props
}: {
  status: string;
  className?: string;
  label?: string;
} & ComponentPropsWithoutRef<'span'>) {
  const variants: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    occupied: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    reserved: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    needs_cleaning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    delivered: 'bg-info/10 text-info',
    maintenance: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    seated: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    no_show: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400',
    preparing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    served: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    low_stock: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    out_of_stock: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    overstock: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    received: 'bg-info/10 text-info',
    in_progress: 'bg-warning/10 text-warning',
    draft: 'bg-muted text-muted-foreground',
    approved: 'bg-success/10 text-success',
    rejected: 'bg-destructive/10 text-destructive',
    ordered: 'bg-info/10 text-info',
    partial: 'bg-warning/10 text-warning',
    paid: 'bg-success/10 text-success',
    unpaid: 'bg-warning/10 text-warning',
    refunded: 'bg-info/10 text-info',
    expired: 'bg-muted text-muted-foreground',
    low: 'bg-warning/10 text-warning',
    critical: 'bg-destructive/10 text-destructive',
    normal: 'bg-info/10 text-info',
    rush: 'bg-destructive/10 text-destructive',
    waiting: 'bg-warning/10 text-warning',
    voided: 'bg-destructive/10 text-destructive',
    swap: 'bg-info/10 text-info',
    absent: 'bg-red-500/10 text-red-500',
    late: 'bg-amber-500/10 text-amber-500',
    half_day: 'bg-orange-500/10 text-orange-500',
    on_leave: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-current/15 px-2.5 py-0.5 font-mono text-[11px] font-medium leading-4',
        variants[status] || 'bg-muted text-muted-foreground',
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label ?? formatLabel(status)}
    </span>
  );
});