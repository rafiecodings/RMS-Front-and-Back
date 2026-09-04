"use client";

import { useState } from "react";
import { PageHeader, ConfirmDialog } from "@/components/shared";
import {
  TableStats,
  TableForm,
} from "@/features/tables";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  LayoutGrid,
  Pencil,
  Eye,
  Users,
  MoreHorizontal,
  CheckCircle,
  Sparkles,
  Wrench,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { useTables } from "@/lib/hooks";
import type { Table as TableType, TableStatus, TableFormData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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

export default function TablesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [archiveTarget, setArchiveTarget] = useState<TableType | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<TableType | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [viewTarget, setViewTarget] = useState<TableType | null>(null);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<TableType | null>(null);
  const [statusActionTarget, setStatusActionTarget] = useState<{
    table: TableType;
    status: TableStatus;
  } | null>(null);

  const tables = useTables();
  const allTables = tables.list.data ?? [];

  const visibleTables = showArchived
    ? allTables
    : allTables.filter((t) => t.is_active !== false);

  const filteredTables =
    statusFilter === "all"
      ? visibleTables
      : visibleTables.filter((t) => t.status === statusFilter);

  function handleStatusChange(table: TableType, status: TableStatus) {
    setStatusActionTarget({ table, status });
  }

  function handleStatusConfirm() {
    if (!statusActionTarget) return;
    const { table, status } = statusActionTarget;
    tables.update.mutate(
      { id: table.id, data: { status } as unknown as Partial<TableType> },
      {
        onSuccess: () => toast.success(`Table T${table.number} updated to ${status.replace(/_/g, " ")}`),
        onError: () => toast.error("Failed to update table status"),
      }
    );
    setStatusActionTarget(null);
  }

  function handleArchiveTable() {
    if (!archiveTarget) return;
    tables.archive.mutate(archiveTarget.id, {
      onSuccess: () => {
        toast.success(`Table T${archiveTarget.number} archived`);
        setArchiveTarget(null);
      },
      onError: (err) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to archive table";
        toast.error(msg);
        setArchiveTarget(null);
      },
    });
  }

  function handleRestoreTable() {
    if (!restoreTarget) return;
    tables.restore.mutate(restoreTarget.id, {
      onSuccess: () => {
        toast.success(`Table T${restoreTarget.number} restored`);
        setRestoreTarget(null);
      },
      onError: () => toast.error("Failed to restore table"),
    });
  }

  function handleTableSubmit(data: TableFormData) {
    if (editingTable) {
      tables.update.mutate(
        { id: editingTable.id, data },
        {
          onSuccess: () => {
            toast.success("Table updated");
            setShowTableDialog(false);
            setEditingTable(null);
          },
          onError: () => toast.error("Failed to update table"),
        }
      );
    } else {
      tables.create.mutate(data, {
        onSuccess: () => {
          toast.success("Table created");
          setShowTableDialog(false);
        },
        onError: (error) => {
          const message = (error as { response?: { data?: { message?: string } } })
            .response?.data?.message;
          toast.error(message || "Failed to create table");
        },
      });
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="Tables"
        description="Manage restaurant tables"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditingTable(null);
              setShowTableDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Table
          </Button>
        }
      />

      <div className="space-y-6">
        <TableStats tables={visibleTables} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-[160px] min-h-10">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="needs_cleaning">Needs Cleaning</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4"
          />
          Show archived
        </label>

        <TableGridView
          tables={filteredTables}
          onStatusChange={handleStatusChange}
          onView={(t) => setViewTarget(t)}
          onEdit={(t) => {
            setEditingTable(t);
            setShowTableDialog(true);
          }}
          onArchive={(t) => setArchiveTarget(t)}
          onRestore={(t) => setRestoreTarget(t)}
        />

        {filteredTables.length === 0 && !tables.list.isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>
              {statusFilter !== "all"
                ? `No tables with status "${statusFilter.replace(/_/g, " ")}"`
                : "No tables yet. Add one to get started."}
            </p>
          </div>
        )}

        <ConfirmDialog
          open={!!statusActionTarget}
          onOpenChange={(open) => !open && setStatusActionTarget(null)}
          title="Change Table Status"
          description={statusActionTarget ? `Change table T${statusActionTarget.table.number} to "${statusActionTarget.status.replace(/_/g, " ")}"?` : ""}
          confirmText="Confirm"
          onConfirm={handleStatusConfirm}
          isLoading={tables.update.isPending}
        />

        <ConfirmDialog
          open={!!archiveTarget}
          onOpenChange={(open) => !open && setArchiveTarget(null)}
          title="Archive Table"
          description={`Archive table T${archiveTarget?.number}? It will be hidden from active lists and cannot be assigned to new orders until restored.`}
          confirmText="Archive"
          variant="destructive"
          onConfirm={handleArchiveTable}
          isLoading={tables.archive.isPending}
        />

        <ConfirmDialog
          open={!!restoreTarget}
          onOpenChange={(open) => !open && setRestoreTarget(null)}
          title="Restore Table"
          description={`Restore table T${restoreTarget?.number}? It will reappear in active lists.`}
          confirmText="Restore"
          onConfirm={handleRestoreTable}
          isLoading={tables.restore.isPending}
        />

        <Dialog
          open={showTableDialog}
          onOpenChange={(open) => {
            setShowTableDialog(open);
            if (!open) setEditingTable(null);
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[calc(100dvh-24px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTable ? "Edit Table" : "New Table"}
              </DialogTitle>
            </DialogHeader>
            <TableForm
              initialData={editingTable ?? undefined}
              onSubmit={handleTableSubmit}
              isLoading={tables.create.isPending || tables.update.isPending}
              submitLabel={editingTable ? "Update" : "Create"}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!viewTarget}
          onOpenChange={(open) => !open && setViewTarget(null)}
        >
          <DialogContent className="sm:max-w-md max-h-[calc(100dvh-24px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Table T{viewTarget?.number}
                {viewTarget?.name ? ` · ${viewTarget.name}` : ""}
              </DialogTitle>
            </DialogHeader>
            {viewTarget && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      STATUS_BADGE[viewTarget.status]
                    )}
                  >
                    {viewTarget.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">{viewTarget.capacity} seats</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Section</p>
                    <p className="font-medium">{viewTarget.section || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Zone</p>
                    <p className="font-medium">{viewTarget.zone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shape</p>
                    <p className="font-medium">{viewTarget.shape || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Wheelchair Access</p>
                    <p className="font-medium">
                      {viewTarget.is_wheelchair_accessible ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setViewTarget(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function TableGridView({
  tables,
  onStatusChange,
  onView,
          onEdit,
          onArchive,
          onRestore,
        }: {
          tables: TableType[];
          onStatusChange?: (table: TableType, status: TableStatus) => void;
          onView?: (table: TableType) => void;
          onEdit?: (table: TableType) => void;
          onArchive?: (table: TableType) => void;
          onRestore?: (table: TableType) => void;
        }) {
  if (tables.length === 0) {
    return null;
  }

  const sorted = [...tables].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true })
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {sorted.map((table) => (
        <div
          key={table.id}
          className={cn(
            "relative rounded-xl border-2 p-3 transition-all min-h-[120px] flex flex-col",
            STATUS_GLOW[table.status]
          )}
        >
          {/* Status glow indicator */}
          <div className="absolute -top-1 -right-1">
            <span className={cn("h-3 w-3 rounded-full", STATUS_DOT[table.status])} />
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
                <DropdownMenuItem onClick={() => onEdit?.(table)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                {onStatusChange && table.status !== "available" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(table, "available")}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                    Mark Available
                  </DropdownMenuItem>
                )}
                {onStatusChange && table.status !== "needs_cleaning" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(table, "needs_cleaning")}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Mark Needs Cleaning
                  </DropdownMenuItem>
                )}
                {onStatusChange && table.status !== "maintenance" && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(table, "maintenance")}
                  >
                    <Wrench className="h-3.5 w-3.5 mr-2" />
                    Mark Maintenance
                  </DropdownMenuItem>
                )}
                {table.is_active !== false ? (
                  <DropdownMenuItem
                    onClick={() => onArchive?.(table)}
                  >
                    <Archive className="h-3.5 w-3.5 mr-2" />
                    Archive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onRestore?.(table)}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5 mr-2" />
                    Restore
                  </DropdownMenuItem>
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
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] px-1 py-0 h-4",
                STATUS_BADGE[table.status]
              )}
            >
              {table.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
