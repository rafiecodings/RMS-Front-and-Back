"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "./RoleBadge";
import { formatCurrency, formatDate, formatDateTime, safeNumber } from "@/lib/utils";
import { Pencil, ArrowLeft, Mail, Phone, Star, Calendar, DollarSign } from "lucide-react";
import type { Staff } from "@/lib/types";

interface StaffDetailProps {
  staff: Staff;
}

export function StaffDetail({ staff }: StaffDetailProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{staff.first_name} {staff.last_name}</h2>
            <p className="text-sm text-muted-foreground">{staff.employee_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={staff.is_active ? "default" : "secondary"}>
            {staff.is_active ? "Active" : "Inactive"}
          </Badge>
          <Button render={<Link href={`/staff/employees/${staff.id}/edit`} />}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Mail className="h-3.5 w-3.5" />
            Email
          </div>
          <p className="font-medium text-sm">{staff.email}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Phone className="h-3.5 w-3.5" />
            Phone
          </div>
          <p className="font-medium text-sm">{staff.phone ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Star className="h-3.5 w-3.5" />
            Rating
          </div>
          <p className="font-medium text-sm">
            {staff.average_rating != null ? `${safeNumber(staff.average_rating).toFixed(1)} / 5.0` : "—"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3.5 w-3.5" />
            Hired
          </div>
          <p className="font-medium text-sm">{formatDate(staff.hire_date)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Role</p>
          <RoleBadge role={staff.role} />
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Shift</p>
          <p className="font-medium capitalize">{staff.shift ?? "Not assigned"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            Hourly Rate
          </div>
          <p className="font-medium">{staff.hourly_rate != null ? formatCurrency(staff.hourly_rate) : "—"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Commission Rate</p>
          <p className="font-medium">{staff.commission_rate != null ? `${staff.commission_rate}%` : "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Orders Handled</p>
          <p className="font-medium tabular-nums">{staff.total_orders_handled ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Tips Earned</p>
          <p className="font-medium tabular-nums">{staff.total_tips_earned != null ? formatCurrency(staff.total_tips_earned) : "—"}</p>
        </div>
      </div>
    </div>
  );
}
