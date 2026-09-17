import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import proxy from "./proxy";
import { SIDEBAR_ROLES, canView } from "@/lib/utils/permissions";

function request(path: string, role?: string) {
  return new NextRequest(`http://localhost${path}`, { headers: role ? { cookie: `rms_role=${role}` } : {} });
}

describe("attendance route access (manuscript scope: hidden from defense UI)", () => {
  it.each(["cashier", "waiter", "kitchen_staff", "inventory_staff", "manager", "admin"])(
    "redirects %s from my-attendance to dashboard",
    (role) => {
      expect(proxy(request("/my-attendance", role)).headers.get("location")).toContain("/dashboard");
      expect(canView(role, "staff")).toBe(role === "admin" || role === "manager");
    }
  );
  it("sidebar has no My Attendance entry", () => {
    expect(SIDEBAR_ROLES.attendance).not.toContain("admin");
  });
  it("requires login", () => {
    expect(proxy(request("/my-attendance")).headers.get("location")).toContain("/login");
  });
});
