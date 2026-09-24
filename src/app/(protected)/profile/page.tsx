"use client";

import { useState } from "react";
import { FormPageSkeleton, PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, BriefcaseBusiness, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/features/staff";
import type { StaffRole } from "@/lib/types";
import { useUser } from "@/lib/hooks";
import api from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface EmploymentInfo {
  employee_id?: string;
  position?: string;
  department?: string;
  employment_type?: string;
  hire_date?: string;
  staff_status?: string;
}

function formatDateSafe(
  dateStr: string | undefined | null,
  options: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return "Not provided";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "Not provided";
    return d.toLocaleDateString("en-PH", options);
  } catch {
    return "Not provided";
  }
}

function orNotProvided(value: string | undefined | null): string {
  return value && value.trim() !== "" ? value : "Not provided";
}

function ChangePasswordCard() {
  const { logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success("Password changed. Please login again.");
      await logout();
      router.push("/login");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
          ?.errors?.current_password?.[0] ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to change password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm New Password</Label>
            <Input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useUser();

  if (isLoading) {
    return (
      <FormPageSkeleton />
    );
  }

  const role = profile?.role ?? "user";
  const employment = (
    profile as unknown as { employment?: EmploymentInfo | null }
  )?.employment;

  const lastLogin = formatDateSafe(profile?.last_login_at, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const memberSince = formatDateSafe(profile?.created_at, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account information" />

      {/* Profile Summary */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center sm:text-left text-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold break-words">
                {profile?.name ?? "Not provided"}
              </h2>
              <p className="text-sm text-muted-foreground break-words">
                {profile?.email ?? "Not provided"}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <RoleBadge role={role as StaffRole} />
                <Badge variant={profile?.is_active ? "default" : "secondary"}>
                  {profile?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Full Name</Label>
                <p className="text-sm font-medium">{orNotProvided(profile?.name)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Email</Label>
                <p className="text-sm font-medium break-all">{orNotProvided(profile?.email)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Role</Label>
                <RoleBadge role={role as StaffRole} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Account Status</Label>
                <Badge variant={profile?.is_active ? "default" : "secondary"}>
                  {profile?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Last Login</Label>
                <p className="text-sm font-medium">{lastLogin}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Member Since</Label>
                <p className="text-sm font-medium">{memberSince}</p>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Employment Information — shown only when a staff profile exists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-4 w-4" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!employment ? (
              <p className="text-sm text-muted-foreground">
                No staff employment record is linked to this account.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">
                      Employee ID
                    </Label>
                    <p className="text-sm font-medium">
                      {orNotProvided(employment.employee_id)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">Position</Label>
                    <p className="text-sm font-medium capitalize">
                      {orNotProvided(employment.position)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">
                      Department
                    </Label>
                    <p className="text-sm font-medium capitalize">
                      {orNotProvided(employment.department)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">
                      Employment Type
                    </Label>
                    <p className="text-sm font-medium capitalize">
                      {employment.employment_type
                        ? employment.employment_type.replace(/_/g, " ")
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">Hire Date</Label>
                    <p className="text-sm font-medium">
                      {formatDateSafe(employment.hire_date, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground block mb-1">
                      Staff Status
                    </Label>
                    <Badge variant={employment.staff_status === "active" ? "default" : "secondary"}>
                      {employment.staff_status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <ChangePasswordCard />
    </div>
  );
}
