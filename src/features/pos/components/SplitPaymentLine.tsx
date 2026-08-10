"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { PaymentLine } from "../types";
import type { PaymentMethod } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface SplitPaymentLineProps {
  line: PaymentLine;
  remaining: number;
  isFirst: boolean;
  onUpdate: (id: string, updates: Partial<PaymentLine>) => void;
  onRemove: (id: string) => void;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  digital_wallet: "Digital Wallet",
  room_charge: "Room Charge",
  corporate_account: "Corporate Account",
};

export function SplitPaymentLine({
  line,
  remaining,
  isFirst,
  onUpdate,
  onRemove,
}: SplitPaymentLineProps) {
  const [touched, setTouched] = useState(false);

  return (
    <div className="rounded-lg border p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Payment {isFirst ? "(Primary)" : ""}
        </span>
        {!isFirst && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(line.id)}
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Method</Label>
          <Select
            value={line.method}
            onValueChange={(v) => v && onUpdate(line.id, { method: v as PaymentMethod })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(METHOD_LABELS) as [PaymentMethod, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Amount (₱)</Label>
          <Input
            type="number"
            min={0.01}
            step={0.01}
            value={line.amount || ""}
            placeholder="0.00"
            onFocus={() => setTouched(true)}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              onUpdate(line.id, { amount: val });
            }}
            className="h-8"
          />
        </div>
      </div>

      {line.method !== "cash" && (
        <div className="space-y-1">
          <Label className="text-xs">Reference</Label>
          <Input
            value={line.reference ?? ""}
            onChange={(e) => onUpdate(line.id, { reference: e.target.value })}
            placeholder="Transaction reference"
            className="h-8"
          />
        </div>
      )}

      {!touched && line.amount === 0 && isFirst && (
        <p className="text-[10px] text-muted-foreground">
          Click amount field to auto-fill with {formatCurrency(remaining)}
        </p>
      )}
    </div>
  );
}
