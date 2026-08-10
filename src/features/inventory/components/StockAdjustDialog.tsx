"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StockAdjustFormData } from "@/lib/types";

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StockAdjustFormData) => void;
  isLoading?: boolean;
}

export function StockAdjustDialog({ open, onOpenChange, onSubmit, isLoading }: StockAdjustDialogProps) {
   const [form, setForm] = useState<StockAdjustFormData>({
     ingredient_id: "",
     type: "in",
     quantity: undefined,
     new_stock: undefined,
     notes: "",
   });

   const isAdjustment = form.type === "adjustment";

   function handleSubmit(e: React.FormEvent) {
     e.preventDefault();
     if (!form.ingredient_id) return;
     if (isAdjustment && (form.new_stock == null || form.new_stock < 0)) return;
     if (!isAdjustment && (form.quantity == null || form.quantity <= 0)) return;
     onSubmit(form);
     onOpenChange(false);
     setForm({ ingredient_id: "", type: "in", quantity: undefined, new_stock: undefined, notes: "" });
   }

   if (!open) return null;

   return (
     <div className="fixed inset-0 z-50 flex items-center justify-center">
       <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
       <div className="bg-background rounded-lg p-6 shadow-lg max-w-md w-full mx-4 relative z-10">
         <h2 className="text-lg font-semibold mb-4">Adjust Stock</h2>
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <label className="text-sm font-medium">Adjustment Type *</label>
             <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: (v ?? "in") as "in" | "out" | "adjustment" }))}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="in">Stock Inward</SelectItem>
                 <SelectItem value="out">Stock Outward</SelectItem>
                 <SelectItem value="adjustment">Set Stock Level</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <div className="space-y-2">
             <label className="text-sm font-medium">Ingredient ID *</label>
             <Input
               value={form.ingredient_id}
               onChange={(e) => setForm((p) => ({ ...p, ingredient_id: e.target.value }))}
               placeholder="Enter ingredient ID"
               required
             />
           </div>
           {isAdjustment ? (
             <div className="space-y-2">
               <label className="text-sm font-medium">New Stock Level *</label>
               <Input
                 type="number"
                 min={0}
                 step={0.01}
                 value={form.new_stock ?? ""}
                 onChange={(e) => setForm((p) => ({ ...p, new_stock: parseFloat(e.target.value) || 0 }))}
                 placeholder="Enter absolute stock level"
                 required
               />
             </div>
           ) : (
             <div className="space-y-2">
               <label className="text-sm font-medium">Quantity *</label>
               <Input
                 type="number"
                 min={0.01}
                 step={0.01}
                 value={form.quantity ?? ""}
                 onChange={(e) => setForm((p) => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                 placeholder="Enter quantity"
                 required
               />
             </div>
           )}
           <div className="space-y-2">
             <label className="text-sm font-medium">Notes</label>
             <Input
               value={form.notes ?? ""}
               onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || undefined }))}
               placeholder="Optional notes"
             />
           </div>
           <div className="flex justify-end gap-2 pt-2">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={isLoading || !form.ingredient_id}>
               {isLoading ? "Saving..." : "Save"}
             </Button>
           </div>
         </form>
       </div>
     </div>
   );
 }
