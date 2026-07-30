"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PageHeader, LoadingSpinner, ConfirmDialog } from "@/components/shared";
import { ReservationDetail } from "@/features/reservations";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useReservations } from "@/lib/hooks";
import { toast } from "sonner";

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { list, cancel } = useReservations();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const reservations = list.data?.data?.data ?? [];
  const reservation = reservations.find((r) => r.id === id);

  function handleCancel() {
    if (!reservation) return;
    cancel.mutate(
      { id: reservation.id, reason: "Cancelled by staff" },
      {
        onSuccess: () => {
          toast.success(`Reservation ${reservation.reservation_number} cancelled`);
          setShowCancelDialog(false);
        },
        onError: () => toast.error("Failed to cancel reservation"),
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
          description="The reservation you're looking for doesn't exist."
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
        title="Reservation Details"
        action={
          <Button variant="outline" size="sm" render={<Link href="/reservations" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <ReservationDetail
        reservation={reservation}
        onCancel={() => setShowCancelDialog(true)}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Reservation"
        description={`Are you sure you want to cancel reservation ${reservation.reservation_number}?`}
        confirmText="Cancel Reservation"
        variant="destructive"
        onConfirm={handleCancel}
        isLoading={cancel.isPending}
      />
    </div>
  );
}
