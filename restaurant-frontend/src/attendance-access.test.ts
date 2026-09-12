import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import proxy from "./proxy";
import { SIDEBAR_ROLES, canView } from "@/lib/utils/permissions";

function request(path: string, role?: string) {
  return new NextRequest(`http://localhost${path}`, { headers: role ? { cookie: `rms_role=${role}` } : {} });
}

describe("attendance route access", () => {
  it.each(["cashier", "waiter", "kitchen_staff", "inventory_staff"])("gives %s self-service access without staff management", (role) => {
    expect(SIDEBAR_ROLES.attendance).toContain(role);
    expect(proxy(request("/my-attendance", role)).headers.get("location")).toBeNull();
    expect(proxy(request("/staff/attendance", role)).headers.get("location")).toContain("/unauthorized");
    expect(canView(role, "staff")).toBe(false);
  });
  it.each(["admin", "manager"])("preserves %s access to both attendance pages", (role) => {
    for (const path of ["/my-attendance", "/staff/attendance"]) {
      expect(proxy(request(path, role)).headers.get("location")).toBeNull();
    }
  });
  it("requires login and rejects unknown roles", () => {
    expect(proxy(request("/my-attendance")).headers.get("location")).toContain("/login");
    expect(proxy(request("/my-attendance", "unknown")).headers.get("location")).toContain("/unauthorized");
  });
});
