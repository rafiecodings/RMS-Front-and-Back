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
import { useTaxes, useDeleteTax } from "../hooks/useSettings";
import { TaxForm } from "./TaxForm";
import { ConfirmDialog } from "@/components/shared";
import { LoadingSpinner } from "@/components/shared";
import type { Tax } from "../types";

export function TaxTable() {
  const { data: taxes, isLoading } = useTaxes();
  const deleteMutation = useDeleteTax();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Taxes</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingTax(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tax
          </Button>
        </CardHeader>
        <CardContent>
          {!taxes || taxes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No taxes configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>
                      {tax.type === "percentage" ? `${tax.rate}%` : `₱${tax.rate}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {tax.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {tax.applies_to.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tax.is_active ? "default" : "secondary"}>
                        {tax.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setEditingTax(tax);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteId(tax.id)}
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

      <TaxForm
        open={formOpen}
        onOpenChange={setFormOpen}
        tax={editingTax}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Tax"
        description="Are you sure you want to delete this tax? This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
              },
            });
          }
        }}
      />
    </>
  );
}
