"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader, LoadingSpinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared";
import {
  ArrowLeft,
  Pencil,
  Users,
  Accessibility,
  Hash,
} from "lucide-react";
import { useTables } from "@/lib/hooks";

export default function TableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { list } = useTables();

  const tables = list.data ?? [];
  const table = tables.find((t) => t.id === id);

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!table) {
    return (
      <div>
        <PageHeader
          title="Table Not Found"
          description="The table you're looking for doesn't exist."
          action={
            <Button variant="outline" size="sm" render={<Link href="/tables" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Tables
            </Button>
          }
        />
      </div>
    );
  }

return (
      <div>
        <PageHeader
          title={`Table ${table.number}`}
          description={table.name}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" render={<Link href="/tables" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <Button size="sm" render={<Link href={`/tables/${id}/edit`} />}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Table Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Table Number</p>
                  <p className="text-sm font-medium">{table.number}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="text-sm font-medium">{table.capacity} guests</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Accessibility className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Accessible</p>
                  <p className="text-sm font-medium">
                    {table.is_wheelchair_accessible ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-1">
              <div className="text-center">
                <StatusBadge status={table.status} className="text-sm px-3 py-1" />
                <p className="text-xs text-muted-foreground mt-2">Current Status</p>
              </div>
            </CardContent>
          </Card>

          {table.current_order_id && (
            <Card>
              <CardContent className="pt-1">
                <div className="text-center">
                  <p className="text-sm font-medium">Active Order</p>
                  <Link
                    href={`/orders/${table.current_order_id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View Order
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
