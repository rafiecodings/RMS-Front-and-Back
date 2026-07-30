"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  useCreateRole,
  useUpdateRole,
  usePermissions,
} from "../hooks/useSettings";
import type { Role, RoleFormData } from "../types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  display_name: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
  permission_ids: z.array(z.string()),
});

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function RoleForm({ open, onOpenChange, role }: RoleFormProps) {
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const { data: permissions } = usePermissions();

  const form = useForm<RoleFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      display_name: "",
      description: "",
      permission_ids: [],
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        display_name: role.display_name,
        description: role.description ?? "",
        permission_ids: role.permissions.map((p) => p.id),
      });
    } else {
      form.reset({
        name: "",
        display_name: "",
        description: "",
        permission_ids: [],
      });
    }
  }, [role, form]);

  const onSubmit = (data: RoleFormData) => {
    if (role) {
      updateMutation.mutate(
        { id: role.id, data },
        {
          onSuccess: () => {
            toast.success("Role updated");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to save role"),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Role created");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to save role"),
      });
    }
  };

  const togglePermission = (permId: string) => {
    const current = form.getValues("permission_ids");
    if (current.includes(permId)) {
      form.setValue(
        "permission_ids",
        current.filter((id) => id !== permId)
      );
    } else {
      form.setValue("permission_ids", [...current, permId]);
    }
  };

  const watchedPermissionIds = form.watch("permission_ids");
  const modules = permissions
    ? [...new Set(permissions.map((p) => p.module))]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Add Role"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. floor_manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Floor Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Permissions</FormLabel>
              {modules.map((mod) => {
                const perms = permissions?.filter((p) => p.module === mod) ?? [];
                return (
                  <div key={mod} className="rounded-lg border p-3 space-y-2">
                    <div className="text-sm font-medium capitalize">
                      {mod.replace(/_/g, " ")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={watchedPermissionIds.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="h-3.5 w-3.5 rounded border-input"
                          />
                          {perm.display_name}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {role ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
