"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { PosOrderScreen } from "@/features/orders";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewOrderPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="New Order"
        description="Take a waiter order and send it to the kitchen"
        action={
          <Button variant="outline" size="sm" render={<Link href="/orders" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <PosOrderScreen
        onOrderSent={(id) => {
          router.push(`/orders/${id}`);
        }}
      />
    </div>
  );
}
