"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { ReservationForm } from "@/features/reservations";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useReservations } from "@/lib/hooks";
import { toast } from "sonner";
import type { ReservationFormData } from "@/lib/types";

export default function NewReservationPage() {
  const router = useRouter();
  const { create } = useReservations();

  function handleSubmit(data: ReservationFormData) {
    create.mutate(
      {
        ...data,
        reservation_date: `${data.reservation_date}T${data.reservation_time}`,
      },
      {
        onSuccess: () => {
          toast.success("Reservation created successfully");
          router.push("/reservations");
        },
        onError: () => toast.error("Failed to create reservation"),
      }
    );
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
          onSubmit={handleSubmit}
          isLoading={create.isPending}
          submitLabel="Create Reservation"
        />
      </div>
    </div>
  );
}
