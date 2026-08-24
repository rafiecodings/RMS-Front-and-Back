"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAFF_ROLES, STAFF_SHIFTS } from "@/lib/types";
import type { Staff, StaffFormData, StaffRole, StaffShift } from "@/lib/types";

interface StaffFormProps {
  initialData?: Staff;
  onSubmit: (data: StaffFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function StaffForm({ initialData, onSubmit, onCancel, isLoading }: StaffFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = React.useState<StaffFormData>({
    employee_id: initialData?.employee_id ?? "",
    first_name: initialData?.user?.name?.split(" ")[0] ?? "",
    last_name: initialData?.user?.name?.split(" ").slice(1).join(" ") ?? "",
    email: initialData?.user?.email ?? "",
    password: "",
    phone: initialData?.phone ?? "",
    role: (initialData?.user?.role ?? "waiter") as StaffRole,
    shift: undefined,
    position: initialData?.position ?? "",
    department: initialData?.department ?? "",
    hourly_rate: initialData?.hourly_rate,
    commission_rate: initialData?.commission_rate,
    hire_date: initialData?.hire_date ?? today,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  function update<K extends keyof StaffFormData>(key: K, value: StaffFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">First Name *</Label>
            <Input
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              placeholder="e.g. Juan"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Last Name *</Label>
            <Input
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              placeholder="e.g. Dela Cruz"
              required
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="juan@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phone</Label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value || undefined)}
              placeholder="+63 912 345 6789"
            />
          </div>
        </div>
        {!initialData && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Password *</Label>
            <Input
              type="password"
              value={form.password ?? ""}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Employment Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Role {initialData ? "(managed via user accounts)" : "*"}
            </Label>
            <Select
              value={form.role}
              onValueChange={(v) => update("role", (v ?? "waiter") as StaffRole)}
              disabled={!!initialData}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {initialData && (
              <p className="text-xs text-muted-foreground">
                Role changes are restricted to Admin via user account management.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Position *</Label>
            <Input
              value={form.position ?? ""}
              onChange={(e) => update("position", e.target.value)}
              placeholder="e.g. Head Chef, Senior Waiter"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Shift</Label>
            <Select value={form.shift ?? "none"} onValueChange={(v) => update("shift", v === "none" || v === null ? undefined : v as StaffShift)}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned</SelectItem>
                {STAFF_SHIFTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label} ({s.time})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Department</Label>
            <Input
              value={form.department ?? ""}
              onChange={(e) => update("department", e.target.value || undefined)}
              placeholder="e.g. Kitchen, Front of House"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hire Date *</Label>
            <Input
              type="date"
              value={form.hire_date}
              onChange={(e) => update("hire_date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hourly Rate (â‚±)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.hourly_rate ?? ""}
              onChange={(e) => update("hourly_rate", e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Commission Rate (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.commission_rate ?? ""}
              onChange={(e) => update("commission_rate", e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : window.history.back())}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !form.first_name || !form.last_name || !form.email}>
          {isLoading ? "Saving..." : initialData ? "Update Staff" : "Add Staff"}
        </Button>
      </div>
    </form>
  );
}

