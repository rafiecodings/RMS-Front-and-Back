"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { TableForm } from "@/features/tables";
import { useTables, useFloorPlans } from "@/lib/hooks";
import { toast } from "sonner";
import type { TableFormData } from "@/lib/types";

export default function NewTablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const floorPlanId = searchParams.get("floor_plan_id") ?? "";

  const { create } = useTables(floorPlanId || undefined);
  const { list: fpList } = useFloorPlans();
  const floorPlans = fpList.data ?? [];
  const activeFloorPlan = floorPlans.find((fp) => fp.id === floorPlanId);

  function handleSubmit(data: TableFormData) {
    if (!floorPlanId) {
      toast.error("No floor plan selected");
      return;
    }
    create.mutate(
      { ...data, floor_plan_id: floorPlanId },
      {
        onSuccess: () => {
          toast.success("Table created successfully");
          router.push("/tables");
        },
        onError: () => toast.error("Failed to create table"),
      }
    );
  }

  return (
    <div>
      <PageHeader
        title="Add Table"
        description={
          activeFloorPlan
            ? `Adding to ${activeFloorPlan.name}`
            : "Create a new table"
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        <TableForm
          onSubmit={handleSubmit}
          isLoading={create.isPending}
          submitLabel="Create Table"
        />
      </div>
    </div>
  );
}
