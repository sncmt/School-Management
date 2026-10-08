"use client";

import type { ReactNode } from "react";
import { useCan } from "@/lib/auth/hooks";
import type { PermissionCheck } from "@/lib/auth/permissions";

type Props = {
  permission: PermissionCheck;
  // with a list: need any one of them instead of all
  any?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
};

/** Shows children only when the school session has the permission. */
export function Can({ permission, any, fallback = null, children }: Props) {
  const can = useCan();
  return can(permission, { any }) ? children : fallback;
}

/** Page-level version of <Can>: shows a "no access" message instead of nothing. */
export function RequirePermission({ permission, any, children }: Omit<Props, "fallback">) {
  return (
    <Can
      permission={permission}
      any={any}
      fallback={
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="font-semibold">You don&apos;t have access to this page</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask your school administrator if you need it.
          </p>
        </div>
      }
    >
      {children}
    </Can>
  );
}
