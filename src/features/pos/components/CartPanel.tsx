"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import type { CartItem as CartItemType, PosDiscount } from "../types";

interface CartPanelProps {
  items: CartItemType[];
  subtotal: number;
  discount?: PosDiscount;
  discountAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  serviceChargePercent: number;
  totalAmount: number;
  itemCount: number;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onEditDiscount: () => void;
  onEditServiceCharge: () => void;
  onPay: () => void;
}

export function CartPanel({
  items,
  subtotal,
  discount,
  discountAmount,
  vatAmount,
  serviceChargeAmount,
  serviceChargePercent,
  totalAmount,
  itemCount,
  onUpdateQuantity,
  onRemove,
  onUpdateNotes,
  onEditDiscount,
  onEditServiceCharge,
  onPay,
}: CartPanelProps) {
  return (
    <div className="flex h-full flex-col border-l bg-card">
      <div className="shrink-0 border-b px-3 py-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Cart</h2>
          {itemCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {itemCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingCart className="h-8 w-8" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs">Tap a product to add</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-2.5 space-y-2">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
                onUpdateNotes={onUpdateNotes}
              />
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="shrink-0 border-t p-3 space-y-3">
          <CartSummary
            subtotal={subtotal}
            discountAmount={discountAmount}
            discount={discount}
            vatAmount={vatAmount}
            serviceChargeAmount={serviceChargeAmount}
            serviceChargePercent={serviceChargePercent}
            totalAmount={totalAmount}
            onEditDiscount={onEditDiscount}
            onEditServiceCharge={onEditServiceCharge}
          />

          <Button
            className="w-full h-11 text-base font-bold"
            onClick={onPay}
          >
            Pay {new Intl.NumberFormat("en-PH", {
              style: "currency",
              currency: "PHP",
              minimumFractionDigits: 0,
            }).format(totalAmount)}
          </Button>
        </div>
      )}
    </div>
  );
}
