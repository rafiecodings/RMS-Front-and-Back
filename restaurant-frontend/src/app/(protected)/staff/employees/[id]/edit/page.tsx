"use client";

import { useParams, useRouter } from "next/navigation";
import { FormPageSkeleton, PageHeader, EmptyState } from "@/components/shared";
import { StaffForm } from "@/features/staff";
import { useStaffMember, useStaff } from "@/lib/hooks";
import { toast } from "sonner";
import type { StaffFormData } from "@/lib/types";
import { UserX } from "lucide-react";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: staff, isLoading } = useStaffMember(id);
  const { update } = useStaff();

  if (isLoading) {
    return (
      <FormPageSkeleton />
    );
  }

  if (!staff) {
    return (
      <EmptyState
        title="Staff member not found"
        icon={<UserX className="h-8 w-8" />}
        description="This staff member may have been removed."
      />
    );
  }

  function handleSubmit(data: StaffFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Staff member updated successfully");
          router.push(`/staff/employees/${id}`);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to update staff member");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${staff.user?.name ?? staff.employee_id ?? "Unknown"}`}
        description="Update staff profile"
      />
      <StaffForm
        initialData={staff}
        onSubmit={handleSubmit}
        isLoading={update.isPending}
      />
    </div>
  );
}
