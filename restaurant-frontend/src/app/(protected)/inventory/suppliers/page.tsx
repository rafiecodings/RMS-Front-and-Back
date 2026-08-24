"use client";

import { useState } from "react";
import { PageHeader, ConfirmDialog, ErrorState } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SupplierTable, SupplierForm, SupplierDetail } from "@/features/inventory";
import { useSuppliers } from "@/lib/hooks";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit } from "@/lib/utils/permissions";
import { Plus } from "lucide-react";
import type { Supplier, SupplierFormData } from "@/lib/types";
import { toast } from "sonner";

type SupplierModal =
  | { mode: "add" }
  | { mode: "edit"; item: Supplier }
  | { mode: "view"; item: Supplier }
  | null;

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeModal, setActiveModal] = useState<SupplierModal>(null);
  const [toggleTarget, setToggleTarget] = useState<Supplier | null>(null);

  const { user } = useAuth();
  const canManage = canEdit(user?.role, "inventory");

  const { list, create, update } = useSuppliers({
    page,
    per_page: 20,
    search: search || undefined,
  });

  const suppliers = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  const existingNames =
    activeModal?.mode === "edit"
      ? suppliers.filter((s) => s.id !== activeModal.item.id).map((s) => s.name.toLowerCase())
      : suppliers.map((s) => s.name.toLowerCase());

  function handleCreate(data: SupplierFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Supplier created");
        setActiveModal(null);
      },
      onError: () => toast.error("Failed to create supplier"),
    });
  }

  function handleEdit(data: SupplierFormData) {
    if (activeModal?.mode !== "edit") return;
    update.mutate(
      { id: activeModal.item.id, data },
      {
        onSuccess: () => {
          toast.success("Supplier updated");
          setActiveModal(null);
        },
        onError: () => toast.error("Failed to update supplier"),
      }
    );
  }

  function handleToggleActive() {
    if (!toggleTarget) return;
    update.mutate(
      {
        id: toggleTarget.id,
        data: { is_active: !toggleTarget.is_active },
      },
      {
        onSuccess: () =>
          toast.success(
            toggleTarget!.is_active ? "Supplier deactivated" : "Supplier activated"
          ),
        onError: () => toast.error("Failed to update supplier"),
      }
    );
    setToggleTarget(null);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description="View supplier reference information (managed by Supply Chain)"
        action={
          canManage ? (
            <Button onClick={() => setActiveModal({ mode: "add" })}>
              <Plus className="h-4 w-4 mr-1" />
              Add Supplier
            </Button>
          ) : undefined
        }
      />

      {list.isError ? (
        <ErrorState message="Failed to load suppliers. Please try again." />
      ) : (
        <SupplierTable
          suppliers={suppliers}
          isLoading={list.isLoading}
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          canEdit={canManage}
          onToggleActive={canManage ? setToggleTarget : undefined}
          onView={(item) => setActiveModal({ mode: "view", item })}
          onEdit={canManage ? (item) => setActiveModal({ mode: "edit", item }) : undefined}
        />
      )}

      <Dialog
        open={activeModal?.mode === "add" || activeModal?.mode === "edit"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeModal?.mode === "edit" ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "add" || activeModal?.mode === "edit" ? (
            <SupplierForm
              initialData={activeModal.mode === "edit" ? activeModal.item : undefined}
              existingNames={existingNames}
              onSubmit={activeModal.mode === "edit" ? handleEdit : handleCreate}
              isLoading={create.isPending || update.isPending}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeModal?.mode === "view"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
          </DialogHeader>
          {activeModal?.mode === "view" ? (
            <SupplierDetail
              supplier={activeModal.item}
              canEdit={canManage}
              onEdit={() => setActiveModal({ mode: "edit", item: activeModal.item })}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? "Deactivate Supplier" : "Activate Supplier"}
        description={
          toggleTarget?.is_active
            ? `Deactivating "${toggleTarget.name}" prevents it from being selected on new purchase orders, but existing records are retained.`
            : `Activate "${toggleTarget?.name}" to make it selectable for purchase orders again?`
        }
        confirmText={toggleTarget?.is_active ? "Deactivate" : "Activate"}
        variant={toggleTarget?.is_active ? "destructive" : "default"}
        onConfirm={handleToggleActive}
        isLoading={update.isPending}
      />
    </div>
  );
}
