"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Star, Power, Pencil } from "lucide-react";
import { TableLoadingRows, TableEmptyRow, TablePagination } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "./RoleBadge";
import { safeNumber } from "@/lib/utils";
import type { Staff, StaffRole } from "@/lib/types";

interface StaffTableProps {
  staff: Staff[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onView?: (staff: Staff) => void;
  onEdit?: (staff: Staff) => void;
  onToggleActive?: (staff: Staff) => void;
  canEdit?: boolean;
}

const ROLES: { value: string; label: string }[] = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "inventory_staff", label: "Inventory Staff" },
  { value: "waiter", label: "Waiter" },
  { value: "cashier", label: "Cashier" },
  { value: "kitchen_staff", label: "Kitchen Staff" },
];

export function StaffTable({
  staff,
  isLoading,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  currentPage,
  totalPages,
  onPageChange,
  onView,
  onEdit,
  onToggleActive,
  canEdit = false,
}: StaffTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search staff..."
            className="h-9 pl-8 w-full"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => onRoleFilterChange(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 max-w-full">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Rating</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center sticky right-0 bg-muted/50">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows colSpan={7} />
            ) : staff.length === 0 ? (
              <TableEmptyRow message="No staff members found" colSpan={7} />
            ) : (
              staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[160px]">{s.user?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{s.user?.email ?? "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={(s.user?.role ?? "waiter") as StaffRole} />
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {s.position ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {s.average_rating != null ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm tabular-nums">{safeNumber(s.average_rating).toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.is_active ? "default" : "secondary"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center sticky right-0 bg-background">
                    <div className="flex items-center justify-center gap-1">
                      {onView ? (
                        <Button variant="ghost" size="icon-sm" onClick={() => onView(s)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon-sm" render={<Link href={`/staff/employees/${s.id}`} />}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && onEdit && (
                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && onToggleActive && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onToggleActive(s)}
                          title={s.is_active ? "Deactivate staff member" : "Activate staff member"}
                          className={s.is_active ? "text-emerald-600" : "text-muted-foreground"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading staff">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No staff members found</div>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-4 space-y-3 min-w-0">
              <div className="min-w-0">
                <p className="font-medium truncate">{s.user?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground truncate max-w-full">{s.user?.email ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm min-w-0">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <div className="mt-1 truncate"><RoleBadge role={(s.user?.role ?? "waiter") as StaffRole} /></div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Shift</p>
                  <p className="capitalize truncate">{s.position ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="truncate">{s.phone ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={s.is_active ? "default" : "secondary"} className="mt-1">{s.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onView ? (
                  <Button variant="outline" size="sm" onClick={() => onView(s)} className="gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                ) : (
                  <Button variant="outline" size="sm" render={<Link href={`/staff/employees/${s.id}`} />} className="gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                )}
                {canEdit && onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(s)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                )}
                {canEdit && onToggleActive && (
                  <Button variant={s.is_active ? "outline" : "default"} size="sm" onClick={() => onToggleActive(s)} className="gap-1">
                    <Power className="h-3.5 w-3.5" /> {s.is_active ? "Deactivate" : "Activate"}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
