"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared";
import { Trash2, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type {
  OrderFormData,
  OrderItemFormData,
  OrderType,
  MenuItem,
  Customer,
  Table,
} from "@/lib/types";

interface OrderFormProps {
  initialData?: OrderFormData & { items: OrderItemFormData[] };
  menuItems: MenuItem[];
  customers: Customer[];
  tables: Table[];
  onSubmit: (data: OrderFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  order_type?: string;
  items?: string;
}

export function OrderForm({
  initialData,
  menuItems,
  customers,
  tables,
  onSubmit,
  isLoading,
  submitLabel = "Place Order",
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    order_type: initialData?.order_type ?? "dine_in",
    customer_id: initialData?.customer_id,
    table_id: initialData?.table_id,
    items: initialData?.items ?? [],
    notes: initialData?.notes,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [itemSearch, setItemSearch] = useState("");

  const availableTables = tables.filter(
    (t) => t.status === "available" || t.id === formData.table_id
  );

  const filteredMenuItems = menuItems.filter(
    (item) =>
      item.is_available &&
      item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.items.length) errs.items = "Add at least one item";
    return errs;
  }

  function addItem(menuItem: MenuItem) {
    const existing = formData.items.find(
      (i) => i.menu_item_id === menuItem.id
    );
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.menu_item_id === menuItem.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            menu_item_id: menuItem.id,
            quantity: 1,
            unit_price: menuItem.price,
            notes: undefined,
          },
        ],
      }));
    }
    setItemSearch("");
  }

  function updateItemQuantity(menuItemId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.menu_item_id === menuItemId ? { ...i, quantity } : i
      ),
    }));
  }

  function removeItem(menuItemId: string) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.menu_item_id !== menuItemId),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ items: true });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        customer_id: formData.customer_id || undefined,
        table_id: formData.table_id || undefined,
        notes: formData.notes?.trim() || undefined,
      });
    }
  }

  const itemTotal = formData.items.reduce(
    (sum, i) => sum + i.unit_price * i.quantity,
    0
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Order Type *</Label>
          <Select
            value={formData.order_type}
            onValueChange={(v) =>
              v &&
              setFormData((prev) => ({
                ...prev,
                order_type: v as OrderType,
                table_id: v === "dine_in" ? prev.table_id : undefined,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dine_in">Dine In</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
          {touched.order_type && errors.order_type && (
            <p className="text-xs text-destructive">{errors.order_type}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Customer (optional)</Label>
          <Select
            value={formData.customer_id ?? ""}
            onValueChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                customer_id: v || undefined,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Walk-in customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Walk-in Customer</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.customer_type === "vip" && (
                    <Badge
                      variant="secondary"
                      className="ml-1 text-[9px] px-1 py-0"
                    >
                      VIP
                    </Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.order_type === "dine_in" && (
          <div className="space-y-2">
            <Label>Table</Label>
            <Select
              value={formData.table_id ?? ""}
              onValueChange={(v) =>
                setFormData((prev) => ({
                  ...prev,
                  table_id: v || undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Table</SelectItem>
                {availableTables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    T{t.number} — {t.capacity} seats
                  </SelectItem>
                ))}
                {availableTables.length === 0 && (
                  <SelectItem value="none" disabled>
                    No available tables
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Menu Items *</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search menu items to add..."
            className="pl-8"
          />
        </div>

        {itemSearch && (
          <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
            {filteredMenuItems.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No items found
              </div>
            ) : (
              filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  className="flex items-center justify-between w-full p-3 hover:bg-muted/50 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category?.name ?? "Uncategorized"}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0 ml-4">
                    {formatCurrency(item.price)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {touched.items && errors.items && (
          <p className="text-xs text-destructive">{errors.items}</p>
        )}
      </div>

      {formData.items.length > 0 && (
        <div className="space-y-2">
          {formData.items.map((orderItem) => {
            const menuItem = menuItems.find(
              (m) => m.id === orderItem.menu_item_id
            );
            return (
              <div
                key={orderItem.menu_item_id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {menuItem?.name ?? "Unknown Item"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(orderItem.unit_price)} each
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() =>
                      updateItemQuantity(
                        orderItem.menu_item_id,
                        orderItem.quantity - 1
                      )
                    }
                  >
                    −
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {orderItem.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() =>
                      updateItemQuantity(
                        orderItem.menu_item_id,
                        orderItem.quantity + 1
                      )
                    }
                  >
                    +
                  </Button>
                </div>

                <span className="text-sm font-medium w-20 text-right">
                  {formatCurrency(orderItem.unit_price * orderItem.quantity)}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(orderItem.menu_item_id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}

          <div className="flex justify-end text-sm font-bold pt-2">
            <span>Subtotal: {formatCurrency(itemTotal)}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="order-notes">Notes</Label>
        <Textarea
          id="order-notes"
          value={formData.notes ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Special instructions, allergies, etc."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isLoading || formData.items.length === 0}
        >
          {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
