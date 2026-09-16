"use client";

import { useState } from "react";
import { PageHeader, ConfirmDialog } from "@/components/shared";
import {
  TableStats,
  TableForm,
} from "@/features/tables";
import { TableGridView } from "@/features/tables/TableGridView";
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
} from "lucide-react";
import { useTables } from "@/lib/hooks";
import type { Table as TableType, TableStatus, TableFormData } from "@/lib/types";
import { cn, formatLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

  // Archived tables never masquerade as operational status records: they
  // appear only under "All Status" + "Show archived", never under a status
  // filter.
  const filteredTables =
    statusFilter === "all"
      ? visibleTables
      : visibleTables.filter(
          (t) => t.is_active !== false && t.status === statusFilter
        );

  function handleStatusChange(table: TableType, status: TableStatus) {
    setStatusActionTarget({ table, status });
  }

  function handleStatusConfirm() {
    if (!statusActionTarget) return;
    const { table, status } = statusActionTarget;
    tables.update.mutate(
      { id: table.id, data: { status } as unknown as Partial<TableType> },
      {
        onSuccess: () => toast.success(`Table T${table.number} updated to ${formatLabel(status)}`),
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
                ? `No tables with status "${formatLabel(statusFilter)}"`
                : "No tables yet. Add one to get started."}
            </p>
          </div>
        )}

        <ConfirmDialog
          open={!!statusActionTarget}
          onOpenChange={(open) => !open && setStatusActionTarget(null)}
          title="Change Table Status"
          description={statusActionTarget ? `Change table T${statusActionTarget.table.number} to "${formatLabel(statusActionTarget.status)}"?` : ""}
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
                  {viewTarget.is_active === false ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground"
                    >
                      Archived
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        STATUS_BADGE[viewTarget.status]
                      )}
                    >
                      {formatLabel(viewTarget.status)}
                    </Badge>
                  )}
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


