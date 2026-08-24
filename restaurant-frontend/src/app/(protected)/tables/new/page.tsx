"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { TableForm } from "@/features/tables";
import { useTables } from "@/lib/hooks";
import { toast } from "sonner";
import type { TableFormData } from "@/lib/types";

export default function NewTablePage() {
  const router = useRouter();
  const { create } = useTables();

  function handleSubmit(data: TableFormData) {
    create.mutate(
      data,
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
        description="Create a new table"
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
