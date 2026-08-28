"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Send,
  ShoppingCart,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  useMenuCategories,
  useMenuItems,
  useCustomers,
  useTables,
  useOrders,
} from "@/lib/hooks";
import { formatCurrency, cn } from "@/lib/utils";
import type { OrderType, Table } from "@/lib/types";

interface CartLine {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

const ORDER_TYPE_ICONS: Record<OrderType, React.ComponentType<{ className?: string }>> = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
};

interface PosOrderScreenProps {
  onOrderSent?: (orderId: string, orderNumber: string) => void;
}

export function PosOrderScreen({ onOrderSent }: PosOrderScreenProps) {
  const { list: catList } = useMenuCategories();
  const { list: miList } = useMenuItems({ is_available: true, per_page: 300 });
  const { list: custList } = useCustomers({ per_page: 300 });
  const { list: tableList } = useTables();
  const { create, updateStatus } = useOrders();

  const categories = useMemo(() => catList.data ?? [], [catList.data]);
  const menuItems = useMemo(() => miList.data?.data?.data ?? [], [miList.data]);
  const customers = useMemo(() => custList.data?.data?.data ?? [], [custList.data]);
  const tables = useMemo(() => tableList.data ?? [], [tableList.data]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [customerId, setCustomerId] = useState<string>("");
  const [tableId, setTableId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [mobileView, setMobileView] = useState<"menu" | "cart">("menu");

  const isLoading =
    catList.isLoading || miList.isLoading || custList.isLoading || tableList.isLoading;

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== "all" && item.category_id !== selectedCategory) {
        return false;
      }
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, search]);

  const availableTables = useMemo(
    () => tables.filter((t) => t.status === "available" || t.id === tableId),
    [tables, tableId]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );

  const addItem = useCallback(
    (item: (typeof menuItems)[number]) => {
      setCart((prev) => {
        const existing = prev.find((l) => l.menu_item_id === item.id);
        if (existing) {
          return prev.map((l) =>
            l.menu_item_id === item.id
              ? { ...l, quantity: l.quantity + 1 }
              : l
          );
        }
        return [
          ...prev,
          {
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
          },
        ];
      });
    },
    [menuItems]
  );

  const updateQty = useCallback((menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.menu_item_id === menuItemId
            ? { ...l, quantity: l.quantity + delta }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCart((prev) => prev.filter((l) => l.menu_item_id !== menuItemId));
  }, []);

  const updateLineNotes = useCallback((menuItemId: string, value: string) => {
    setCart((prev) =>
      prev.map((l) =>
        l.menu_item_id === menuItemId ? { ...l, notes: value } : l
      )
    );
  }, []);

  const canSend = cart.length > 0 && !create.isPending && !updateStatus.isPending;

  async function handleSendToKitchen() {
    if (cart.length === 0) return;

    const payload = {
      order_type: orderType,
      customer_id: customerId || undefined,
      table_id: orderType === "dine_in" ? tableId || undefined : undefined,
      notes: notes.trim() || undefined,
      items: cart.map((line) => ({
        menu_item_id: line.menu_item_id,
        quantity: line.quantity,
        unit_price: line.price,
        notes: line.notes?.trim() || undefined,
      })),
    };

    try {
      const res = await create.mutateAsync(payload);
      const order = res.data.data;

      await updateStatus.mutateAsync({
        id: order.id,
        status: "confirmed",
      });

      toast.success(`Order #${order.order_number} sent to kitchen`);
      setCart([]);
      setNotes("");
      setCustomerId("");
      setTableId("");
      onOrderSent?.(order.id, order.order_number);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (error as { message?: string })?.message ||
        "Failed to send order to kitchen";
      toast.error(message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-9rem)] min-h-[480px]">
      {/* Menu panel */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-0",
          mobileView === "cart" && "hidden lg:flex"
        )}
      >
        {/* Order type + search */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="grid grid-cols-3 gap-2 flex-1">
            {(["dine_in", "takeaway"] as OrderType[]).map((type) => {
              const Icon = ORDER_TYPE_ICONS[type];
              return (
                <Button
                  key={type}
                  type="button"
                  variant={orderType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOrderType(type);
                    if (type !== "dine_in") setTableId("");
                  }}
                  className="h-10"
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  <span className="capitalize">
                    {type.replace("_", " ")}
                  </span>
                </Button>
              );
            })}
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="pl-8 h-10"
            />
          </div>
        </div>

        {/* Category nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Item grid */}
        <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-3">
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No items available
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  aria-label={`Add ${item.name} to order`}
                  disabled={!item.is_available}
                  className={cn(
                    "flex flex-col items-start justify-between rounded-xl border bg-card p-3 text-left h-24 transition-all active:translate-y-px",
                    item.is_available
                      ? "hover:shadow-md hover:border-primary/40"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-sm font-semibold leading-tight line-clamp-2">
                    {item.name}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {formatCurrency(item.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div
        className={cn(
          "w-full lg:w-[360px] lg:shrink-0 flex flex-col min-h-0",
          mobileView === "menu" && "hidden lg:flex"
        )}
      >
        <Card className="flex flex-col flex-1 min-h-0">
          <CardContent className="flex flex-col flex-1 min-h-0 p-3 gap-3">
            {/* Customer / table */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Customer</Label>
                <Select
                  value={customerId}
                  onValueChange={(v) => setCustomerId(v ? (v === "walk-in" ? "" : v) : "")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Walk-in customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {orderType === "dine_in" && (
                <div className="space-y-1">
                  <Label className="text-xs">Table</Label>
                <Select
                  value={tableId}
                  onValueChange={(v) => setTableId(v ? (v === "none" ? "" : v) : "")}
                >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No table</SelectItem>
                      {availableTables.map((t: Table) => (
                        <SelectItem key={t.id} value={t.id}>
                          T{t.number}
                          {t.section ? ` · ${t.section}` : ""} — {t.capacity} seats
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Order notes (allergies, instructions)..."
              rows={2}
              className="resize-none text-sm"
            />

            {/* Cart lines */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[80px]">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2">
                  <ShoppingCart className="h-8 w-8 opacity-40" />
                  <span>Cart is empty</span>
                </div>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.menu_item_id}
                    className="rounded-lg border bg-background p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {line.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(line.price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          aria-label={`Decrease ${line.name} quantity`}
                          onClick={() => updateQty(line.menu_item_id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold">
                          {line.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          aria-label={`Increase ${line.name} quantity`}
                          onClick={() => updateQty(line.menu_item_id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive"
                        aria-label={`Remove ${line.name}`}
                        onClick={() => removeItem(line.menu_item_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={line.notes ?? ""}
                      onChange={(e) =>
                        updateLineNotes(line.menu_item_id, e.target.value)
                      }
                      placeholder="Item note (optional)"
                      className="h-8 text-xs"
                    />
                  </div>
                ))
              )}
            </div>

            {/* Totals + actions */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {cartCount} item{cartCount === 1 ? "" : "s"}
                </span>
                <span className="text-lg font-bold">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full h-12 text-base"
                disabled={!canSend}
                onClick={handleSendToKitchen}
              >
                {create.isPending || updateStatus.isPending ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send to Kitchen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cart/menu toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-20">
        <Button
          size="icon-lg"
          className="rounded-full shadow-lg relative"
          onClick={() =>
            setMobileView((v) => (v === "menu" ? "cart" : "menu"))
          }
        >
          {mobileView === "menu" ? (
            <ShoppingCart className="h-5 w-5" />
          ) : (
            <UtensilsCrossed className="h-5 w-5" />
          )}
          {cartCount > 0 && mobileView === "menu" && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-[10px] bg-primary text-primary-foreground"
            >
              {cartCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}

export default PosOrderScreen;
