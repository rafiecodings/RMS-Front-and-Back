"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { ReservationForm } from "@/features/reservations";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useReservations, useCustomers, useFloorPlans, useTables } from "@/lib/hooks";
import { toast } from "sonner";
import type { ReservationFormData } from "@/lib/types";

export default function NewReservationPage() {
  const router = useRouter();
  const { create } = useReservations();
  const { list: customerList } = useCustomers();
  const { list: fpList } = useFloorPlans();

  const customers = customerList.data?.data?.data ?? [];
  const floorPlans = fpList.data ?? [];

  const firstFloorPlanId = floorPlans[0]?.id;
  const { list: tableList } = useTables(firstFloorPlanId);
  const tables = tableList.data ?? [];

  function handleSubmit(data: ReservationFormData) {
    create.mutate(data, {
      onSuccess: () => {
        toast.success("Reservation created successfully");
        router.push("/reservations");
      },
      onError: () => toast.error("Failed to create reservation"),
    });
  }

  return (
    <div>
      <PageHeader
        title="New Reservation"
        description="Create a new table reservation"
        action={
          <Button variant="outline" size="sm" render={<Link href="/reservations" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        <ReservationForm
          customers={customers}
          tables={tables}
          onSubmit={handleSubmit}
          isLoading={create.isPending}
          submitLabel="Create Reservation"
        />
      </div>
    </div>
  );
}
