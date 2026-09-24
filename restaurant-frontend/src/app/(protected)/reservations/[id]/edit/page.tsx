"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormPageSkeleton, PageHeader } from "@/components/shared";
import { ReservationForm } from "@/features/reservations";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useReservation, useReservations } from "@/lib/hooks";
import { toast } from "sonner";
import type { ReservationFormData } from "@/lib/types";

export default function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: reservation, isLoading } = useReservation(id);
  const { update } = useReservations();

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

  if (isLoading) {
    return (
      <FormPageSkeleton />
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
          <Button variant="outline" size="sm" render={<Link href="/reservations" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Reservations
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        <ReservationForm
          initialData={reservation}
          onSubmit={handleSubmit}
          isLoading={update.isPending}
          submitLabel="Update Reservation"
        />
      </div>
    </div>
  );
}
