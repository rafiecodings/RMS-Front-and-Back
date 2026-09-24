import { ListPageSkeleton } from "@/components/shared";

/**
 * Default route-level fallback for the whole protected area. Nested routes
 * without their own `loading.tsx` inherit this, so navigation shows a shaped
 * placeholder instead of a blank content pane.
 */
export default function ProtectedLoading() {
  return <ListPageSkeleton />;
}
