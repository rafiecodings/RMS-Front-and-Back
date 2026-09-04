import { describe, expect, it } from "vitest";
import {
  PERMISSION_MATRIX,
  ROLES,
  canView,
  canEdit,
  canManageRecipes,
  canAccessRevenueReport,
  canArchiveOrders,
  getRolePermissions,
} from "./permissions";

const ALL_ROLES: string[] = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.CASHIER,
  ROLES.WAITER,
  ROLES.KITCHEN_STAFF,
  ROLES.INVENTORY_STAFF,
];

// Mirrors the backend route middleware matrix so the UI guard cannot silently
// drift from the server-side authority.
describe("frontend RBAC permission matrix", () => {
  it("grants admin full edit on every module", () => {
    const perms = getRolePermissions(ROLES.ADMIN);
    for (const mod of Object.keys(PERMISSION_MATRIX.admin)) {
      expect(perms[mod as keyof typeof perms]).toBe("edit");
    }
  });

  it("lets manager view but not edit settings, and hides users", () => {
    expect(canEdit(ROLES.MANAGER, "settings")).toBe(false);
    expect(canView(ROLES.MANAGER, "settings")).toBe(true);
    expect(canView(ROLES.MANAGER, "users")).toBe(false);
    expect(canEdit(ROLES.MANAGER, "users")).toBe(false);
  });

  it("blocks cashier from reports/settings/inventory and only views pos", () => {
    expect(canView(ROLES.CASHIER, "reports")).toBe(false);
    expect(canView(ROLES.CASHIER, "settings")).toBe(false);
    expect(canView(ROLES.CASHIER, "inventory")).toBe(false);
    expect(canView(ROLES.CASHIER, "pos")).toBe(true);
    expect(canEdit(ROLES.CASHIER, "pos")).toBe(false);
  });

  it("blocks waiter from pos and reports but allows order edits", () => {
    expect(canView(ROLES.WAITER, "pos")).toBe(false);
    expect(canView(ROLES.WAITER, "reports")).toBe(false);
    expect(canEdit(ROLES.WAITER, "orders")).toBe(true);
  });

  it("gives kitchen view of orders/inventory but no pos", () => {
    expect(canView(ROLES.KITCHEN_STAFF, "orders")).toBe(true);
    expect(canView(ROLES.KITCHEN_STAFF, "inventory")).toBe(true);
    expect(canView(ROLES.KITCHEN_STAFF, "pos")).toBe(false);
  });

  it("gives inventory_staff edit on inventory but no orders/pos", () => {
    expect(canEdit(ROLES.INVENTORY_STAFF, "inventory")).toBe(true);
    expect(canView(ROLES.INVENTORY_STAFF, "orders")).toBe(false);
    expect(canView(ROLES.INVENTORY_STAFF, "pos")).toBe(false);
  });

  it("restricts recipe management to admin/manager", () => {
    expect(canManageRecipes(ROLES.ADMIN)).toBe(true);
    expect(canManageRecipes(ROLES.MANAGER)).toBe(true);
    expect(canManageRecipes(ROLES.INVENTORY_STAFF)).toBe(false);
  });

  it("restricts revenue report to admin/manager and order archive to admin/manager", () => {
    for (const role of ALL_ROLES) {
      const revenueAllowed = ([ROLES.ADMIN, ROLES.MANAGER] as string[]).includes(role);
      const archiveAllowed = ([ROLES.ADMIN, ROLES.MANAGER] as string[]).includes(role);
      expect(canAccessRevenueReport(role)).toBe(revenueAllowed);
      expect(canArchiveOrders(role)).toBe(archiveAllowed);
    }
  });

  it("treats an unknown role as least-privileged (cashier baseline)", () => {
    expect(canView(undefined, "reports")).toBe(false);
    expect(canView("", "settings")).toBe(false);
  });
});
