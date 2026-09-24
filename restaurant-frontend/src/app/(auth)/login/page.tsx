"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSplash } from "@/components/shared";
import { Eye, EyeOff, Store, CircleAlert, Mail, Lock, TriangleAlert } from "lucide-react";

interface FormErrors {
  email?: string;
  password?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return undefined;
}

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  const year = new Date().getFullYear();

  const validate = (): boolean => {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setErrors({ email: emailErr, password: passwordErr });
    return !emailErr && !passwordErr;
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field === "email" ? email : password;
    const err = field === "email" ? validateEmail(value) : validatePassword(value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  /** Caps Lock gives no visual cue in a masked field — surface it explicitly. */
  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");

    setTouched({ email: true, password: true });
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const apiErr = err as {
        response?: {
          status?: number;
          data?: { message?: string; errors?: Record<string, string[]> };
        };
      };
      if (apiErr.response?.data?.errors) {
        const fieldErrors = apiErr.response.data.errors;
        setErrors({
          email: fieldErrors.email?.[0],
          password: fieldErrors.password?.[0],
        });
        setApiError(apiErr.response.data.message || "Please fix the errors below");
      } else if (apiErr.response?.status === 429) {
        setApiError(
          apiErr.response.data?.message ||
            "Too many login attempts. Please try again later."
        );
      } else {
        const status = apiErr.response?.status;

        if (status === 401) {
          setApiError("Invalid email or password");
        } else if (status === 403) {
          setApiError(apiErr.response?.data?.message || "Access denied.");
        } else if (status && status >= 500) {
          setApiError("Server error. Please try again later.");
        } else if (!apiErr.response) {
          setApiError("Unable to connect. Please try again.");
        } else {
          setApiError(
            apiErr.response?.data?.message ||
              "Something went wrong. Please try again."
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <AppSplash />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT — brand panel (desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute inset-0 opacity-10 [background:radial-gradient(circle_at_20%_20%,white_0%,transparent_45%),radial-gradient(circle_at_80%_70%,white_0%,transparent_40%)]" />
        <div className="relative flex items-center gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-4 motion-safe:duration-500">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Store className="h-6 w-6" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Restaurant Management System
          </span>
        </div>

        <div className="relative max-w-md space-y-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-700" style={{ animationDelay: "120ms", animationFillMode: "backwards" }}>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Run your restaurant, end to end.
          </h2>
          <p className="text-base leading-relaxed text-primary-foreground/85">
            One system for orders, tables, kitchen, inventory and
            decision-ready analytics — built for real service.
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/90">
            {[
              "Restaurant Operations — orders, KOT & POS",
              "Inventory & Suppliers",
              "Reports & Analytics",
              "AI Demand Forecast",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/70">
          &copy; {year} Restaurant Management System
        </p>
      </div>

      {/* RIGHT — login card */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent lg:hidden" />
        <div className="relative w-full max-w-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 lg:hidden">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue managing your restaurant.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-7 shadow-card sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {apiError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@restaurant.com"
                  className="h-11 pl-9 transition-shadow"
                  autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    setErrors((prev) => ({
                      ...prev,
                      email: validateEmail(e.target.value),
                    }));
                  }
                }}
                onBlur={() => handleBlur("email")}
                  aria-invalid={!!errors.email && touched.email}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
              {errors.email && touched.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="h-11 pl-9 pr-12 transition-shadow"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      setErrors((prev) => ({
                        ...prev,
                        password: validatePassword(e.target.value),
                      }));
                    }
                  }}
                  onBlur={() => {
                    handleBlur("password");
                    setCapsLockOn(false);
                  }}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  aria-invalid={!!errors.password && touched.password}
                  aria-describedby={capsLockOn ? "caps-lock-warning" : undefined}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {capsLockOn && (
                <p
                  id="caps-lock-warning"
                  className="flex items-center gap-1.5 text-xs text-warning"
                >
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  Caps Lock is on
                </p>
              )}
              {errors.password && touched.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="submit"
                className="w-full h-11 text-base transition-transform active:scale-[0.99]"
                loading={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Secure restaurant operations platform · &copy; {year} RMS
        </p>
        </div>
      </div>
    </div>
  );
}
