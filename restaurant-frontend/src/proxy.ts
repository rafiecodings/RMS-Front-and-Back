import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 "proxy" file (replaces the deprecated middleware convention).
 *
 * Handles two concerns:
 *  1. Authentication gating — unauthenticated users hitting protected routes
 *     are redirected to /login?redirect=<path>.
 *  2. Role-based access control (RBAC) — authenticated users whose role is not
 *     permitted on a route are redirected to /unauthorized (403-equivalent).
 *
 * The role is read from an `rms_role` cookie that AuthProvider sets on login
 * and on token refresh. This is a UX/early-gate only: the backend enforces RBAC
 * authoritatively on every API request via RoleMiddleware, so tampering with this
 * cookie has no privilege-escalation impact.
 *
 * Mirror any route additions in src/providers/AuthProvider role cookie + backend
 * routes/api/*.php role middleware.
 */

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

// Protected route → allowed roles. "any" = any authenticated user.
// Aligned with permissions.ts PERMISSION_MATRIX/SIDEBAR_ROLES and the
// backend routes/api/*.php role middleware (backend stays authoritative).
const ROLE_GUARDS: Record<string, string[] | "any"> = {
  // Admin-only sections
  "/admin": ["admin", "manager"],
  "/settings": ["admin", "manager"],
  "/reports": ["admin", "manager"],
  "/analytics": ["admin", "manager"],
  "/staff": ["admin", "manager"],
  "/billing": ["admin", "manager"],

  // Menu is viewable by front-of-house/kitchen roles; edits remain
  // admin/manager (enforced again per-request by the backend).
  "/menu": ["admin", "manager", "cashier", "waiter", "kitchen_staff"],

  // Inventory staff (full) + admin/manager (view)
  "/inventory": ["admin", "manager", "inventory_staff"],

  // Kitchen: KOT + kitchen order views (waiters track their items too)
  "/kitchen": ["admin", "manager", "kitchen_staff", "waiter"],

  // Front-of-house: POS, orders, tables, reservations, customers, dashboard.
  // - POS excludes waiter: the payment endpoint is role:admin,manager,cashier,
  //   so a waiter could build a cart but never complete payment.
  // - Reservations excludes cashier: backend reads are role:admin,manager,waiter.
  "/pos": ["admin", "manager", "cashier"],
  "/orders": ["admin", "manager", "cashier", "waiter", "kitchen_staff"],
  "/tables": ["admin", "manager", "cashier", "waiter"],
  "/reservations": ["admin", "manager", "waiter"],
  "/customers": ["admin", "manager", "cashier", "waiter"],
  "/dashboard": ["admin", "manager", "cashier", "waiter", "kitchen_staff", "inventory_staff"],

  // Everyone authenticated
  "/profile": "any",
};

function getRoleFromCookie(request: NextRequest): string | null {
  return request.cookies.get("rms_role")?.value ?? null;
}

function matchesPath(pathname: string, prefix: string): boolean {
  if (prefix === "/") return true;
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never gate static / API / build assets.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const role = getRoleFromCookie(request);
  const isAuthenticated = !!role;

  // The 403 destination page must always render standalone. It is never
  // auth/RBAC gated so it can never be redirected to itself.
  if (pathname === "/unauthorized") {
    return NextResponse.next();
  }

  // Unauthenticated → public routes allowed; everything else → /login.
  if (!isAuthenticated) {
    if (isPublic) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but landed on a public (auth) route → leave in ONE hop:
  // /dashboard when the role may enter it, otherwise /unauthorized directly
  // (avoids the /login → /dashboard → /unauthorized bounce chain).
  if (isPublic) {
    const dashboardGuard = ROLE_GUARDS["/dashboard"];
    const dashboardAllowed =
      dashboardGuard === "any" || dashboardGuard.includes(role ?? "");
    return NextResponse.redirect(
      new URL(dashboardAllowed ? "/dashboard" : "/unauthorized", request.url)
    );
  }

  // Match the longest guard prefix first.
  const matched = Object.entries(ROLE_GUARDS).sort(
    ([a], [b]) => b.length - a.length,
  ).find(([prefix]) => matchesPath(pathname, prefix));

  if (!matched) {
    return NextResponse.next();
  }

  const [, allowed] = matched;
  if (allowed === "any") {
    return NextResponse.next();
  }

  if (!allowed.includes(role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
