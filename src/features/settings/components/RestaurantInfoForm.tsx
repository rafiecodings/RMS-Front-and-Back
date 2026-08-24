"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import type { OpeningHourRow, RestaurantInfoFormData } from "../types";
import { LoadingSpinner } from "@/components/shared";

const formSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State / Province is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  tax_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function OpeningHoursEditor({
  value,
  onChange,
  disabled,
}: {
  value: OpeningHourRow[];
  onChange: (rows: OpeningHourRow[]) => void;
  disabled?: boolean;
}) {
  function update(index: number, patch: Partial<OpeningHourRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div
          key={row.day}
          className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
        >
          <span className="w-24 text-sm font-medium capitalize">{row.day}</span>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={!row.is_closed}
              onCheckedChange={(checked) =>
                update(i, { is_closed: !checked })
              }
              disabled={disabled}
            />
            Open
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={row.open}
              onChange={(e) => update(i, { open: e.target.value })}
              disabled={disabled || row.is_closed}
              className="h-8 w-[120px]"
              aria-label={`${row.day} opens at`}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="time"
              value={row.close}
              onChange={(e) => update(i, { close: e.target.value })}
              disabled={disabled || row.is_closed}
              className="h-8 w-[120px]"
              aria-label={`${row.day} closes at`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RestaurantInfoForm({ canEdit = false }: { canEdit?: boolean }) {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      phone: "",
      email: "",
      tax_id: "",
    },
  });

  // Editable override for opening hours; null = mirror server values.
  const [hoursOverride, setHoursOverride] = useState<OpeningHourRow[] | null>(null);

  // Hydrate the form once async data arrives — defaultValues alone do not
  // repopulate react-hook-form after fetch.
  useEffect(() => {
    if (!settings) return;
    form.reset({
      name: settings.name ?? "",
      description: settings.description ?? "",
      address: settings.address ?? "",
      city: settings.city ?? "",
      state: settings.state ?? "",
      postal_code: settings.postal_code ?? "",
      country: settings.country ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      tax_id: settings.tax_id ?? "",
    });
  }, [settings, form]);

  const hoursDraft = hoursOverride ?? settings?.opening_hours ?? [];

  if (isLoading) return <LoadingSpinner />;

  if (!canEdit && settings) {
    // Read-only summary for managers.
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {settings.name || "Not provided"}</p>
          <p><span className="text-muted-foreground">Phone:</span> {settings.phone || "Not provided"}</p>
          <p><span className="text-muted-foreground">Email:</span> {settings.email || "Not provided"}</p>
          <p><span className="text-muted-foreground">Address:</span> {[settings.address, settings.city, settings.state, settings.postal_code, settings.country].filter(Boolean).join(", ") || "Not provided"}</p>
          <p className="text-xs text-muted-foreground mt-3">
            Only Admins can edit restaurant configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = (values: FormValues) => {
    const hoursRaw: Record<string, { open: string; close: string }> = {};
    for (const row of hoursDraft) {
      if (!row.is_closed) {
        if (!row.open || !row.close) {
          toast.error(`Opening hours incomplete for ${row.day}`);
          return;
        }
        hoursRaw[row.day] = { open: row.open, close: row.close };
      }
    }

    const payload: RestaurantInfoFormData = {
      ...values,
      opening_hours: hoursRaw,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => toast.success("Restaurant info updated"),
      onError: (error) => {
        const msg =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
        toast.error(msg || "Failed to update restaurant info");
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restaurant Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State / Province</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <OpeningHoursEditor
              value={hoursDraft}
              onChange={setHoursOverride}
              disabled={!canEdit}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
