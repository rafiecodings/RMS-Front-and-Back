"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { StaffPerformanceRanking } from "../types";

interface StaffPerformanceTableProps {
  data: StaffPerformanceRanking[];
}

export function StaffPerformanceTable({ data }: StaffPerformanceTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Staff Performance Ranking</CardTitle>
        <span className="text-xs text-muted-foreground">
          Ranked by revenue generated
        </span>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
            No performance data available
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg Ticket</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">Shifts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((staff, index) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell>
                      {staff.role ? (
                        <Badge variant="outline" className="capitalize">
                          {staff.role.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">{staff.position || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{staff.orders_handled}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(staff.revenue_generated)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(staff.avg_ticket)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {staff.attendance_rate != null
                        ? `${staff.attendance_rate.toFixed(1)}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">{staff.shifts_scheduled}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
