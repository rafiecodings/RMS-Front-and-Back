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
  useCreateDiscount,
  useUpdateDiscount,
} from "../hooks/useSettings";
import type { Discount, DiscountFormData } from "../types";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().min(0, "Value must be positive"),
  min_order_amount: z.coerce.number().optional(),
  max_discount_amount: z.coerce.number().optional(),
  max_uses: z.coerce.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean(),
  applies_to: z.enum(["all", "menu_item", "category", "order_type"]),
  description: z.string().optional(),
});

interface DiscountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount?: Discount;
}

export function DiscountForm({ open, onOpenChange, discount }: DiscountFormProps) {
  const createMutation = useCreateDiscount();
  const updateMutation = useUpdateDiscount();

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(formSchema) as Resolver<DiscountFormData>,
    defaultValues: {
      name: "",
      code: "",
      type: "percentage",
      value: 0,
      is_active: true,
      applies_to: "all",
      description: "",
    },
  });

  useEffect(() => {
    if (discount) {
      form.reset({
        name: discount.name,
        code: discount.code ?? "",
        type: discount.type,
        value: discount.value,
        min_order_amount: discount.min_order_amount ?? undefined,
        max_discount_amount: discount.max_discount_amount ?? undefined,
        max_uses: discount.max_uses ?? undefined,
        start_date: discount.start_date ?? undefined,
        end_date: discount.end_date ?? undefined,
        is_active: discount.is_active,
        applies_to: discount.applies_to,
        description: discount.description ?? "",
      });
    } else {
      form.reset({
        name: "",
        code: "",
        type: "percentage",
        value: 0,
        is_active: true,
        applies_to: "all",
        description: "",
      });
    }
  }, [discount, form]);

  const onSubmit = (data: DiscountFormData) => {
    if (discount) {
      updateMutation.mutate(
        { id: discount.id, data },
        {
          onSuccess: () => {
            toast.success("Discount updated");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to save discount"),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Discount created");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to save discount"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{discount ? "Edit Discount" : "Add Discount"}</DialogTitle>
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
                    <Input placeholder="e.g. Senior Discount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promo Code (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SENIOR20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_order_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Order (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_uses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Uses</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                      <option value="all">All Orders</option>
                      <option value="menu_item">Specific Menu Item</option>
                      <option value="category">Category</option>
                      <option value="order_type">Order Type</option>
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
                {discount ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
