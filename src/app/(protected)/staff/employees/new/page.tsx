"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { StaffForm } from "@/features/staff";
import { useStaff, useUsers } from "@/lib/hooks";
import { toast } from "sonner";
import type { StaffFormData } from "@/lib/types";

export default function NewEmployeePage() {
  const router = useRouter();
  const { create: createStaff } = useStaff();
  const { create: createUser } = useUsers();

  async function handleSubmit(data: StaffFormData) {
    const enableAccess = data.enable_system_access ?? false;
    const employeeId = `EMP-${Date.now().toString(36).toUpperCase()}`;
    const staffPayload = {
      ...data,
      employee_id: employeeId,
      position: data.position || data.role,
    };

    try {
      if (enableAccess) {
        if (!data.password) {
          toast.error("Password is required to enable system access");
          return;
        }

        const userResult = await createUser.mutateAsync({
          name: `${data.first_name} ${data.last_name}`.trim(),
          email: data.email,
          password: data.password,
          password_confirmation: data.password,
          role: data.role,
        });

        const userId = userResult.data.data.id;

        await createStaff.mutateAsync({
          ...staffPayload,
          user_id: userId,
        });
      } else {
        // No login account: create the staff profile only (user_id stays null).
        await createStaff.mutateAsync(staffPayload);
      }

      toast.success("Staff member added successfully");
      router.push("/staff/employees");
    } catch {
      toast.error("Failed to add staff member");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Staff Member"
        description="Create a new staff profile"
      />
      <StaffForm onSubmit={handleSubmit} isLoading={createStaff.isPending || createUser.isPending} />
    </div>
  );
}
