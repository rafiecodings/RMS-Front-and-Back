"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, LoadingSpinner } from "@/components/shared";
import { OrderForm } from "@/features/orders";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  useOrder,
  useOrders,
  useMenuItems,
  useCustomers,
  useTables,
} from "@/lib/hooks";
import { toast } from "sonner";
import type { OrderFormData, OrderItemFormData } from "@/lib/types";

export default function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: order, isLoading: orderLoading } = useOrder(id);
  const { update } = useOrders();
  const { list: miList } = useMenuItems({ per_page: 200 });
  const { list: custList } = useCustomers({ per_page: 200 });
  const { list: tableList } = useTables();

  const menuItems = miList.data?.data?.data ?? [];
  const customers = custList.data?.data?.data ?? [];
  const tables = tableList.data ?? [];

  const canEdit =
    order && (order.status === "draft" || order.status === "pending" || order.status === "confirmed");

  function handleSubmit(data: OrderFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Order updated successfully");
          router.push(`/orders/${id}`);
        },
        onError: () => toast.error("Failed to update order"),
      }
    );
  }

  if (orderLoading || miList.isLoading || custList.isLoading || tableList.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageHeader
          title="Order Not Found"
          description="The order you're trying to edit doesn't exist."
          action={
            <Button variant="outline" size="sm" render={<Link href="/orders" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Orders
            </Button>
          }
        />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div>
        <PageHeader
          title="Cannot Edit Order"
          description={`Order ${order.order_number} is currently "${order.status}" and can no longer be edited.`}
         action={
          <Button variant="outline" size="sm" render={<Link href="/orders" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Orders
          </Button>
        }
        />
      </div>
    );
  }

  const initialData: OrderFormData & { items: OrderItemFormData[] } = {
    order_type: order.order_type,
    customer_id: order.customer_id,
    table_id: order.table_id,
    items: order.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      variant: item.variant,
      quantity: item.quantity,
      unit_price: item.unit_price,
      notes: item.notes,
    })),
    notes: order.notes,
  };

  return (
    <div>
      <PageHeader
        title="Edit Order"
        description={`Editing ${order.order_number}`}
         action={
          <Button variant="outline" size="sm" render={<Link href="/orders" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Orders
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-3xl">
        <OrderForm
          initialData={initialData}
          menuItems={menuItems}
          customers={customers}
          tables={tables}
          onSubmit={handleSubmit}
          isLoading={update.isPending}
          submitLabel="Update Order"
        />
      </div>
    </div>
  );
}
