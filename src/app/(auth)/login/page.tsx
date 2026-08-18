"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared";
import { Eye, EyeOff, Store, AlertCircle } from "lucide-react";

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
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Sign in to Restaurant Management System
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {apiError && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
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
              {errors.email && touched.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
                  onBlur={() => handleBlur("password")}
                  aria-invalid={!!errors.password && touched.password}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
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
              {errors.password && touched.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isSubmitting}
              >
                {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>
        </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {year} Restaurant Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
