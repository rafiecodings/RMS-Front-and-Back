"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import type { Table as TableType, TableStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

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

interface TableListProps {
  tables: TableType[];
  isLoading?: boolean;
  onDelete?: (table: TableType) => void;
  onStatusChange?: (table: TableType, status: TableStatus) => void;
}

export function TableList({
  tables,
  isLoading,
  onDelete,
  onStatusChange,
}: TableListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No tables found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="flex items-center gap-1">
                Table <ArrowUpDown className="h-3 w-3" />
              </span>
            </TableHead>
            <TableHead className="hidden md:table-cell">Zone</TableHead>
            <TableHead className="text-center">Capacity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell text-center">
              Accessible
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tables.map((table) => (
            <TableRow key={table.id}>
              <TableCell>
                <Link
                  href={`/tables/${table.id}`}
                  className="font-semibold hover:underline"
                >
                  T{table.number}
                </Link>
                <span className="text-muted-foreground text-xs ml-1.5">
                  {table.name}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {table.zone || "—"}
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1 text-sm">
                  {table.capacity}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    STATUS_BADGE[table.status]
                  )}
                >
                  {table.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-center text-muted-foreground">
                {table.is_wheelchair_accessible ? "Yes" : "No"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={<Link href={`/tables/${table.id}`} />}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={<Link href={`/tables/${table.id}/edit`} />}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {onStatusChange && table.status !== "available" && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(table, "available")}
                      >
                        Mark Available
                      </DropdownMenuItem>
                    )}
                    {onStatusChange && table.status !== "needs_cleaning" && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(table, "needs_cleaning")}
                      >
                        Mark Needs Cleaning
                      </DropdownMenuItem>
                    )}
                    {onStatusChange && table.status !== "maintenance" && (
                      <DropdownMenuItem
                        onClick={() => onStatusChange(table, "maintenance")}
                      >
                        Mark Maintenance
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(table)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
