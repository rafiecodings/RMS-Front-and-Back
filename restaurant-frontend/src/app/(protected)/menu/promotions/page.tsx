"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, Pencil, Plus } from "lucide-react";
import { PageHeader, LoadingSpinner, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import { formatCurrency, formatLabel } from "@/lib/utils";

interface Discount {
  id: string;
  name: string;
  code: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  applies_to: "all" | "menu_items" | "categories" | "combos";
  description?: string | null;
  promotion_kind: "automatic" | "verified";
  eligibility_type: "all" | "registered_customer" | "loyalty_tier";
  minimum_loyalty_tier?: string | null;
}

interface PromotionForm {
  name: string;
  code: string;
  type: Discount["type"];
  value: string;
  min_order_amount: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  applies_to: Discount["applies_to"];
  description: string;
  promotion_kind: Discount["promotion_kind"];
  eligibility_type: Discount["eligibility_type"];
  minimum_loyalty_tier: string;
}

const emptyForm = (): PromotionForm => ({
  name: "",
  code: "",
  type: "percentage",
  value: "",
  min_order_amount: "0",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  is_active: true,
  applies_to: "all",
  description: "",
  promotion_kind: "automatic",
  eligibility_type: "all",
  minimum_loyalty_tier: "Member",
});

function errorMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Unable to save promotion.";
}

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["discounts"],
    queryFn: () => api.get("/discounts", { params: { per_page: 100 } }).then((res) => normalizePaginated<Discount>(res.data)),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        code: form.code.trim() || null,
        value: Number(form.value),
        min_order_amount: Number(form.min_order_amount || 0),
        minimum_loyalty_tier: form.eligibility_type === "loyalty_tier" ? form.minimum_loyalty_tier : null,
      };
      return editing ? api.put(`/discounts/${editing.id}`, payload) : api.post("/discounts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success(editing ? "Promotion updated." : "Promotion created.");
      setOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateStatus = useMutation({
    mutationFn: (discount: Discount) => api.put(`/discounts/${discount.id}`, { is_active: !discount.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Promotion status updated.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.delete(`/discounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Promotion archived.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const discounts = useMemo(() => data?.data?.data ?? [], [data]);
  const active = discounts.filter((discount) => discount.is_active).length;

  function startCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function startEdit(discount: Discount) {
    setEditing(discount);
    setForm({
      name: discount.name,
      code: discount.code ?? "",
      type: discount.type,
      value: String(discount.value),
      min_order_amount: String(discount.min_order_amount ?? 0),
      start_date: discount.start_date?.slice(0, 10) ?? "",
      end_date: discount.end_date?.slice(0, 10) ?? "",
      is_active: discount.is_active,
      applies_to: discount.applies_to,
      description: discount.description ?? "",
      promotion_kind: discount.promotion_kind,
      eligibility_type: discount.eligibility_type,
      minimum_loyalty_tier: discount.minimum_loyalty_tier ?? "Member",
    });
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || Number(form.value) <= 0 || !form.start_date || !form.end_date) {
      toast.error("Complete the required promotion fields.");
      return;
    }
    save.mutate();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions & Discounts"
        description="Automatic promotions are evaluated by the server. Verified discounts require cashier confirmation and never stack."
        action={<Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" />Add Promotion</Button>}
      />

      {isLoading ? <LoadingSpinner /> : isError ? <ErrorState message="Failed to load promotions." /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[["Total", discounts.length], ["Active", active], ["Inactive", discounts.length - active]].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label} Promotions</p>
                <p className="text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-muted/50 text-left"><tr>
                {["Name", "Mode", "Discount", "Applies To", "Eligibility", "Minimum", "Schedule", "Status", "Actions"].map((head) => <th key={head} className="px-3 py-3 font-medium">{head}</th>)}
              </tr></thead>
              <tbody>
                {discounts.map((discount) => (
                  <tr key={discount.id} className="border-t align-top">
                    <td className="px-3 py-3"><p className="font-medium">{discount.name}</p><p className="text-xs text-muted-foreground">{discount.code ?? "No code"}</p></td>
                    <td className="px-3 py-3 capitalize">{discount.promotion_kind}</td>
                    <td className="px-3 py-3 font-medium">{discount.type === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)}</td>
                    <td className="px-3 py-3">{formatLabel(discount.applies_to)}</td>
                    <td className="px-3 py-3">{discount.eligibility_type === "loyalty_tier" ? `${discount.minimum_loyalty_tier} and above` : formatLabel(discount.eligibility_type)}</td>
                    <td className="px-3 py-3">{discount.min_order_amount > 0 ? formatCurrency(discount.min_order_amount) : "None"}</td>
                    <td className="px-3 py-3 text-xs">{discount.start_date ? new Date(discount.start_date).toLocaleDateString() : "—"} – {discount.end_date ? new Date(discount.end_date).toLocaleDateString() : "No expiry"}</td>
                    <td className="px-3 py-3"><span className={discount.is_active ? "text-emerald-700" : "text-muted-foreground"}>{discount.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="px-3 py-3"><div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(discount)} aria-label={`Edit ${discount.name}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => updateStatus.mutate(discount)}>{discount.is_active ? "Deactivate" : "Activate"}</Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => { if (window.confirm(`Archive ${discount.name}?`)) archive.mutate(discount.id); }} aria-label={`Archive ${discount.name}`}><Archive className="h-4 w-4" /></Button>
                    </div></td>
                  </tr>
                ))}
                {discounts.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No promotions configured.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader><DialogTitle>{editing ? "Edit Promotion" : "Add Promotion"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="promo-name">Name *</Label><Input id="promo-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="promo-code">Code</Label><Input id="promo-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
              <div className="space-y-1.5"><Label>Mode *</Label><Select value={form.promotion_kind} onValueChange={(value) => setForm({ ...form, promotion_kind: value as Discount["promotion_kind"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="automatic">Automatic Promotion</SelectItem><SelectItem value="verified">Verified Discount</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Discount Type *</Label><Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as Discount["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="promo-value">Value *</Label><Input id="promo-value" type="number" min="0.01" step="0.01" max={form.type === "percentage" ? 100 : undefined} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="promo-min">Minimum Spend</Label><Input id="promo-min" type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Applies To</Label><Select value={form.applies_to} onValueChange={(value) => setForm({ ...form, applies_to: value as Discount["applies_to"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Entire Order</SelectItem><SelectItem value="menu_items">Menu Items</SelectItem><SelectItem value="categories">Categories</SelectItem><SelectItem value="combos">Combos</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Eligibility</Label><Select value={form.eligibility_type} onValueChange={(value) => setForm({ ...form, eligibility_type: value as Discount["eligibility_type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Customers</SelectItem><SelectItem value="registered_customer">Registered Customers</SelectItem><SelectItem value="loyalty_tier">Loyalty Tier</SelectItem></SelectContent></Select></div>
              {form.eligibility_type === "loyalty_tier" && <div className="space-y-1.5"><Label>Minimum Tier</Label><Select value={form.minimum_loyalty_tier} onValueChange={(value) => setForm({ ...form, minimum_loyalty_tier: value ?? "Member" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Member", "Bronze", "Silver", "Gold", "Platinum"].map((tier) => <SelectItem key={tier} value={tier}>{tier} and above</SelectItem>)}</SelectContent></Select></div>}
              <div className="space-y-1.5"><Label htmlFor="promo-start">Start *</Label><Input id="promo-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="promo-end">End *</Label><Input id="promo-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="promo-description">Eligibility Notes</Label><Input id="promo-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Example: Valid during lunch hours" /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked === true })} />Active</label>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save Promotion"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
