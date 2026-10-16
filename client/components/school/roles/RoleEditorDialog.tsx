"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateRole, useUpdateRole, type PermissionInfo, type Role } from "@/lib/school/roles";
import { cn } from "@/lib/utils";
import { groupPermissions, usePermissionLabels, viewOf } from "./permissionGroups";

/**
 * Make a role, or change one: its name, a note, and what it may do. The Teacher role
 * keeps its name; only its permissions change.
 */
export function RoleEditorDialog({
  role,
  permissions,
  onClose,
}: {
  // undefined: closed; null: a new role
  role: Role | null | undefined;
  permissions: PermissionInfo[];
  onClose: () => void;
}) {
  const t = useTranslations("school.roles.editor");
  return (
    <Dialog open={role !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{role ? t(role.kind === "TEACHER" ? "teacherTitle" : "editTitle", { name: role.name }) : t("addTitle")}</DialogTitle>
          <DialogDescription>{t(role?.kind === "TEACHER" ? "teacherDescription" : "description")}</DialogDescription>
        </DialogHeader>
        {role !== undefined && <RoleForm key={role?.id ?? "new"} role={role} permissions={permissions} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RoleForm({ role, permissions, onDone }: { role: Role | null; permissions: PermissionInfo[]; onDone: () => void }) {
  const t = useTranslations("school.roles.editor");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const labels = usePermissionLabels();
  const create = useCreateRole();
  const update = useUpdateRole();
  const saving = create.isPending || update.isPending;
  const isTeacher = role?.kind === "TEACHER";
  const groups = groupPermissions(permissions);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [chosen, setChosen] = useState(() => new Set(role?.permissions ?? []));
  const [error, setError] = useState<string | null>(null);

  // ticking an action also ticks the group's "view"; unticking "view" unticks the group
  const toggle = (group: ReturnType<typeof groupPermissions>[number], code: string, on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      const view = viewOf(group);
      if (on) {
        next.add(code);
        if (view) next.add(view);
      } else if (code === view) {
        group.permissions.forEach((p) => next.delete(p.code));
      } else {
        next.delete(code);
      }
      return next;
    });
  const toggleGroup = (group: ReturnType<typeof groupPermissions>[number], on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      group.permissions.forEach((p) => (on ? next.add(p.code) : next.delete(p.code)));
      return next;
    });

  const submit = async () => {
    setError(null);
    if (!isTeacher && name.trim().length < 2) return setError(t("nameRequired"));
    const codes = [...chosen].filter((c) => permissions.some((p) => p.code === c));
    try {
      if (role) {
        await update.mutateAsync({
          roleId: role.id,
          body: isTeacher ? { permissions: codes } : { name: name.trim(), description: description.trim() || null, permissions: codes },
        });
      } else {
        await create.mutateAsync({ name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}), permissions: codes });
      }
      toast.success(t("saved", { name: role?.name ?? name.trim() }));
      onDone();
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />
      {!isTeacher && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="role-name" required>
              {t("name")}
            </Label>
            <Input id="role-name" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-description">{t("note")}</Label>
            <Input id="role-description" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t("permissions", { count: chosen.size })}</span>
        <span className="text-xs text-muted-foreground">{t("viewHint")}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => {
          const on = group.permissions.filter((p) => chosen.has(p.code)).length;
          return (
            <div key={group.key} className={cn("rounded-md border p-3", on > 0 && "border-primary/40 bg-primary/5")}>
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={on === group.permissions.length}
                  ref={(el) => {
                    if (el) el.indeterminate = on > 0 && on < group.permissions.length;
                  }}
                  onChange={(e) => toggleGroup(group, e.target.checked)}
                />
                {labels.group(group.key)}
              </label>
              <div className="space-y-1 pl-6">
                {group.permissions.map((p) => (
                  <label key={p.code} className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={chosen.has(p.code)}
                      onChange={(e) => toggle(group, p.code, e.target.checked)}
                    />
                    <span>{labels.permission(p)}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saving}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
