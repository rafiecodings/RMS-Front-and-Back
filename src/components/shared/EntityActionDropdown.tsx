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
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: LucideIcon;
}

export function EntityActionDropdown({
  viewHref,
  viewLabel = "View",
  editHref,
  editLabel = "Edit",
  onAction,
  actionLabel = "Delete",
  actionIcon: ActionIcon = Trash2,
}: EntityActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {viewHref && (
          <DropdownMenuItem render={<Link href={viewHref} />}>
            <Eye className="h-4 w-4 mr-2" />
            {viewLabel}
          </DropdownMenuItem>
        )}
        {editHref && (
          <DropdownMenuItem render={<Link href={editHref} />}>
            <Pencil className="h-4 w-4 mr-2" />
            {editLabel}
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
