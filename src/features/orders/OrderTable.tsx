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
import { MoreHorizontal, Eye, Pencil, XCircle, UtensilsCrossed, ShoppingBag, Truck, HelpCircle } from "lucide-react";
import type { Order, OrderType } from "@/lib/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  confirmed:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  preparing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ready: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  served:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const TYPE_ICONS: Partial<Record<OrderType, React.ComponentType<{ className?: string }>>> = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Truck,
};

interface OrderTableProps {
  orders: Order[];
  isLoading?: boolean;
  onCancel?: (order: Order) => void;
}

export function OrderTable({ orders, isLoading, onCancel }: OrderTableProps) {
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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">Table / Customer</TableHead>
            <TableHead className="text-center">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Placed</TableHead>
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
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TypeIcon className="h-3.5 w-3.5" />
                    <span className="text-xs capitalize">
                      {order.order_type.replace(/_/g, " ")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                  {order.table
                    ? `T${order.table.number}`
                    : order.customer?.name ?? "—"}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {order.items?.length ?? 0}
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
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
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
                      <DropdownMenuItem
                        render={<Link href={`/orders/${order.id}`} />}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {(order.status === "placed" || order.status === "confirmed") && (
                        <DropdownMenuItem
                          render={<Link href={`/orders/${order.id}/edit`} />}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onCancel &&
                        order.status !== "completed" &&
                        order.status !== "cancelled" && (
                          <DropdownMenuItem
                            onClick={() => onCancel(order)}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
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
  );
}
