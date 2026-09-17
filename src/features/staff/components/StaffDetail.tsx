"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "./RoleBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil, ArrowLeft, Mail, Phone, Calendar, BriefcaseBusiness } from "lucide-react";
import type { Staff, StaffRole } from "@/lib/types";

interface StaffDetailProps {
  staff: Staff;
  onEdit?: () => void;
  canEdit?: boolean;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium break-words">{children}</div>
    </div>
  );
}

export function StaffDetail({ staff, onEdit, canEdit = true }: StaffDetailProps) {
  const email = staff.user?.email ?? null;
  const phone = staff.phone ?? null;

  return (
    <div className="space-y-6">
      {/* PROFILE SUMMARY */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {!onEdit && (
            <Button variant="ghost" size="icon-sm" render={<Link href="/staff/employees" />}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {staff.user?.name ?? "Unknown"}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              ID: {staff.employee_id ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RoleBadge role={(staff.user?.role ?? "waiter") as StaffRole} />
          <Badge variant={staff.is_active ? "default" : "secondary"}>
            {staff.is_active ? "Active" : "Inactive"}
          </Badge>
          {canEdit &&
            (onEdit ? (
              <Button onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ) : (
              <Button render={<Link href={`/staff/employees/${staff.id}/edit`} />}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ))}
        </div>
      </div>

      {/* CONTACT INFORMATION — emails/phones wrap instead of overlapping */}
      <div className="rounded-lg border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Contact Information
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">{email ?? "Not provided"}</Field>
          <Field label="Contact Number">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {phone ?? "Not provided"}
            </span>
          </Field>
        </div>
      </div>

      {/* EMPLOYMENT */}
      <div className="rounded-lg border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          Employment
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Position">{staff.position ?? "Not provided"}</Field>
          <Field label="Department">{staff.department ?? "Not provided"}</Field>
          <Field label="Employment Type">
            {staff.employment_type
              ? staff.employment_type.replace(/_/g, " ")
              : "Not provided"}
          </Field>
          <Field label="Hire Date">{formatDate(staff.hire_date)}</Field>
        </div>
      </div>

      {/* PERFORMANCE SUMMARY (real tracked metrics only) */}
      <div className="rounded-lg border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Performance Summary
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rating">
            {staff.average_rating != null
              ? `${Number(staff.average_rating).toFixed(1)} / 5.0`
              : "Not provided"}
          </Field>
          <Field label="Orders Handled">
            <span className="tabular-nums">{staff.total_orders_handled ?? 0}</span>
          </Field>
          <Field label="Tips Earned">
            {staff.total_tips_earned != null
              ? formatCurrency(staff.total_tips_earned)
              : "Not provided"}
          </Field>
        </div>
      </div>
    </div>
  );
}
