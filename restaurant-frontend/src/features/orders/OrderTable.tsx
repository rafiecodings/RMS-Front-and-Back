"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, XCircle, Archive, Send, CheckCircle2, UtensilsCrossed, ShoppingBag, HelpCircle } from "lucide-react";
import type { Order, OrderType } from "@/lib/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  confirmed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  preparing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ready: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const TYPE_ICONS: Partial<Record<OrderType, React.ComponentType<{ className?: string }>>> = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
};

interface OrderTableProps {
  orders: Order[];
  isLoading?: boolean;
  onCancel?: (order: Order) => void;
  onView?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  onArchive?: (order: Order) => void;
  onSendToKitchen?: (order: Order) => void;
  onServeOrder?: (order: Order) => void;
}

export function OrderTable({
  orders,
  isLoading,
  onCancel,
  onView,
  onEdit,
  onArchive,
  onSendToKitchen,
  onServeOrder,
}: OrderTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No orders found</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const TypeIcon = TYPE_ICONS[order.order_type] ?? HelpCircle;
            return (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TypeIcon className="h-3.5 w-3.5" />
                    <span className="text-xs capitalize">
                      {order.order_type.replace(/_/g, " ")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {order.table ? `T${order.table.number}` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {order.customer?.name ?? "Walk-in"}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {order.items_count ?? order.items?.length ?? 0}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(order.total_amount)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      STATUS_STYLES[order.status]
                    )}
                  >
                    {order.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {order.placed_at ? formatDateTime(order.placed_at) : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" />}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(order)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                  )}
                  {(order.status === "pending" || order.status === "confirmed") && onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(order)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {order.status === "pending" && onSendToKitchen && (
                    <DropdownMenuItem onClick={() => onSendToKitchen(order)}>
                      <Send className="h-4 w-4 mr-2" />
                      Send to Kitchen
                    </DropdownMenuItem>
                  )}
                  {order.status === "ready" && onServeOrder && (
                    <DropdownMenuItem onClick={() => onServeOrder(order)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Served
                    </DropdownMenuItem>
                  )}
                      {onCancel &&
                        // Backend state machine: served orders can only move
                        // to completed — offering Cancel would 409.
                        (order.status === "pending" ||
                          order.status === "confirmed" ||
                          order.status === "preparing" ||
                          order.status === "ready") && (
                          <DropdownMenuItem
                            onClick={() => onCancel(order)}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                      {onArchive &&
                        (order.status === "completed" ||
                          order.status === "cancelled") && (
                          <DropdownMenuItem
                            onClick={() => onArchive(order)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
      <div className="md:hidden space-y-3">
        {orders.map((order) => {
          const TypeIcon = TYPE_ICONS[order.order_type] ?? HelpCircle;
          return (
            <div key={order.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/orders/${order.id}`} className="font-semibold text-sm hover:underline">
                  {order.order_number}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", STATUS_STYLES[order.status])}>
                    {order.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="h-8 w-8" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && <DropdownMenuItem onClick={() => onView(order)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>}
                      {(order.status === "pending" || order.status === "confirmed") && onEdit && <DropdownMenuItem onClick={() => onEdit(order)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                      {order.status === "pending" && onSendToKitchen && <DropdownMenuItem onClick={() => onSendToKitchen(order)}><Send className="h-4 w-4 mr-2" />Send to Kitchen</DropdownMenuItem>}
                      {order.status === "ready" && onServeOrder && <DropdownMenuItem onClick={() => onServeOrder(order)}><CheckCircle2 className="h-4 w-4 mr-2" />Mark as Served</DropdownMenuItem>}
                      {onCancel && (["pending","confirmed","preparing","ready"].includes(order.status)) && <DropdownMenuItem onClick={() => onCancel(order)} className="text-destructive"><XCircle className="h-4 w-4 mr-2" />Cancel</DropdownMenuItem>}
                      {onArchive && (["completed","cancelled"].includes(order.status)) && <DropdownMenuItem onClick={() => onArchive(order)}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><TypeIcon className="h-3.5 w-3.5" />{order.order_type.replace(/_/g, " ")}</span>
                {order.order_type === "dine_in" && <span>· {order.table ? `T${order.table.number}` : "No table"}</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{order.customer?.name ?? "Walk-in"}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{order.items_count ?? order.items?.length ?? 0} items</span>
                <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{order.placed_at ? formatDateTime(order.placed_at) : ""}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
