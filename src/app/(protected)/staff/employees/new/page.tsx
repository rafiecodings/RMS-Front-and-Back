"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { StaffForm } from "@/features/staff";
import { useStaff } from "@/lib/hooks";
import { toast } from "sonner";
import type { StaffFormData } from "@/lib/types";

export default function NewEmployeePage() {
  const router = useRouter();
  const { create } = useStaff();

  function handleSubmit(data: StaffFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Staff member added successfully");
        router.push("/staff/employees");
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to add staff member");
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Staff Member"
        description="Create a new staff profile"
      />
      <StaffForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
