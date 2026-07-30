"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2, Clock } from "lucide-react";
import { useCustomers, useTables, useFloorPlans } from "@/lib/hooks";
import type { OrderType, TableStatus } from "@/lib/types";

interface PosHeaderProps {
  orderType: OrderType;
  customerId?: string;
  tableId?: string;
  itemCount: number;
  onSetOrderType: (type: OrderType) => void;
  onSetCustomer: (id?: string) => void;
  onSetTable: (id?: string) => void;
  onClearCart: () => void;
}

export function PosHeader({
  orderType,
  customerId,
  tableId,
  itemCount,
  onSetOrderType,
  onSetCustomer,
  onSetTable,
  onClearCart,
}: PosHeaderProps) {
  const [time, setTime] = useState("");
  const { list: customersList } = useCustomers({ per_page: 100 });
  const { list: floorPlansList } = useFloorPlans();
  const { list: tablesList } = useTables(
    floorPlansList.data?.[0]?.id
  );

  const customers = customersList.data?.data?.data ?? [];
  const tables = (tablesList.data ?? []) as { id: string; number: number; capacity: number; status: TableStatus }[];
  const availableTables = tables.filter(
    (t) => t.status === "available" || t.id === tableId
  );

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 lg:py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/dashboard" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">POS</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {time}
            </div>
          </div>
        </div>

        {itemCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onClearCart}
            className="lg:hidden"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear ({itemCount})
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible sm:flex-wrap">
          {(["dine_in", "takeaway", "delivery"] as OrderType[]).map((type) => (
            <Button
              key={type}
              variant={orderType === type ? "default" : "outline"}
              size="sm"
              onClick={() => onSetOrderType(type)}
              className="capitalize shrink-0"
            >
              {type.replace("_", " ")}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Select
            value={customerId ?? ""}
            onValueChange={(v) => onSetCustomer(v || undefined)}
          >
            <SelectTrigger className="w-full sm:w-[140px] md:w-[160px]">
              <SelectValue placeholder="Walk-in Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Walk-in Customer</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {orderType === "dine_in" && (
            <Select
              value={tableId ?? ""}
              onValueChange={(v) => onSetTable(v || undefined)}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Select Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Table</SelectItem>
                {availableTables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    T{t.number} ({t.capacity} seats)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {itemCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearCart}
              className="hidden lg:inline-flex"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear ({itemCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
