"use client";

import Link from "next/link";
import { MoreHorizontal, Eye, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EntityActionDropdownProps {
  viewHref?: string;
  viewLabel?: string;
  editHref?: string;
  editLabel?: string;
  onView?: () => void;
  onEdit?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onArchive?: () => void;
  archiveLabel?: string;
  archiveIcon?: LucideIcon;
}

export function EntityActionDropdown({
  viewHref,
  viewLabel = "View",
  editHref,
  editLabel = "Edit",
  onView,
  onEdit,
  onAction,
  actionLabel = "Delete",
  actionIcon: ActionIcon = Trash2,
  onArchive,
  archiveLabel = "Archive",
  archiveIcon: ArchiveIcon = Trash2,
}: EntityActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(viewHref || onView) && (
          <DropdownMenuItem
            render={viewHref ? <Link href={viewHref} /> : undefined}
            onClick={onView}
          >
            <Eye className="h-4 w-4 mr-2" />
            {viewLabel}
          </DropdownMenuItem>
        )}
        {(editHref || onEdit) && (
          <DropdownMenuItem
            render={editHref ? <Link href={editHref} /> : undefined}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {editLabel}
          </DropdownMenuItem>
        )}
        {onArchive && (
          <DropdownMenuItem onClick={onArchive} variant="destructive">
            <ArchiveIcon className="h-4 w-4 mr-2" />
            {archiveLabel}
          </DropdownMenuItem>
        )}
        {onAction && (
          <DropdownMenuItem onClick={onAction} variant="destructive">
            <ActionIcon className="h-4 w-4 mr-2" />
            {actionLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
