"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { PermissionInfo } from "@/lib/school/roles";

/*
 * Permissions are shown in groups by their area: "student:create" belongs to "student".
 * Groups keep the order the server sends (by module), and each permission's label comes
 * from the messages when there is one, else the server's English name.
 */

export type PermissionGroup = { key: string; module: string; permissions: PermissionInfo[] };

export const groupKeyOf = (code: string) => code.split(":")[0];
const actionOf = (code: string) => code.split(":")[1] ?? code;

export const groupPermissions = (permissions: PermissionInfo[]): PermissionGroup[] => {
  const groups = new Map<string, PermissionGroup>();
  for (const p of permissions) {
    const key = groupKeyOf(p.code);
    const group = groups.get(key) ?? { key, module: p.module.code, permissions: [] };
    group.permissions.push(p);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/* "student:create" -> "student:view": what an action in the group needs to be any use. */
export const viewOf = (group: PermissionGroup) => group.permissions.find((p) => actionOf(p.code) === "view")?.code;

/** Labels for groups and permissions, in the current language. */
export const usePermissionLabels = () => {
  const t = useTranslations("school.roles.catalog");
  return {
    group: useCallback((key: string) => (t.has(`groups.${key}` as "groups.student") ? t(`groups.${key}` as "groups.student") : key), [t]),
    permission: useCallback(
      (p: PermissionInfo) => {
        const path = `perms.${groupKeyOf(p.code)}.${actionOf(p.code)}`;
        return t.has(path as "perms.student.view") ? t(path as "perms.student.view") : p.name;
      },
      [t],
    ),
  };
};
