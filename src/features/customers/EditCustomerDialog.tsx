"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerForm } from "./CustomerForm";
import type { Customer, CustomerFormData } from "@/lib/types";

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSubmit: (data: CustomerFormData) => void;
  isLoading?: boolean;
}

export function EditCustomerDialog({ open, onOpenChange, customer, onSubmit, isLoading }: EditCustomerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        {customer && (
          <CustomerForm
            initialData={customer}
            onSubmit={onSubmit}
            isLoading={isLoading}
            submitLabel="Update Customer"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
