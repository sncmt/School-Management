import type { Me } from "./types";

export type PermissionCheck = string | string[];

/**
 * True when the session holds the permission (or, for a list, all of them;
 * pass `any` to need just one). Platform admins aren't school members, so
 * school permissions never apply to them.
 */
export const hasPermission = (
  me: Me | undefined,
  required: PermissionCheck,
  { any = false }: { any?: boolean } = {},
) => {
  if (!me || me.sessionType !== "SCHOOL") return false;

  const codes = Array.isArray(required) ? required : [required];
  if (codes.length === 0) return true;

  const granted = new Set(me.permissions);
  return any ? codes.some((code) => granted.has(code)) : codes.every((code) => granted.has(code));
};
