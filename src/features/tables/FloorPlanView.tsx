"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, MoreHorizontal, Pencil, Eye, Sparkles, Wrench, CheckCircle } from "lucide-react";
import type { Table, TableStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const CELL_STYLES: Record<TableStatus, string> = {
  available:
    "border-emerald-300 bg-emerald-50 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50 dark:hover:border-emerald-700",
  occupied:
    "border-red-300 bg-red-50 hover:border-red-400 dark:border-red-800 dark:bg-red-950/50 dark:hover:border-red-700",
  reserved:
    "border-amber-300 bg-amber-50 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-950/50 dark:hover:border-amber-700",
  needs_cleaning:
    "border-orange-300 bg-orange-50 hover:border-orange-400 dark:border-orange-800 dark:bg-orange-950/50 dark:hover:border-orange-700",
  maintenance:
    "border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-gray-600",
};

const STATUS_DOT: Record<TableStatus, string> = {
  available: "bg-emerald-500",
  occupied: "bg-red-500",
  reserved: "bg-amber-500",
  needs_cleaning: "bg-orange-500",
  maintenance: "bg-gray-500",
};

interface FloorPlanViewProps {
  tables: Table[];
  onStatusChange?: (table: Table, status: TableStatus) => void;
}

export function FloorPlanView({ tables, onStatusChange }: FloorPlanViewProps) {
  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>No tables on this floor plan yet.</p>
        <p className="text-sm mt-1">Add tables to see them here.</p>
      </div>
    );
  }

  const sorted = [...tables].sort((a, b) => a.number - b.number);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {sorted.map((table) => (
        <div
          key={table.id}
          className={cn(
            "relative rounded-xl border-2 p-3 transition-all cursor-pointer min-h-[120px] flex flex-col",
            CELL_STYLES[table.status]
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[table.status])} />
              <span className="text-xs font-medium text-muted-foreground">
                T{table.number}
              </span>
            </div>
            {onStatusChange && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-xs" />}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={`/tables/${table.id}`} />}>
                    <Eye className="h-3.5 w-3.5 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/tables/${table.id}/edit`} />}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {table.status !== "available" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(table, "available")}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-2" />
                      Mark Available
                    </DropdownMenuItem>
                  )}
                  {table.status !== "needs_cleaning" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(table, "needs_cleaning")}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-2" />
                      Mark Needs Cleaning
                    </DropdownMenuItem>
                  )}
                  {table.status !== "maintenance" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(table, "maintenance")}
                    >
                      <Wrench className="h-3.5 w-3.5 mr-2" />
                      Mark Maintenance
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] px-1 py-0 h-4",
                table.status === "available"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : table.status === "occupied"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : table.status === "reserved"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      : table.status === "needs_cleaning"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
              )}
            >
              {table.status.replace(/_/g, " ")}
            </Badge>
          </div>

          {table.zone && (
            <span className="absolute top-2 right-8 text-[9px] text-muted-foreground">
              {table.zone}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
