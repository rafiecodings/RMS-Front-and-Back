"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, X, StickyNote } from "lucide-react";
import type { CartItem as CartItemType } from "../types";
import { formatCurrency } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

export function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdateNotes,
}: CartItemProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(item.notes ?? "");

  const modifierTotal = item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0;
  const unitTotal = item.price + modifierTotal;
  const lineTotal = unitTotal * item.quantity;

  function saveNotes() {
    onUpdateNotes(item.id, notesValue.trim());
    setShowNotes(false);
  }

  return (
    <div className="rounded-lg border bg-card p-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
          {item.variant && (
            <p className="text-xs text-muted-foreground">{item.variant}</p>
          )}
          {item.modifiers && item.modifiers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {item.modifiers.map((m) => m.name).join(", ")}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onRemove(item.id)}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-sm font-bold">{formatCurrency(lineTotal)}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setShowNotes(!showNotes)}
          className="h-5 w-5 text-muted-foreground hover:text-foreground"
        >
          <StickyNote className="h-3 w-3" />
        </Button>
        {item.notes && !showNotes && (
          <p className="text-[10px] text-muted-foreground truncate flex-1">{item.notes}</p>
        )}
      </div>

      {showNotes && (
        <div className="space-y-1">
          <Textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="Item notes..."
            className="h-14 text-xs resize-none"
          />
          <Button variant="ghost" size="xs" onClick={saveNotes}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
