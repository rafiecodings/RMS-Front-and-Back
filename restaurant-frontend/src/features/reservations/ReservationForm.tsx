"use client";

import { useState, useEffect } from "react";
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
  guest_name?: string;
  reservation_date?: string;
  reservation_time?: string;
  party_size?: string;
}

export function ReservationForm({
  initialData,
  onSubmit,
  isLoading,
  submitLabel = "Save Reservation",
}: ReservationFormProps) {
  const [formData, setFormData] = useState<ReservationFormData>({
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

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [partySizeInput, setPartySizeInput] = useState<string>(
    String(initialData?.party_size ?? 2)
  );
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const { availableTables: fetchAvailableTables } = useReservations({
    reservation_date: formData.reservation_date,
    reservation_time: formData.reservation_time,
    party_size: formData.party_size,
    exclude_reservation_id: initialData?.id,
  });

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

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.guest_name.trim()) {
      errs.guest_name = "Guest name is required";
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
      reservation_date: true,
      reservation_time: true,
      party_size: true,
    });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        guest_name: formData.guest_name.trim(),
        guest_phone: formData.guest_phone?.trim() || undefined,
        table_id: formData.table_id || undefined,
        special_requests: formData.special_requests?.trim() || undefined,
        party_size: parseInt(partySizeInput),
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="guest-name">Guest Name *</Label>
        <Input
          id="guest-name"
          value={formData.guest_name}
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
        <Label htmlFor="guest-phone">Phone</Label>
        <Input
          id="guest-phone"
          value={formData.guest_phone}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              guest_phone: e.target.value,
            }))
          }
          placeholder="+63 917 123 4567"
        />
      </div>

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
            value={formData.table_id ?? ""}
            onValueChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                table_id: val ?? "",
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Auto-assign or select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No table (auto-assign)</SelectItem>
              {isCheckingAvailability && (
                <SelectItem disabled value="__loading">
                  Checking availability...
                </SelectItem>
              )}
              {!isCheckingAvailability && availableTables.length === 0 && (
                <SelectItem disabled value="__none">
                  No tables available for this time/party size
                </SelectItem>
              )}
              {availableTables.map((t: Table) => (
                <SelectItem key={t.id} value={t.id}>
                  T{t.number} — {t.name ?? "Table"} (cap: {t.capacity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
