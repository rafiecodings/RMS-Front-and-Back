"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
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
  isLoading?: boolean;
}

export function StaffForm({ initialData, onSubmit, isLoading }: StaffFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = React.useState<StaffFormData>({
    first_name: initialData?.first_name ?? "",
    last_name: initialData?.last_name ?? "",
    email: initialData?.email ?? "",
    password: "",
    phone: initialData?.phone ?? "",
    role: initialData?.role ?? "waiter",
    shift: initialData?.shift,
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
            <label className="text-sm font-medium">First Name *</label>
            <Input
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              placeholder="e.g. Juan"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name *</label>
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
            <label className="text-sm font-medium">Email *</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="juan@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value || undefined)}
              placeholder="+63 912 345 6789"
            />
          </div>
        </div>
        {!initialData && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Password *</label>
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
            <label className="text-sm font-medium">Role *</label>
            <Select value={form.role} onValueChange={(v) => update("role", (v ?? "waiter") as StaffRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Position *</label>
            <Input
              value={form.position ?? ""}
              onChange={(e) => update("position", e.target.value)}
              placeholder="e.g. Head Chef, Senior Waiter"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Shift</label>
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
            <label className="text-sm font-medium">Department</label>
            <Input
              value={form.department ?? ""}
              onChange={(e) => update("department", e.target.value || undefined)}
              placeholder="e.g. Kitchen, Front of House"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hire Date *</label>
            <Input
              type="date"
              value={form.hire_date}
              onChange={(e) => update("hire_date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hourly Rate (₱)</label>
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
            <label className="text-sm font-medium">Commission Rate (%)</label>
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
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !form.first_name || !form.last_name || !form.email}>
          {isLoading ? "Saving..." : initialData ? "Update Staff" : "Add Staff"}
        </Button>
      </div>
    </form>
  );
}

import React from "react";
