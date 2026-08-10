"use client";

import { useState } from "react";
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
import type {
  Reservation,
  ReservationFormData,
  Customer,
  Table,
  ReservationStatus,
} from "@/lib/types";

interface ReservationFormProps {
  initialData?: Reservation;
  customers: Customer[];
  tables: Table[];
  onSubmit: (data: ReservationFormData) => void;
  onStatusChange?: (status: ReservationStatus) => void;
  isLoading?: boolean;
  submitLabel?: string;
  showStatus?: boolean;
}

interface FormErrors {
  guest_name?: string;
  guest_email?: string;
  reservation_date?: string;
  reservation_time?: string;
  party_size?: string;
}

export function ReservationForm({
  initialData,
  customers,
  tables,
  onSubmit,
  onStatusChange,
  isLoading,
  submitLabel = "Save Reservation",
  showStatus = false,
}: ReservationFormProps) {
  const [formData, setFormData] = useState<ReservationFormData>({
    customer_id: initialData?.customer_id ?? "",
    guest_name: initialData?.guest_name ?? "",
    guest_phone: initialData?.guest_phone ?? "",
    guest_email: initialData?.guest_email ?? "",
    table_id: initialData?.table_id ?? "",
    reservation_date: initialData?.reservation_date ?? new Date().toISOString().split("T")[0],
    reservation_time: initialData?.reservation_time ?? "18:00",
    party_size: initialData?.party_size ?? 2,
    source: initialData?.source ?? "walk_in",
    special_requests: initialData?.special_requests ?? "",
  });

  const [status, setStatus] = useState<ReservationStatus>(initialData?.status ?? "pending");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const availableTables = tables.filter(
    (t) =>
      t.status === "available" ||
      t.id === initialData?.table_id
  );

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.guest_name.trim()) {
      errs.guest_name = "Guest name is required";
    }
    if (formData.guest_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      errs.guest_email = "Enter a valid email address";
    }
    if (!formData.reservation_date) {
      errs.reservation_date = "Date is required";
    }
    if (!formData.reservation_time) {
      errs.reservation_time = "Time is required";
    }
    if (formData.party_size < 1) {
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
    setTouched({ guest_name: true, guest_email: true, reservation_date: true, reservation_time: true, party_size: true });
    if (Object.keys(errs).length === 0) {
      onSubmit({
        ...formData,
        guest_name: formData.guest_name.trim(),
        guest_phone: formData.guest_phone?.trim() || undefined,
        guest_email: formData.guest_email?.trim() || undefined,
        customer_id: formData.customer_id || undefined,
        table_id: formData.table_id || undefined,
        special_requests: formData.special_requests?.trim() || undefined,
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
            setFormData((prev) => ({ ...prev, guest_name: e.target.value }))
          }
          onBlur={() => handleBlur("guest_name")}
          placeholder="e.g. Juan Dela Cruz"
          aria-invalid={touched.guest_name && !!errors.guest_name}
        />
        {touched.guest_name && errors.guest_name && (
          <p className="text-xs text-destructive">{errors.guest_name}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="guest-phone">Phone</Label>
          <Input
            id="guest-phone"
            value={formData.guest_phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, guest_phone: e.target.value }))
            }
            placeholder="+63 917 123 4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest-email">Email</Label>
          <Input
            id="guest-email"
            type="email"
            value={formData.guest_email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, guest_email: e.target.value }))
            }
            onBlur={() => handleBlur("guest_email")}
            placeholder="juan@example.com"
            aria-invalid={touched.guest_email && !!errors.guest_email}
          />
          {touched.guest_email && errors.guest_email && (
            <p className="text-xs text-destructive">{errors.guest_email}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Customer (optional)</Label>
        <Select
          value={formData.customer_id}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, customer_id: val ?? "" }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Link to existing customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No customer</SelectItem>
            {customers.map((c) =>
              c ? (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` (${c.phone})` : ""}
                </SelectItem>
              ) : null
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="res-date">Date *</Label>
          <Input
            id="res-date"
            type="date"
            value={formData.reservation_date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, reservation_date: e.target.value }))
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
              setFormData((prev) => ({ ...prev, reservation_time: e.target.value }))
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
            type="number"
            min={1}
            max={50}
            value={formData.party_size}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                party_size: parseInt(e.target.value) || 1,
              }))
            }
            onBlur={() => handleBlur("party_size")}
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
              setFormData((prev) => ({ ...prev, table_id: val ?? "" }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Auto-assign or select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No table (auto-assign)</SelectItem>
              {availableTables.map((t) =>
                t ? (
                  <SelectItem key={t.id} value={t.id}>
                    {t.number} — {t.name ?? "Table"} (cap: {t.capacity})
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showStatus && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(val) => setStatus(val as ReservationStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="seated">Seated</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="special-requests">Special Requests</Label>
        <Textarea
          id="special-requests"
          value={formData.special_requests}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, special_requests: e.target.value }))
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
