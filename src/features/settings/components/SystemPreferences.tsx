"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { LoadingSpinner } from "@/components/shared";
import type { SystemPreferencesFormData } from "../types";

const TIMEZONES = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
];

const CURRENCIES = [
  { code: "PHP", symbol: "₱", label: "Philippine Peso" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
];

const formSchema = z.object({
  currency: z.string().min(1),
  currency_symbol: z.string().min(1),
  timezone: z.string().min(1),
  default_tax_rate: z.coerce.number().min(0).max(100),
  default_service_charge: z.coerce.number().min(0).max(100),
  service_charge_enabled: z.boolean(),
  allow_negative_inventory: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

// Only settings that are actually consumed by the system are exposed:
// tax rate + service charge (PricingService), currency/timezone (display),
// allow_negative_inventory (stock checks). Legacy unused columns are hidden.
export function SystemPreferences({ canEdit = false }: { canEdit?: boolean }) {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      currency: "PHP",
      currency_symbol: "₱",
      timezone: "Asia/Manila",
      default_tax_rate: 12,
      default_service_charge: 0,
      service_charge_enabled: false,
      allow_negative_inventory: false,
    },
  });

  // Hydrate after async data arrives (defaultValues alone won't).
  useEffect(() => {
    if (!settings) return;
    form.reset({
      currency: settings.currency || "PHP",
      currency_symbol: settings.currency_symbol || "₱",
      timezone: settings.timezone || "Asia/Manila",
      default_tax_rate: settings.default_tax_rate,
      default_service_charge: settings.default_service_charge,
      service_charge_enabled: settings.service_charge_enabled,
      allow_negative_inventory: settings.allow_negative_inventory,
    });
  }, [settings, form]);

  if (isLoading) return <LoadingSpinner />;

  if (!canEdit && settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Currency:</span> {settings.currency || "Not provided"} ({settings.currency_symbol})</p>
          <p><span className="text-muted-foreground">Timezone:</span> {settings.timezone || "Not provided"}</p>
          <p><span className="text-muted-foreground">Tax Rate:</span> {settings.default_tax_rate}%</p>
          <p>
            <span className="text-muted-foreground">Service Charge:</span>{" "}
            {settings.service_charge_enabled ? `${settings.default_service_charge}%` : "Disabled"}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Only Admins can edit system preferences.
          </p>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values as SystemPreferencesFormData, {
      onSuccess: () => toast.success("System preferences updated"),
      onError: (error) => {
        const msg =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
        toast.error(msg || "Failed to update preferences");
      },
    });
  };

  const taxRate = form.watch("default_tax_rate");
  const scEnabled = form.watch("service_charge_enabled");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Currency & Timezone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...field}
                        onChange={(e) => {
                          const curr = CURRENCIES.find((c) => c.code === e.target.value);
                          form.setValue("currency", e.target.value);
                          if (curr) form.setValue("currency_symbol", curr.symbol);
                        }}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant Timezone</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...field}
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
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
            <CardTitle>Financial Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="default_tax_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Tax Rate (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={100} step={0.01} {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Applied by the backend when pricing orders. Current configured
                    rate: {taxRate}%
                  </p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service_charge_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Enable service charge by default</FormLabel>
                </FormItem>
              )}
            />
            {scEnabled && (
              <FormField
                control={form.control}
                name="default_service_charge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Service Charge (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} step={0.01} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="allow_negative_inventory"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">
                    Allow orders when ingredient stock is insufficient
                  </FormLabel>
                </FormItem>
              )}
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
