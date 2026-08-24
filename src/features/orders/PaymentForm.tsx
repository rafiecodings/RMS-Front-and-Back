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
import { LoadingSpinner } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";
import type { PaymentFormData, PaymentMethod } from "@/lib/types";

interface PaymentFormProps {
  remainingAmount: number;
  onSubmit: (data: PaymentFormData) => void;
  isLoading?: boolean;
}

export function PaymentForm({
  remainingAmount,
  onSubmit,
  isLoading,
}: PaymentFormProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState("");

  const numericAmount = amount === "" ? remainingAmount : parseFloat(amount) || 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (numericAmount <= 0 || numericAmount > remainingAmount) return;
    onSubmit({
      payment_method: method,
      amount: numericAmount,
      reference: reference.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">Remaining Balance</p>
        <p className="text-xl font-bold">{formatCurrency(remainingAmount)}</p>
      </div>

      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Select value={method} onValueChange={(v) => v && setMethod(v as PaymentMethod)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
            <SelectItem value="gift_card">Gift Card</SelectItem>
            <SelectItem value="loyalty_points">Loyalty Points</SelectItem>
            <SelectItem value="room_charge">Room Charge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pay-amount">Amount (PHP)</Label>
        <Input
          id="pay-amount"
          type="number"
          min={0.01}
          max={remainingAmount}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={formatCurrency(remainingAmount)}
        />
      </div>

      {method !== "cash" && (
        <div className="space-y-2">
          <Label htmlFor="pay-ref">Reference Number</Label>
          <Input
            id="pay-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction reference"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isLoading || numericAmount <= 0 || numericAmount > remainingAmount}
        >
          {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
          Process Payment
        </Button>
      </div>
    </form>
  );
}
