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

interface SplitPaymentLineProps {
  line: PaymentLine;
  isFirst: boolean;
  onUpdate: (id: string, updates: Partial<PaymentLine>) => void;
  onRemove: (id: string) => void;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  gift_card: "Gift Card",
  loyalty_points: "Loyalty Points",
  digital_wallet: "Digital Wallet",
  room_charge: "Room Charge",
};

const CARD_TYPES = ["Visa", "Mastercard", "American Express", "JCB", "Other"];

function composeCardReference(
  cardType: string,
  last4: string,
  approval: string
): string {
  return [
    cardType || "",
    last4 ? `•••• ${last4}` : "",
    approval ? `APPROVAL: ${approval}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
}

export function SplitPaymentLine({
  line,
  isFirst,
  onUpdate,
  onRemove,
}: SplitPaymentLineProps) {
  const [touched, setTouched] = useState(false);
  const [localAmount, setLocalAmount] = useState<string>(
    line.amount > 0 ? String(line.amount) : ""
  );
  const [cardType, setCardType] = useState("");
  const [last4, setLast4] = useState("");
  const [approval, setApproval] = useState("");
  const [referenceText, setReferenceText] = useState(line.reference ?? "");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setLocalAmount("");
      onUpdate(line.id, { amount: 0 });
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setLocalAmount(val);
      onUpdate(line.id, { amount: num });
    }
  };

  function updateCardField(
    partial: Partial<{ cardType: string; last4: string; approval: string }>
  ) {
    const nextCardType = partial.cardType ?? cardType;
    const nextLast4 = partial.last4 ?? last4;
    const nextApproval = partial.approval ?? approval;
    if (partial.cardType !== undefined) setCardType(nextCardType);
    if (partial.last4 !== undefined) setLast4(nextLast4);
    if (partial.approval !== undefined) setApproval(nextApproval);
    onUpdate(line.id, {
      reference: composeCardReference(nextCardType, nextLast4, nextApproval),
    });
  }

  function updateReference(value: string) {
    setReferenceText(value);
    onUpdate(line.id, { reference: value || undefined });
  }

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
            type="text"
            inputMode="decimal"
            value={localAmount}
            onChange={handleAmountChange}
            onBlur={() => setTouched(true)}
            placeholder="0.00"
            className="h-8"
          />
        </div>
      </div>

      {line.method === "card" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Card Type</Label>
            <Select
              value={cardType || undefined}
              onValueChange={(v) => updateCardField({ cardType: v ?? "" })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {CARD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Last 4 Digits</Label>
            <Input
              value={last4}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) =>
                updateCardField({
                  last4: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              placeholder="1234"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Approval Code</Label>
            <Input
              value={approval}
              onChange={(e) => updateCardField({ approval: e.target.value })}
              placeholder="APPR123"
              className="h-8"
            />
          </div>
        </div>
      )}

      {line.method === "bank_transfer" && (
        <div className="space-y-1">
          <Label className="text-xs">Bank / Reference</Label>
          <Input
            value={referenceText}
            onChange={(e) => updateReference(e.target.value)}
            placeholder="BDO · REF: TXN-001"
            className="h-8"
          />
        </div>
      )}

      {line.method !== "cash" &&
        line.method !== "card" &&
        line.method !== "bank_transfer" && (
          <div className="space-y-1">
            <Label className="text-xs">Reference</Label>
            <Input
              value={referenceText}
              onChange={(e) => updateReference(e.target.value)}
              placeholder="Transaction reference"
              className="h-8"
            />
          </div>
        )}

      {!touched && line.amount === 0 && isFirst && (
        <p className="text-[10px] text-muted-foreground">
          Enter the amount received to complete this payment.
        </p>
      )}
    </div>
  );
}
