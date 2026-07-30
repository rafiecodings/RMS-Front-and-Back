"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, LoadingSpinner } from "@/components/shared";
import { ReservationForm } from "@/features/reservations";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useReservations, useCustomers, useFloorPlans, useTables } from "@/lib/hooks";
import { toast } from "sonner";
import type { ReservationFormData } from "@/lib/types";

export default function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { list, update } = useReservations();
  const { list: customerList } = useCustomers();
  const { list: fpList } = useFloorPlans();

  const reservations = list.data?.data?.data ?? [];
  const reservation = reservations.find((r) => r.id === id);
  const customers = customerList.data?.data?.data ?? [];
  const floorPlans = fpList.data ?? [];

  const firstFloorPlanId = floorPlans[0]?.id;
  const { list: tableList } = useTables(firstFloorPlanId);
  const tables = tableList.data ?? [];

  function handleSubmit(data: ReservationFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Reservation updated successfully");
          router.push(`/reservations/${id}`);
        },
        onError: () => toast.error("Failed to update reservation"),
      }
    );
  }

  if (list.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div>
        <PageHeader
          title="Reservation Not Found"
          description="The reservation you're trying to edit doesn't exist."
          action={
            <Button variant="outline" size="sm" render={<Link href="/reservations" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Reservations
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Reservation"
        description={`Editing ${reservation.reservation_number}`}
        action={
          <Button variant="outline" size="sm" render={<Link href={`/reservations/${id}`} />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        <ReservationForm
          initialData={reservation}
          customers={customers}
          tables={tables}
          onSubmit={handleSubmit}
          isLoading={update.isPending}
          submitLabel="Update Reservation"
          showStatus
        />
      </div>
    </div>
  );
}
