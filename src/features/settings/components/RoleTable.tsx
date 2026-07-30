"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Shield } from "lucide-react";
import { useRoles } from "../hooks/useSettings";
import { RoleForm } from "./RoleForm";
import { LoadingSpinner } from "@/components/shared";
import type { Role } from "../types";

export function RoleTable() {
  const { data: roles, isLoading } = useRoles();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();

  const roleList = Array.isArray(roles) ? roles : [];

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Roles</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingRole(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent>
          {roleList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleList.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{role.display_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {role.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.permissions.length} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>{role.users_count}</TableCell>
                    <TableCell>
                      <Badge variant={role.is_system ? "outline" : "default"}>
                        {role.is_system ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!role.is_system && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setEditingRole(role);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editingRole}
      />
    </>
  );
}
