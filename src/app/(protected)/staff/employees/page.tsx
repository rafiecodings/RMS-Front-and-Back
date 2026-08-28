"use client";

import { useState } from "react";
import { PageHeader, ConfirmDialog, LoadingSpinner } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StaffTable, StaffForm, StaffDetail } from "@/features/staff";
import { useStaff, useUsers } from "@/lib/hooks";
import { Plus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { canEdit as canEditRole } from "@/lib/utils/permissions";
import { toast } from "sonner";
import type { Staff, StaffFormData } from "@/lib/types";

/** Extract the most user-relevant message from an axios/API error. */
function extractApiError(err: unknown): string {
  const e = err as {
    response?: {
      status?: number;
      data?: { message?: string; errors?: Record<string, string[]> };
    };
    message?: string;
  };
  const fieldErrors = e?.response?.data?.errors;
  if (fieldErrors) {
    const first = Object.values(fieldErrors)[0]?.[0];
    if (first) return first;
  }
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.response?.status === 422) return "Please check the highlighted fields.";
  if (e?.response?.status && e.response.status >= 500)
    return "Server error. Please try again shortly.";
  return "";
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState<Staff | null>(null);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Staff | null>(null);

  const { user } = useAuth();
  const role = user?.role;
  const canManage = canEditRole(role, "staff"); // admin + manager per backend rules
  // End-to-end Add Staff requires creating a login account via /admin/users,
  // which the backend restricts to role:admin.
  const isAdmin = role === "admin";

  const { list, update, create: createStaff } = useStaff({
    page,
    per_page: 20,
    search: search || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
  });
  const { create: createUser } = useUsers();

  const staff = list.data?.data?.data ?? [];
  const totalPages = list.data?.data?.meta?.last_page ?? 1;

  async function handleAdd(data: StaffFormData) {
    if (!data.password) {
      toast.error("Password is required");
      return;
    }
    try {
      const userResult = await createUser.mutateAsync({
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        password: data.password,
        password_confirmation: data.password,
        role: data.role,
      });

      await createStaff.mutateAsync({
        ...data,
        user_id: userResult.data.data.id,
        employee_id: `EMP-${Date.now().toString(36).toUpperCase()}`,
        position: data.position || data.role,
      });

      toast.success("Staff member added successfully");
      setAddOpen(false);
    } catch (error) {
      // Surface backend validation (422) / conflict messages verbatim:
      // duplicate email, invalid email, missing role, server error, etc.
      toast.error(extractApiError(error) || "Failed to add staff member");
    }
  }

  function handleEditSubmit(data: StaffFormData) {
    if (!editStaff) return;
    update.mutate(
      {
        id: editStaff.id,
        data: {
          position: data.position || data.role,
          department: data.department,
          phone: data.phone,
          hourly_rate: data.hourly_rate,
          commission_rate: data.commission_rate,
          hire_date: data.hire_date,
        },
      },
      {
        onSuccess: () => {
          toast.success("Staff member updated successfully");
          setEditStaff(null);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update staff member");
        },
      }
    );
  }

  function handleToggleActive(target: Staff) {
    if (target.user_id && target.user_id === user?.id) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    setToggleTarget(target);
  }

  function confirmToggleActive() {
    if (!toggleTarget) return;
    update.mutate(
      { id: toggleTarget.id, data: { is_active: !toggleTarget.is_active } as Partial<StaffFormData> },
      {
        onSuccess: () => {
          toast.success(
            toggleTarget.is_active
              ? "Staff member deactivated"
              : "Staff member activated"
          );
          setToggleTarget(null);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update status");
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        description="Manage staff profiles, roles, and assignments"
        action={
          isAdmin && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Staff
            </Button>
          )
        }
      />

      <StaffTable
        staff={staff}
        isLoading={list.isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        roleFilter={roleFilter}
        onRoleFilterChange={(v) => { setRoleFilter(v); setPage(1); }}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onView={(s) => setViewStaff(s)}
        onEdit={(s) => setEditStaff(s)}
        onToggleActive={handleToggleActive}
        canEdit={canManage}
      />

      {/* Add Staff modal */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) setAddOpen(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <StaffForm
            key={addOpen ? "add-open" : "add-closed"}
            onSubmit={handleAdd}
            onCancel={() => setAddOpen(false)}
            isLoading={createStaff.isPending || createUser.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* View Staff modal */}
      <Dialog open={!!viewStaff} onOpenChange={(open) => { if (!open) setViewStaff(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {viewStaff ? (
            <StaffDetail
              staff={viewStaff}
              canEdit={canManage}
              onEdit={canManage ? () => { setEditStaff(viewStaff); setViewStaff(null); } : undefined}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Staff modal */}
      <Dialog open={!!editStaff} onOpenChange={(open) => { if (!open) setEditStaff(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {editStaff && (
            <StaffForm
              key={`edit-${editStaff.id}`}
              initialData={editStaff}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditStaff(null)}
              isLoading={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Activate / Deactivate confirmation */}
      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => { if (!open) setToggleTarget(null); }}
        title={toggleTarget?.is_active ? "Deactivate staff member" : "Activate staff member"}
        description={
          toggleTarget?.is_active
            ? `${toggleTarget?.user?.name ?? "This staff member"} will be marked inactive and can no longer be scheduled or clock in.`
            : `${toggleTarget?.user?.name ?? "This staff member"} will be reactivated and available for scheduling.`
        }
        confirmText={toggleTarget?.is_active ? "Deactivate" : "Activate"}
        variant={toggleTarget?.is_active ? "destructive" : "default"}
        isLoading={update.isPending}
        onConfirm={confirmToggleActive}
      />
    </div>
  );
}
