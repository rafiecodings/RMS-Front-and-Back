"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components/shared";
import { StaffForm } from "@/features/staff";
import { useStaff } from "@/lib/hooks";
import { toast } from "sonner";
import type { StaffFormData } from "@/lib/types";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { list, update } = useStaff({ per_page: 200 });
  const staffList = list.data?.data?.data ?? [];
  const staff = staffList.find((s) => s.id === id);

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!staff) {
    return (
      <EmptyState
        title="Staff member not found"
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
        title={`Edit ${staff.first_name} ${staff.last_name}`}
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
