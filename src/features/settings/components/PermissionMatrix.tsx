"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "../hooks/useSettings";
import { LoadingSpinner } from "@/components/shared";

export function PermissionMatrix() {
  const { data: permissions, isLoading } = usePermissions();

  if (isLoading) return <LoadingSpinner />;
  if (!permissions) return null;

  const modules = [...new Set(permissions.map((p) => p.module))];
  const actions = [...new Set(permissions.map((p) => {
    const parts = p.name.split(".");
    return parts[parts.length - 1];
  }))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Permission Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-medium text-muted-foreground">
                  Module
                </th>
                {actions.map((action) => (
                  <th
                    key={action}
                    className="p-2 text-center font-medium text-muted-foreground capitalize"
                  >
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod} className="border-t">
                  <td className="p-2 font-medium capitalize">
                    {mod.replace(/_/g, " ")}
                  </td>
                  {actions.map((action) => {
                    const perm = permissions.find(
                      (p) =>
                        p.module === mod &&
                        p.name.endsWith(action)
                    );
                    return (
                      <td key={action} className="p-2 text-center">
                        {perm ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="inline-block h-2 w-2 rounded-full bg-muted" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
