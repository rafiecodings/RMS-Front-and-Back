export type NotificationType =
  | "order"
  | "payment"
  | "warning"
  | "info";

export type NotificationIcon =
  | "order"
  | "payment"
  | "warning"
  | "info";

export interface NotificationAction {
  label: string;
  href: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  icon: NotificationIcon;
  title: string;
  description: string;
  time: string;
  read: boolean;
  action?: NotificationAction;
}
