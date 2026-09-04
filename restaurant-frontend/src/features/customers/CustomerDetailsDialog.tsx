"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, ErrorState } from "@/components/shared";
import { CustomerDetail } from "./CustomerDetail";
import { ExternalLink, Pencil, Archive, X } from "lucide-react";
import type { Customer } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
}

export function CustomerDetailsDialog({ open, onOpenChange, customer, isLoading, isError, onRetry, canEdit, onEdit, onArchive }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold truncate">{customer?.name ?? "Customer Details"}</DialogTitle>
              {customer && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] px-1.5 py-0">Registered Customer</Badge>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${customer.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{customer.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : isError ? (
            <ErrorState message="Failed to load customer details." onRetry={onRetry} />
          ) : !customer ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Customer not found.</p>
          ) : (
            <CustomerDetail customer={customer} reservations={customer.reservations ?? []} canEdit={false} />
          )}
        </div>
        {customer && !isLoading && !isError && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t bg-muted/20">
            <Link href={`/customers/${customer.id}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5" /> Open full page
            </Link>
            <div className="flex items-center gap-2">
              {canEdit && onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1.5" /> Edit
                </Button>
              )}
              {canEdit && onArchive && (
                <Button variant="outline" size="sm" onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-1.5" /> Archive
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-1.5" /> Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
