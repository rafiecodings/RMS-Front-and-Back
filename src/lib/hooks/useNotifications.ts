import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { Notification } from "@/lib/types";

const STORAGE_KEY = "notifications";
const MAX_NOTIFICATIONS = 50;

function generateId(): string {
  if (typeof window !== "undefined" && typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function loadFromStorage(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is Notification =>
        n &&
        typeof n.id === "string" &&
        typeof n.title === "string" &&
        typeof n.read === "boolean"
    );
  } catch {
    return [];
  }
}

function persistToStorage(notifications: Notification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function addNotification(
  queryClient: QueryClient,
  notification: Omit<Notification, "id" | "time" | "read">
): void {
  const newNotification: Notification = {
    ...notification,
    id: generateId(),
    time: new Date().toISOString(),
    read: false,
  };

  queryClient.setQueryData<Notification[]>(
    ["notifications"],
    (current = []) => {
      const next = [newNotification, ...current].slice(0, MAX_NOTIFICATIONS);
      persistToStorage(next);
      return next;
    }
  );
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: loadFromStorage,
    initialData: [],
  });

  const notifications = query.data ?? [];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    queryClient.setQueryData<Notification[]>(
      ["notifications"],
      (current = []) => {
        const next = current.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        persistToStorage(next);
        return next;
      }
    );
  };

  const markAllRead = () => {
    queryClient.setQueryData<Notification[]>(
      ["notifications"],
      (current = []) => {
        const next = current.map((n) => ({ ...n, read: true }));
        persistToStorage(next);
        return next;
      }
    );
  };

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  };
}
