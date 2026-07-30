"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { PageHeader, ConfirmDialog, SearchInput, ErrorBoundary } from "@/components/shared";
import {
  ReservationTable,
  ReservationStats,
  CalendarView,
} from "@/features/reservations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CalendarDays, List } from "lucide-react";
import { useReservations } from "@/lib/hooks";
import { DEBOUNCE_DELAY, ITEMS_PER_PAGE } from "@/lib/utils/constants";
import type { Reservation } from "@/lib/types";
import { toast } from "sonner";

export default function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo(() => ({
    page,
    per_page: ITEMS_PER_PAGE,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  }), [page, debouncedSearch, statusFilter]);

  const { list, cancel } = useReservations(params);

  const reservations = list.data?.data?.data ?? [];
  const meta = list.data?.data?.meta;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_DELAY);
  }

  function handleCancelConfirm() {
    if (!cancelTarget) return;
    cancel.mutate(
      { id: cancelTarget.id, reason: "Cancelled by staff" },
      {
        onSuccess: () => {
          toast.success(`Reservation ${cancelTarget.reservation_number} cancelled`);
          setCancelTarget(null);
        },
        onError: () => toast.error("Failed to cancel reservation"),
      }
    );
  }

  return (
    <div>
      <ErrorBoundary>
      <PageHeader
        title="Reservations"
        description="Manage table reservations"
        action={
          <Button size="sm" render={<Link href="/reservations/new" />}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Reservation
          </Button>
        }
      />

      <div className="space-y-6">
        <ReservationStats reservations={reservations} />

        <Tabs defaultValue="list">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-1.5" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarDays className="h-4 w-4 mr-1.5" />
                Calendar
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder="Search reservations..."
              />
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="seated">Seated</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="list" className="mt-4">
            <ReservationTable
              reservations={reservations}
              isLoading={list.isLoading}
              onCancel={(r) => setCancelTarget(r)}
            />

            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(meta.current_page - 1) * meta.per_page + 1}–
                  {Math.min(meta.current_page * meta.per_page, meta.total)} of{" "}
                  {meta.total}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {meta.last_page > 5 && (
                    <span className="flex items-center px-1 text-muted-foreground">
                      …
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <CalendarView
              reservations={reservations}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel Reservation"
        description={`Are you sure you want to cancel reservation ${cancelTarget?.reservation_number} for ${cancelTarget?.customer?.name ?? cancelTarget?.guest_name}?`}
        confirmText="Cancel Reservation"
        variant="destructive"
        onConfirm={handleCancelConfirm}
        isLoading={cancel.isPending}
      />
      </ErrorBoundary>
    </div>
  );
}
