"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  CheckCircle,
  Sparkles,
  Wrench,
  Archive,
  ArchiveRestore,
  Users,
} from "lucide-react";
import type { Table as TableType, TableStatus } from "@/lib/types";
import { cn, formatLabel } from "@/lib/utils";

const STATUS_BADGE: Record<TableStatus, string> = {
  available:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  occupied:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  reserved:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  needs_cleaning:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  maintenance:
    "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

const STATUS_GLOW: Record<TableStatus, string> = {
  available:
    "border-2 border-emerald-400 shadow-lg shadow-emerald-400/30 dark:border-emerald-500 dark:shadow-emerald-500/30",
  occupied:
    "border-2 border-red-400 shadow-lg shadow-red-400/30 dark:border-red-500 dark:shadow-red-500/30",
  reserved:
    "border-2 border-amber-400 shadow-lg shadow-amber-400/30 dark:border-amber-500 dark:shadow-amber-500/30",
  needs_cleaning:
    "border-2 border-orange-400 shadow-lg shadow-orange-400/30 dark:border-orange-500 dark:shadow-orange-500/30",
  maintenance:
    "border-2 border-gray-400 dark:border-gray-500",
};

const STATUS_DOT: Record<TableStatus, string> = {
  available: "bg-emerald-500",
  occupied: "bg-red-500",
  reserved: "bg-amber-500",
  needs_cleaning: "bg-orange-500",
  maintenance: "bg-gray-500",
};

export function TableGridView({
  tables,
  onStatusChange,
  onView,
  onEdit,
  onArchive,
  onRestore,
  canEdit = true,
  canArchive = true,
  canChangeStatus = true,
}: {
  tables: TableType[];
  onStatusChange?: (table: TableType, status: TableStatus) => void;
  onView?: (table: TableType) => void;
  onEdit?: (table: TableType) => void;
  onArchive?: (table: TableType) => void;
  onRestore?: (table: TableType) => void;
  canEdit?: boolean;
  canArchive?: boolean;
  canChangeStatus?: boolean;
}) {
  if (tables.length === 0) {
    return null;
  }

  const sorted = [...tables].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true })
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {sorted.map((table) => {
        const isArchived = table.is_active === false;
        return (
        <div
          key={table.id}
          data-archived={isArchived || undefined}
          className={cn(
            "relative rounded-xl border-2 p-3 transition-all min-h-[120px] flex flex-col",
            isArchived
              ? "border-dashed border-muted-foreground/40 opacity-80"
              : STATUS_GLOW[table.status]
          )}
        >
          {/* Status glow indicator */}
          <div className="absolute -top-1 -right-1">
            <span className={cn("h-3 w-3 rounded-full", isArchived ? "bg-gray-400" : STATUS_DOT[table.status])} />
          </div>

          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                T{table.number}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-xs" />}
              >
                <MoreHorizontal className="h-3 w-3" />
                <span className="sr-only">Actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(table)}>
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  View
                </DropdownMenuItem>
                {!isArchived && canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(table)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {!isArchived && canChangeStatus && onStatusChange && table.status !== "available" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(table, "available")}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                    Mark Available
                  </DropdownMenuItem>
                )}
                {!isArchived && canChangeStatus && onStatusChange && table.status !== "needs_cleaning" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(table, "needs_cleaning")}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Mark Needs Cleaning
                  </DropdownMenuItem>
                )}
                {!isArchived && canChangeStatus && onStatusChange && table.status !== "maintenance" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(table, "maintenance")}
                  >
                    <Wrench className="h-3.5 w-3.5 mr-2" />
                    Mark Maintenance
                  </DropdownMenuItem>
                )}
                {table.is_active !== false ? (
                  canArchive ? (
                    <DropdownMenuItem
                      onClick={() => onArchive?.(table)}
                    >
                      <Archive className="h-3.5 w-3.5 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  ) : null
                ) : (
                  canArchive ? (
                    <DropdownMenuItem
                      onClick={() => onRestore?.(table)}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5 mr-2" />
                      Restore
                    </DropdownMenuItem>
                  ) : null
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold">T{table.number}</span>
            {table.name && (
              <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {table.name}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {table.capacity}
            </div>
            {isArchived ? (
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-4 bg-muted text-muted-foreground"
                title={`Underlying status: ${formatLabel(table.status)}`}
              >
                Archived
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[9px] px-1 py-0 h-4",
                  STATUS_BADGE[table.status]
                )}
              >
                {formatLabel(table.status)}
              </Badge>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
