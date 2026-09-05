"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StaffForm } from "./StaffForm";
import { useStaff, useUsers } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StaffFormData } from "@/lib/types";

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStaffDialog({ open, onOpenChange }: AddStaffDialogProps) {
  const { create: createStaff } = useStaff();
  const { create: createUser } = useUsers();
  const queryClient = useQueryClient();
  const formRef = React.useRef<HTMLFormElement>(null);
  const isLoading = createStaff.isPending || createUser.isPending;

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
        await createStaff.mutateAsync({ ...staffPayload, user_id: userId });
      } else {
        await createStaff.mutateAsync(staffPayload);
      }
      toast.success("Staff member added successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["shift-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      onOpenChange(false);
    } catch {
      toast.error("Failed to add staff member");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>Create a new staff profile and optionally provide system access.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <StaffForm
            key={open ? "add-open" : "add-closed"}
            ref={formRef}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            hideFooter
          />
        </div>
        <div className="shrink-0 flex justify-end gap-2 border-t bg-muted/30 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => formRef.current?.requestSubmit()} disabled={isLoading}>
            {isLoading ? "Saving..." : "Create Staff"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
