"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  useCreateTax,
  useUpdateTax,
} from "../hooks/useSettings";
import type { Tax, TaxFormData } from "../types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  type: z.enum(["percentage", "fixed"]),
  is_compound: z.boolean(),
  is_active: z.boolean(),
  applies_to: z.enum(["all", "food", "beverage", "service"]),
  description: z.string().optional(),
});

interface TaxFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax?: Tax;
}

export function TaxForm({ open, onOpenChange, tax }: TaxFormProps) {
  const createMutation = useCreateTax();
  const updateMutation = useUpdateTax();

  const form = useForm<TaxFormData>({
    resolver: zodResolver(formSchema) as Resolver<TaxFormData>,
    defaultValues: {
      name: "",
      rate: 12,
      type: "percentage",
      is_compound: false,
      is_active: true,
      applies_to: "all",
      description: "",
    },
  });

  useEffect(() => {
    if (tax) {
      form.reset({
        name: tax.name,
        rate: tax.rate,
        type: tax.type,
        is_compound: tax.is_compound,
        is_active: tax.is_active,
        applies_to: tax.applies_to,
        description: tax.description ?? "",
      });
    } else {
      form.reset({
        name: "",
        rate: 12,
        type: "percentage",
        is_compound: false,
        is_active: true,
        applies_to: "all",
        description: "",
      });
    }
  }, [tax, form]);

  const onSubmit = (data: TaxFormData) => {
    if (tax) {
      updateMutation.mutate(
        { id: tax.id, data },
        {
          onSuccess: () => {
            toast.success("Tax updated");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to save tax"),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Tax created");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to save tax"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tax ? "Edit Tax" : "Add Tax"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. VAT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...field}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₱)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="applies_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applies To</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    >
                      <option value="all">All Items</option>
                      <option value="food">Food Only</option>
                      <option value="beverage">Beverages Only</option>
                      <option value="service">Service Charge</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_compound"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FormLabel className="!mt-0">Compound</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {tax ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
