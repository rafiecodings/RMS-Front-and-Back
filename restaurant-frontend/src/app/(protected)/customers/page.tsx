"use client";

import { useState, useRef, useMemo } from "react";

import { PageHeader, ConfirmDialog, SearchInput, EmptyState, TablePagination, ErrorState } from "@/components/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerTable, CustomerStats, CustomerForm, EditCustomerDialog } from "@/features/customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";
import { useCustomers } from "@/lib/hooks";
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from "@/lib/utils/constants";
import type { Customer, CustomerFormData } from "@/lib/types";
import { canEdit } from "@/lib/utils/permissions";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [page, setPage] = useState(1);
  const [archiveTarget, setArchiveTarget] = useState<Customer | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const canModify = canEdit(user?.role, "customers");

  const params = useMemo(() => ({
    page,
    per_page: ITEMS_PER_PAGE,
    ...(debouncedSearch && { search: debouncedSearch }),
    // Backend supports an is_active filter; archived customers are those
    // with is_active=false.
    ...(statusFilter !== "all" && { is_active: statusFilter === "active" }),
  }), [page, debouncedSearch, statusFilter]);

  const { list, create, archive, update } = useCustomers(params);

  const customers = list.data?.data?.data ?? [];
  const meta = list.data?.data?.meta;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_DELAY);
  }

  function handleCreate(data: CustomerFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Customer created successfully");
        setShowAddDialog(false);
      },
      onError: (error) => {
        const msg =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        toast.error(msg || "Failed to create customer");
      },
    });
  }

  function handleEdit(customer: Customer) {
    setEditTarget(customer);
    setShowEditDialog(true);
  }
  function handleUpdate(data: CustomerFormData) {
    if (!editTarget) return;
    update.mutate({ id: editTarget.id, data }, {
      onSuccess: () => {
        toast.success("Customer updated successfully");
        setShowEditDialog(false);
        setEditTarget(null);
      },
      onError: () => toast.error("Failed to update customer"),
    });
  }
  function handleArchiveConfirm() {
    if (!archiveTarget) return;
    archive.mutate(archiveTarget.id, {
      onSuccess: () => {
        toast.success("Customer archived successfully");
        setArchiveTarget(null);
      },
      onError: (error) => {
        const msg =
          (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        toast.error(msg || "Failed to archive customer");
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer records"
        action={
          canModify ? (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Customer
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <CustomerStats customers={customers} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search customers..."
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter((v ?? "active") as "active" | "archived" | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

<CustomerTable
        onEdit={handleEdit}
          customers={customers}
          isLoading={list.isLoading}
          onArchive={canModify ? (c) => setArchiveTarget(c) : undefined}
        />

        {list.isError && (
          <ErrorState
            message="Failed to load customers. Please try again."
            onRetry={() => list.refetch()}
          />
        )}

        {!list.isLoading && customers.length === 0 && (
          <EmptyState
            title="No customers found"
            description={
              debouncedSearch
                ? "Try adjusting your search or filters."
                : statusFilter === "archived"
                  ? "No archived customers."
                  : "Add your first customer to get started."
            }
            icon={<Users className="h-8 w-8" />}
            action={
              canModify ? (
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Customer
                </Button>
              ) : undefined
            }
          />
        )}

        {meta && meta.last_page > 1 && (
          <TablePagination
            currentPage={meta.current_page}
            totalPages={meta.last_page}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Add Customer Modal */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={handleCreate}
            isLoading={create.isPending}
            submitLabel="Create Customer"
          />
        </DialogContent>
      </Dialog>

      <EditCustomerDialog
        open={showEditDialog}
        onOpenChange={(o) => { setShowEditDialog(o); if(!o) setEditTarget(null); }}
        customer={editTarget}
        onSubmit={handleUpdate}
        isLoading={update.isPending}
      />
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive Customer"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? This will deactivate the customer but keep their data.`}
        confirmText="Archive Customer"
        variant="destructive"
        onConfirm={handleArchiveConfirm}
        isLoading={archive.isPending}
      />
    </div>
  );
}
