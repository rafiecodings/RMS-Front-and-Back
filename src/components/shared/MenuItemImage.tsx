"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Generic clean placeholder — never show the browser broken-image icon. */
export const MENU_ITEM_FALLBACK = "/images/placeholders/menu-item.png";

interface MenuItemImageProps {
  /** Relative public path, e.g. /images/menu-items/lumpiang-shanghai.jpg */
  src?: string | null;
  alt: string;
  /** Container supplies size/aspect; image fills it with object-cover. */
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Shared menu-item image with graceful fallback.
 *
 * - Missing src or a failed load swaps to the RMS placeholder.
 * - Parent container must be `relative` and define the aspect ratio;
 *   the image renders with `fill` + `object-cover`.
 */
export function MenuItemImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: MenuItemImageProps) {
  const [failed, setFailed] = useState(false);
  const effectiveSrc = !src || failed ? MENU_ITEM_FALLBACK : src;

  return (
    <Image
      src={effectiveSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
