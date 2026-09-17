"use client";

import { useState } from "react";
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStaff, useStaffCommissions } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils";
import { DollarSign } from "lucide-react";

export default function CommissionsPage() {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const { list: staffList } = useStaff({ per_page: 200 });
  const staff = staffList.data?.data?.data ?? [];
  const staffLoading = staffList.isLoading;
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);
  const staffDisplay = selectedStaffId
    ? selectedStaff
      ? `${selectedStaff.employee_id} — ${selectedStaff.user?.name ?? selectedStaff.employee_id}`
      : staffLoading
        ? "Loading..."
        : "Unavailable staff"
    : null;

  const { data: commissions, isLoading, isError, refetch } = useStaffCommissions(selectedStaffId);

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Commissions" description="View recorded staff commission entries" />

      <div className="w-full sm:w-[320px]">
        <Select value={selectedStaffId} onValueChange={(v) => setSelectedStaffId(v ?? "")}>
          <SelectTrigger>
            {staffDisplay ? <span className="truncate">{staffDisplay}</span> : <SelectValue placeholder="Select a staff member" />}
          </SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id} className="truncate">
                {s.employee_id} — {s.user?.name ?? s.employee_id}
              </SelectItem>
            ))}
            {selectedStaffId && !selectedStaff && (
              <SelectItem value={selectedStaffId} disabled className="truncate">
                {staffDisplay}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {!selectedStaffId ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">Select a staff member to view commission records</div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState message="Failed to load commissions. Please try again." onRetry={() => refetch()} />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Total Commission
              </CardTitle>
              <Badge variant="secondary">{commissions?.pagination.total ?? 0} entries</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(commissions?.total_commission ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Recorded commission total for selected employee</p>
            </CardContent>
          </Card>

          {!commissions || commissions.items.length === 0 ? (
            <EmptyState title="No commission records found for this employee." description="Commission entries will appear here when recorded." />
          ) : (
            <Card>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.items.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString("en-PH") : "—"}
                          </TableCell>
                          <TableCell className="font-medium">{c.order?.order_number ?? "—"}</TableCell>
                          <TableCell>
                            {c.type ? <Badge variant="outline" className="capitalize">{c.type.replace(/_/g, " ")}</Badge> : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(c.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
