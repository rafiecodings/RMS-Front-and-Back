"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, ConfirmDialog } from "@/components/shared";
import {
  TableList,
  TableStats,
  FloorPlanView,
  FloorPlanForm,
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
  List,
  Pencil,
  Trash2,
  MapPin,
} from "lucide-react";
import { useFloorPlans, useTables } from "@/lib/hooks";
import { toast } from "sonner";
import type { Table as TableType, TableStatus, FloorPlan, FloorPlanFormData } from "@/lib/types";

export default function TablesPage() {
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<TableType | null>(null);
  const [showFloorPlanDialog, setShowFloorPlanDialog] = useState(false);
  const [editingFloorPlan, setEditingFloorPlan] = useState<FloorPlan | null>(null);
  const [deleteFloorPlanTarget, setDeleteFloorPlanTarget] = useState<FloorPlan | null>(null);
  const [view, setView] = useState<"floor" | "list">("floor");

  const floorPlans = useFloorPlans();
  const tables = useTables(selectedFloorPlanId || undefined);

  const allFloorPlans = floorPlans.list.data ?? [];
  const allTables = tables.list.data ?? [];

  const filteredTables =
    statusFilter === "all"
      ? allTables
      : allTables.filter((t) => t.status === statusFilter);

  const activeFloorPlan = allFloorPlans.find((fp) => fp.id === selectedFloorPlanId);

  function handleStatusChange(table: TableType, status: TableStatus) {
    tables.update.mutate(
      { id: table.id, data: { ...table, status } as unknown as Partial<TableType> },
      {
        onSuccess: () => toast.success(`Table T${table.number} updated to ${status.replace(/_/g, " ")}`),
        onError: () => toast.error("Failed to update table status"),
      }
    );
  }

  function handleDeleteTable() {
    if (!deleteTarget) return;
    tables.remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Table T${deleteTarget.number} deleted`);
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete table"),
    });
  }

  function handleFloorPlanSubmit(data: FloorPlanFormData) {
    if (editingFloorPlan) {
      floorPlans.update.mutate(
        { id: editingFloorPlan.id, data },
        {
          onSuccess: () => {
            toast.success("Floor plan updated");
            setShowFloorPlanDialog(false);
            setEditingFloorPlan(null);
          },
          onError: () => toast.error("Failed to update floor plan"),
        }
      );
    } else {
      floorPlans.create.mutate(data, {
        onSuccess: (res) => {
          toast.success("Floor plan created");
          setShowFloorPlanDialog(false);
          if (res.data?.data?.id) setSelectedFloorPlanId(res.data.data.id);
        },
        onError: () => toast.error("Failed to create floor plan"),
      });
    }
  }

  function handleDeleteFloorPlan() {
    if (!deleteFloorPlanTarget) return;
    floorPlans.remove.mutate(deleteFloorPlanTarget.id, {
      onSuccess: () => {
        toast.success("Floor plan deleted");
        setDeleteFloorPlanTarget(null);
        if (selectedFloorPlanId === deleteFloorPlanTarget.id) {
          setSelectedFloorPlanId("");
        }
      },
      onError: () => toast.error("Failed to delete floor plan"),
    });
  }

  return (
    <div>
      <PageHeader
        title="Tables"
        description="Manage tables and floor plans"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingFloorPlan(null);
                setShowFloorPlanDialog(true);
              }}
            >
              <MapPin className="h-4 w-4 mr-1.5" />
              Floor Plan
            </Button>
            <Button
              size="sm"
              disabled={!selectedFloorPlanId}
              render={<Link href={selectedFloorPlanId ? `/tables/new?floor_plan_id=${selectedFloorPlanId}` : "#"} />}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Table
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {allTables.length > 0 && <TableStats tables={allTables} />}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={selectedFloorPlanId}
              onValueChange={(val) => setSelectedFloorPlanId(val ?? "")}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select floor plan" />
              </SelectTrigger>
              <SelectContent>
                {allFloorPlans.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No floor plans
                  </SelectItem>
                ) : (
                  allFloorPlans.map((fp) => (
                    <SelectItem key={fp.id} value={fp.id}>
                      {fp.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {activeFloorPlan && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditingFloorPlan(activeFloorPlan);
                    setShowFloorPlanDialog(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteFloorPlanTarget(activeFloorPlan)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? "all")}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
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

            <div className="flex rounded-lg border">
              <Button
                variant={view === "floor" ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => setView("floor")}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => setView("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {view === "floor" ? (
          <FloorPlanView
            tables={filteredTables}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <TableList
            tables={filteredTables}
            isLoading={tables.list.isLoading}
            onDelete={(t) => setDeleteTarget(t)}
            onStatusChange={handleStatusChange}
          />
        )}

        {filteredTables.length === 0 && !tables.list.isLoading && selectedFloorPlanId && (
          <div className="text-center py-8 text-muted-foreground">
            {statusFilter !== "all"
              ? `No tables with status "${statusFilter.replace(/_/g, " ")}"`
              : "No tables on this floor plan. Add one to get started."}
          </div>
        )}

        {!selectedFloorPlanId && allFloorPlans.length > 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Select a floor plan</p>
            <p className="text-sm mt-1">Choose a floor plan above to view its tables</p>
          </div>
        )}

        {allFloorPlans.length === 0 && !floorPlans.list.isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No floor plans yet</p>
            <p className="text-sm mt-1">Create a floor plan to start managing tables</p>
            <Button
              className="mt-4"
              onClick={() => {
                setEditingFloorPlan(null);
                setShowFloorPlanDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Floor Plan
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Table"
        description={`Are you sure you want to delete table T${deleteTarget?.number}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteTable}
        isLoading={tables.remove.isPending}
      />

      <ConfirmDialog
        open={!!deleteFloorPlanTarget}
        onOpenChange={(open) => !open && setDeleteFloorPlanTarget(null)}
        title="Delete Floor Plan"
        description={`Are you sure you want to delete "${deleteFloorPlanTarget?.name}"? All tables on this floor plan will also be removed.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteFloorPlan}
        isLoading={floorPlans.remove.isPending}
      />

      <Dialog
        open={showFloorPlanDialog}
        onOpenChange={(open) => {
          setShowFloorPlanDialog(open);
          if (!open) setEditingFloorPlan(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFloorPlan ? "Edit Floor Plan" : "New Floor Plan"}
            </DialogTitle>
          </DialogHeader>
          <FloorPlanForm
            initialData={editingFloorPlan ?? undefined}
            onSubmit={handleFloorPlanSubmit}
            isLoading={floorPlans.create.isPending || floorPlans.update.isPending}
            submitLabel={editingFloorPlan ? "Update" : "Create"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
