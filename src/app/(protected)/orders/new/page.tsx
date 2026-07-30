"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { OrderForm } from "@/features/orders";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  useOrders,
  useMenuCategories,
  useMenuItems,
  useCustomers,
  useFloorPlans,
  useTables,
} from "@/lib/hooks";
import { toast } from "sonner";
import type { OrderFormData } from "@/lib/types";

export default function NewOrderPage() {
  const router = useRouter();
  const { create } = useOrders();
  const { list: catList } = useMenuCategories();
  const { list: miList } = useMenuItems({ per_page: 200 });
  const { list: custList } = useCustomers({ per_page: 200 });
  const { list: fpList } = useFloorPlans();

  const menuItems = miList.data?.data?.data ?? [];
  const customers = custList.data?.data?.data ?? [];
  const floorPlans = fpList.data ?? [];

  const firstFloorPlanId = floorPlans[0]?.id;
  const { list: tableList } = useTables(firstFloorPlanId);
  const tables = tableList.data ?? [];

  const isAnyLoading = catList.isLoading || miList.isLoading || custList.isLoading || fpList.isLoading;

  function handleSubmit(data: OrderFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Order placed successfully");
        router.push("/orders");
      },
      onError: () => toast.error("Failed to place order"),
    });
  }

  return (
    <div>
      <PageHeader
        title="New Order"
        description="Create a new restaurant order"
        action={
          <Button variant="outline" size="sm" render={<Link href="/orders" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-3xl">
        {isAnyLoading ? (
          <p className="text-muted-foreground text-sm">Loading menu and customer data...</p>
        ) : (
          <OrderForm
            menuItems={menuItems}
            customers={customers}
            tables={tables}
            onSubmit={handleSubmit}
            isLoading={create.isPending}
            submitLabel="Place Order"
          />
        )}
      </div>
    </div>
  );
}
