"use client";

import { useState, useEffect, useEffectEvent, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared";
import { useReservations } from "@/lib/hooks";
import { useCustomers } from "@/lib/hooks";
import type {
  Reservation,
  ReservationFormData,
  Table,
} from "@/lib/types";

interface ReservationFormProps {
  initialData?: Reservation;
  onSubmit: (data: ReservationFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  customer_id?: string;
  guest_name?: string;
  guest_phone?: string;
  reservation_date?: string;
  reservation_time?: string;
  party_size?: string;
  table_id?: string;
}

export function ReservationForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Reservation",
}: ReservationFormProps) {
  const [formData, setFormData] = useState<ReservationFormData>({
    customer_id: initialData?.customer_id ?? initialData?.customer?.id ?? "",
    guest_name: initialData?.guest_name ?? "",
    guest_phone: initialData?.guest_phone ?? "",
    table_id: initialData?.table_id ?? "",
    reservation_date:
      initialData?.reservation_date ??
      new Date().toISOString().split("T")[0],
    reservation_time: initialData?.reservation_time ?? "18:00",
    party_size: initialData?.party_size ?? 2,
    source: initialData?.source ?? "walk_in",
    special_requests: initialData?.special_requests ?? "",
    status: initialData?.status,
  });
  const [reservationFor, setReservationFor] = useState<"registered" | "guest">(
    initialData?.customer_id || initialData?.customer ? "registered" : "guest"
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [partySizeInput, setPartySizeInput] = useState<string>(
    String(initialData?.party_size ?? 2)
  );
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  // Operationally unusable tables are never selectable, even if a cached
  // availability response still lists them. The backend enforces the same rule.
  const assignableTables = availableTables.filter(
    (t) => t.is_active !== false && t.status !== "needs_cleaning" && t.status !== "maintenance"
  );
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  // Conflict UX: when a previously selected table drops out of the
  // assignable list (date/time/party change or availability refresh), the
  // selection is cleared and the user must explicitly reconfirm — another
  // table or No table — before submit. Never silently keep a stale UUID and
  // never imply auto-assignment (the backend has none).
  const [tableConflict, setTableConflict] = useState<string | null>(null);
  // Human label ("T1") of the last explicitly chosen table, for messages.
  const selectedTableLabelRef = useRef<string | null>(null);
  // Whether the user has explicitly touched the table Select. Untouched
  // initial selections (edit forms) are never flagged on first load.
  const tableTouchedRef = useRef(false);
  // Original slot, so edits that move date/time re-evaluate the initial
  // selection instead of silently keeping a now-blocked table.
  const initialSlotRef = useRef(
    `${initialData?.reservation_date ?? new Date().toISOString().split("T")[0]}|${initialData?.reservation_time ?? "18:00"}|${initialData?.party_size ?? 2}`
  );
  const { list: customersList } = useCustomers({ per_page: 300, is_active: true });
  const customers = customersList.data?.data?.data ?? [];

  const { availableTables: fetchAvailableTables } = useReservations({
    reservation_date: formData.reservation_date,
    reservation_time: formData.reservation_time,
    party_size: formData.party_size,
    exclude_reservation_id: initialData?.id,
  });
  const tablesReady = fetchAvailableTables.isSuccess;

  useEffect(() => {
    if (formData.reservation_date && formData.reservation_time) {
      const timer = setTimeout(() => {
        setIsCheckingAvailability(true);
        if (fetchAvailableTables.isSuccess && fetchAvailableTables.data) {
          setAvailableTables(fetchAvailableTables.data);
        }
        setIsCheckingAvailability(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    formData.reservation_date,
    formData.reservation_time,
    formData.party_size,
    initialData?.id,
    fetchAvailableTables.data,
    fetchAvailableTables.isSuccess,
  ]);

  function tableDisplayLabel(id: string): string | null {
    const found = availableTables.find((t) => t.id === id);
    return found ? `T${found.number}` : null;
  }

  function handleTableChange(val: string | null) {
    const id = val ?? "";
    tableTouchedRef.current = true;
    setFormData((prev) => ({ ...prev, table_id: id }));
    if (id) {
      // Selection only comes from the assignable list, so a human label
      // always exists here — never store a raw UUID for user-facing text.
      selectedTableLabelRef.current = tableDisplayLabel(id);
    } else {
      selectedTableLabelRef.current = null;
    }
    // Any explicit choice (a table or No table) reconfirms the selection.
    setTableConflict(null);
    setErrors((prev) => ({ ...prev, table_id: undefined }));
  }

  // Invalidate a previously selected table that is no longer assignable.
  // State updates live in an effect event: the effect itself only decides
  // whether the current selection went stale.
  const assignableIdsKey = assignableTables.map((t) => t.id).join(",");
  const invalidateTableSelection = useEffectEvent((label: string | null) => {
    selectedTableLabelRef.current = null;
    setFormData((prev) => (prev.table_id ? { ...prev, table_id: "" } : prev));
    setTableConflict(
      label
        ? `Table ${label} is no longer available for this time. Please choose another table or select No table.`
        : "Your previously selected table is no longer available for this time. Please choose another table or select No table."
    );
  });
  useEffect(() => {
    if (!tablesReady) return;
    // Pristine edit state (untouched initial selection on its original
    // slot) is never flagged — this also preserves the previous behavior
    // where the backend ignores the self-block quirk. Anything the user
    // selected, or any slot move, is evaluated.
    const slotKey = `${formData.reservation_date}|${formData.reservation_time}|${formData.party_size}`;
    if (!tableTouchedRef.current && slotKey === initialSlotRef.current) {
      return;
    }
    if (formData.table_id && !assignableTables.some((t) => t.id === formData.table_id)) {
      const staleId = formData.table_id;
      invalidateTableSelection(
        selectedTableLabelRef.current ?? tableDisplayLabel(staleId)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignableIdsKey, tablesReady]);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (reservationFor === "registered" && !formData.customer_id) {
      errs.customer_id = "Select a registered customer";
    }
    if (reservationFor === "guest" && !formData.guest_name?.trim()) {
      errs.guest_name = "Guest name is required";
    }
    if (reservationFor === "guest" && !formData.guest_phone?.trim()) {
      errs.guest_phone = "Guest phone is required";
    }
    if (!formData.reservation_date) {
      errs.reservation_date = "Date is required";
    }
    if (!formData.reservation_time) {
      errs.reservation_time = "Time is required";
    }
    const partySizeVal = parseInt(partySizeInput);
    if (isNaN(partySizeVal) || partySizeVal < 1) {
      errs.party_size = "Party size must be at least 1";
    }
    return errs;
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate();
    setErrors(errs);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({
      guest_name: true,
      guest_phone: true,
      customer_id: true,
      reservation_date: true,
      reservation_time: true,
      party_size: true,
      table_id: true,
    });
    if (tableConflict) {
      setErrors((prev) => ({ ...prev, table_id: tableConflict }));
      return;
    }
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        customer_id: reservationFor === "registered" ? formData.customer_id : undefined,
        guest_name: reservationFor === "guest" ? formData.guest_name?.trim() : undefined,
        guest_phone: reservationFor === "guest" ? formData.guest_phone?.trim() : undefined,
        guest_email: reservationFor === "guest" ? formData.guest_email?.trim() || undefined : undefined,
        table_id: formData.table_id || undefined,
        special_requests: formData.special_requests?.trim() || undefined,
        party_size: parseInt(partySizeInput),
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Reservation For *</Label>
        <Select
          value={reservationFor}
          onValueChange={(value) => {
            const next = (value ?? "guest") as "registered" | "guest";
            setReservationFor(next);
            setFormData((previous) => ({
              ...previous,
              customer_id: next === "registered" ? previous.customer_id : undefined,
            }));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="registered">Registered Customer</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reservationFor === "registered" ? (
        <div className="space-y-2">
          <Label>Customer *</Label>
          <Select
            value={formData.customer_id && customers.some((c) => c.id === formData.customer_id) ? formData.customer_id : ""}
            onValueChange={(value) =>
              setFormData((previous) => ({ ...previous, customer_id: value ?? "" }))
            }
          >
            <SelectTrigger className="w-full" aria-invalid={touched.customer_id && !!errors.customer_id}>
              <SelectValue placeholder="Select a registered customer" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}{customer.phone ? ` — ${customer.phone}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {touched.customer_id && errors.customer_id && (
            <p className="text-xs text-destructive">{errors.customer_id}</p>
          )}
        </div>
      ) : (
        <>
      <div className="space-y-2">
        <Label htmlFor="guest-name">Guest Name *</Label>
        <Input
          id="guest-name"
          value={formData.guest_name ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              guest_name: e.target.value,
            }))
          }
          onBlur={() => handleBlur("guest_name")}
          placeholder="e.g. Juan Dela Cruz"
          aria-invalid={touched.guest_name && !!errors.guest_name}
        />
        {touched.guest_name && errors.guest_name && (
          <p className="text-xs text-destructive">{errors.guest_name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-phone">Phone *</Label>
        <Input
          id="guest-phone"
          value={formData.guest_phone ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              guest_phone: e.target.value,
            }))
          }
          placeholder="+63 917 123 4567"
          onBlur={() => handleBlur("guest_phone")}
          aria-invalid={touched.guest_phone && !!errors.guest_phone}
        />
        {touched.guest_phone && errors.guest_phone && (
          <p className="text-xs text-destructive">{errors.guest_phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-email">Email</Label>
        <Input
          id="guest-email"
          type="email"
          value={formData.guest_email ?? ""}
          onChange={(e) => setFormData((previous) => ({ ...previous, guest_email: e.target.value }))}
          placeholder="guest@example.com"
        />
      </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="res-date">Date *</Label>
          <Input
            id="res-date"
            type="date"
            value={formData.reservation_date}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                reservation_date: e.target.value,
              }))
            }
            onBlur={() => handleBlur("reservation_date")}
            aria-invalid={touched.reservation_date && !!errors.reservation_date}
          />
          {touched.reservation_date && errors.reservation_date && (
            <p className="text-xs text-destructive">{errors.reservation_date}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="res-time">Time *</Label>
          <Input
            id="res-time"
            type="time"
            value={formData.reservation_time}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                reservation_time: e.target.value,
              }))
            }
            onBlur={() => handleBlur("reservation_time")}
            aria-invalid={touched.reservation_time && !!errors.reservation_time}
          />
          {touched.reservation_time && errors.reservation_time && (
            <p className="text-xs text-destructive">{errors.reservation_time}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="party-size">Party Size *</Label>
          <Input
            id="party-size"
            type="text"
            inputMode="numeric"
            value={partySizeInput}
            onChange={(e) => {
              setPartySizeInput(e.target.value);
              const val = parseInt(e.target.value);
              if (!isNaN(val)) {
                setFormData((prev) => ({
                  ...prev,
                  party_size: val,
                }));
              }
            }}
            onBlur={() => {
              handleBlur("party_size");
              const val = parseInt(partySizeInput);
              if (!isNaN(val)) {
                setFormData((prev) => ({
                  ...prev,
                  party_size: val,
                }));
              }
            }}
            aria-invalid={touched.party_size && !!errors.party_size}
          />
          {touched.party_size && errors.party_size && (
            <p className="text-xs text-destructive">{errors.party_size}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Table (optional)</Label>
          <Select
            value={formData.table_id && assignableTables.some((t) => t.id === formData.table_id) ? formData.table_id : ""}
            onValueChange={handleTableChange}
          >
            <SelectTrigger className="w-full" aria-invalid={!!errors.table_id}>
              <SelectValue placeholder="Select a table (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No table</SelectItem>
              {isCheckingAvailability && (
                <SelectItem disabled value="__loading">
                  Checking availability...
                </SelectItem>
              )}
              {!isCheckingAvailability && assignableTables.length === 0 && (
                <SelectItem disabled value="__none">
                  No tables available for this time/party size
                </SelectItem>
              )}
              {assignableTables.map((t: Table) => (
                <SelectItem key={t.id} value={t.id}>
                  T{t.number} — {t.name ?? "Table"} (cap: {t.capacity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(tableConflict || errors.table_id) && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {tableConflict ?? errors.table_id}
            </p>
          )}
        </div>
      </div>

      {/* NOTE: no status selector — the backend update() endpoint does not
          accept status changes; use the row/status actions instead. */}

      <div className="space-y-2">
        <Label htmlFor="special-requests">Special Requests</Label>
        <Textarea
          id="special-requests"
          value={formData.special_requests}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              special_requests: e.target.value,
            }))
          }
          placeholder="Dietary restrictions, occasion, seating preference, etc."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
