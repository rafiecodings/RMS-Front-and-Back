"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useDiscounts, useDeleteDiscount } from "../hooks/useSettings";
import { DiscountForm } from "./DiscountForm";
import { ConfirmDialog } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";
import type { Discount } from "../types";

export function DiscountTable() {
  const { data: discounts, isLoading } = useDiscounts();
  const deleteMutation = useDeleteDiscount();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Discounts</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingDiscount(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Discount
          </Button>
        </CardHeader>
        <CardContent>
          {!discounts || discounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No discounts configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-medium">{discount.name}</TableCell>
                    <TableCell>
                      {discount.code ? (
                        <Badge variant="outline">{discount.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {discount.type === "percentage"
                        ? `${discount.value}%`
                        : formatCurrency(discount.value)}
                    </TableCell>
                    <TableCell>
                      {discount.min_order_amount
                        ? formatCurrency(discount.min_order_amount)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {discount.used_count}
                      {discount.max_uses ? ` / ${discount.max_uses}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={discount.is_active ? "default" : "secondary"}>
                        {discount.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setEditingDiscount(discount);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteId(discount.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DiscountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        discount={editingDiscount}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Discount"
        description="Are you sure you want to delete this discount?"
        confirmText="Delete"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            });
          }
        }}
      />
    </>
  );
}
