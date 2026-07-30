"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useSystemSettings, useUpdateSystemSettings } from "../hooks/useSettings";
import { LoadingSpinner } from "@/components/shared";
import type { SystemSettingsFormData } from "../types";

const formSchema = z.object({
  default_tax_rate: z.coerce.number().min(0),
  default_service_charge: z.coerce.number().min(0),
  service_charge_enabled: z.boolean(),
  currency: z.string().min(1),
  currency_symbol: z.string().min(1),
  receipt_footer: z.string(),
  receipt_header: z.string(),
  order_prefix: z.string().min(1),
  invoice_prefix: z.string().min(1),
  table_reservation_timeout: z.coerce.number().min(1),
  kitchen_display_timeout: z.coerce.number().min(1),
  auto_cancel_timeout: z.coerce.number().min(1),
  allow_negative_inventory: z.boolean(),
  low_stock_threshold: z.coerce.number().min(0),
});

export function SystemPreferences() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateMutation = useUpdateSystemSettings();

  const form = useForm<SystemSettingsFormData>({
    resolver: zodResolver(formSchema) as Resolver<SystemSettingsFormData>,
    defaultValues: settings
      ? {
          default_tax_rate: settings.default_tax_rate,
          default_service_charge: settings.default_service_charge,
          service_charge_enabled: settings.service_charge_enabled,
          currency: settings.currency,
          currency_symbol: settings.currency_symbol,
          receipt_footer: settings.receipt_footer,
          receipt_header: settings.receipt_header,
          order_prefix: settings.order_prefix,
          invoice_prefix: settings.invoice_prefix,
          table_reservation_timeout: settings.table_reservation_timeout,
          kitchen_display_timeout: settings.kitchen_display_timeout,
          auto_cancel_timeout: settings.auto_cancel_timeout,
          allow_negative_inventory: settings.allow_negative_inventory,
          low_stock_threshold: settings.low_stock_threshold,
        }
      : undefined,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!settings) return null;

  const onSubmit = (data: SystemSettingsFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => toast.success("Settings updated"),
      onError: () => toast.error("Failed to update settings"),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="default_tax_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_service_charge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Service Charge (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="service_charge_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-input"
                  />
                  <FormLabel className="!mt-0">Enable Service Charge</FormLabel>
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency_symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Symbol</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
            <CardTitle>Receipt Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="receipt_header"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Header</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receipt_footer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Footer</FormLabel>
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
                name="order_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="ORD-" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoice_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="INV-" {...field} />
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
            <CardTitle>Timeouts & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="table_reservation_timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservation Timeout (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kitchen_display_timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kitchen Display (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="auto_cancel_timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto Cancel (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="low_stock_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allow_negative_inventory"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-input"
                    />
                    <FormLabel className="!mt-0">Allow Negative Inventory</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
