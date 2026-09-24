"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared";
import { OrderTimeline } from "./OrderTimeline";
import type { Order } from "@/lib/types";
import { formatCurrency, formatTime } from "@/lib/utils";

interface OrderDetailProps {
  order: Order;
}

export function OrderDetail({ order }: OrderDetailProps) {
  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = order.total_amount - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{order.order_number}</h2>
            <StatusBadge status={order.status} className="text-[10px] px-1.5 py-0" />
            <Badge variant="outline" className="text-[10px] capitalize">
              {order.order_type.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {order.table && <span>Table {order.table.number}</span>}
            {order.customer && <span>{order.customer.name}</span>}
          </div>
        </div>
        {order.placed_at && (
          <div className="text-sm text-muted-foreground">
            Placed at {formatTime(order.placed_at)}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm break-words">
                        {item.name ?? item.menu_item_name ?? "Unnamed item"}
                      </span>
                      {item.variant && (
                        <span className="text-xs text-muted-foreground">
                          ({item.variant})
                        </span>
                      )}
                    </div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.modifiers.map((m) => m.name).join(", ")}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-medium">
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (inclusive)</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{order.applied_discount?.name ?? "Discount"}</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              {order.service_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span>{formatCurrency(order.service_charge)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={order} />
            </CardContent>
          </Card>

          {order.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0">
                      <span className="capitalize break-words">
                        {payment.payment_method.replace(/_/g, " ")}
                      </span>
                      {payment.reference_number && (
                        <span className="text-muted-foreground ml-1">
                          ({payment.reference_number})
                        </span>
                      )}
                    </div>
                    <span className="font-medium">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium">{formatCurrency(totalPaid)}</span>
                </div>
                {balance > 0 && (
                  <div className="flex justify-between text-sm font-bold">
                    <span>Balance Due</span>
                    <span className="text-amber-600">{formatCurrency(balance)}</span>
                  </div>
                )}
                {balance <= 0 && (
                  <div className="text-center text-xs text-emerald-600 font-medium pt-1">
                    Fully Paid
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardContent className="pt-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Order Notes
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
