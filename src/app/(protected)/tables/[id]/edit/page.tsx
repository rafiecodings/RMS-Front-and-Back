"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormPageSkeleton, PageHeader } from "@/components/shared";
import { TableForm } from "@/features/tables";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTables } from "@/lib/hooks";
import { toast } from "sonner";
import type { TableFormData } from "@/lib/types";

export default function EditTablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { list, update } = useTables();

  const tables = list.data ?? [];
  const table = tables.find((t) => t.id === id);

  function handleSubmit(data: TableFormData) {
    update.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast.success("Table updated successfully");
          router.push(`/tables/${id}`);
        },
        onError: () => toast.error("Failed to update table"),
      }
    );
  }

  if (list.isLoading) {
    return (
      <FormPageSkeleton />
    );
  }

  if (!table) {
    return (
      <div>
        <PageHeader
          title="Table Not Found"
          description="The table you're trying to edit doesn't exist."
          action={
            <Button variant="outline" size="sm" render={<Link href="/tables" />}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Tables
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
          title={`Edit Table ${table.number}`}
        description="Update table details"
        action={
          <Button variant="outline" size="sm" render={<Link href="/tables" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm max-w-2xl">
        <TableForm
          initialData={table}
          onSubmit={handleSubmit}
          isLoading={update.isPending}
          submitLabel="Update Table"
        />
      </div>
    </div>
  );
}
