"use client";

import { ChevronDown, KeyRound, LogOut, MonitorX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useMe, useOwnPasswordMode } from "@/lib/auth/hooks";
import { authRoutes } from "@/lib/auth/routes";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { SessionType } from "@/lib/tenant";
import type messages from "@/messages/en.json";

type RoleKey = keyof (typeof messages)["roles"];

/* "Abdur Rahman" -> "AR"; one word -> its first two letters. */
const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
};

/** The person logged in, at the right of the top bar: avatar, name, role, and the account menu. */
export function AccountMenu({ session }: { session: SessionType }) {
  const t = useTranslations("auth.userMenu");
  const tRoles = useTranslations("roles");
  const tShell = useTranslations("shell");
  const describeError = useErrorMessage();
  const { data: me } = useMe();
  const logout = useLogout(session);
  const passwordMode = useOwnPasswordMode();
  if (!me) return null;

  // the super admin first, then the other roles; the built-in ones in the current language
  const role =
    me.sessionType === "PLATFORM"
      ? tShell("platformAdmin")
      : [...me.roles]
          .sort((a, b) => Number(b.name === "SCHOOL_SUPER_ADMIN") - Number(a.name === "SCHOOL_SUPER_ADMIN"))
          .map((r) => (tRoles.has(r.name as RoleKey) ? tRoles(r.name as RoleKey) : r.name))
          .join(" · ");

  const signOut = (everywhere: boolean) => logout.mutate({ everywhere }, { onError: (error) => toast.error(describeError(error)) });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full p-1 text-left hover:bg-muted/60 data-[state=open]:bg-muted/60 lg:pr-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar text-xs font-semibold text-brand">
          {initials(me.user.fullname)}
        </span>
        <span className="hidden max-w-44 leading-tight lg:grid">
          <span className="truncate text-sm font-semibold">{me.user.fullname}</span>
          <span className="truncate text-xs text-muted-foreground">{role}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground lg:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="font-medium">{me.user.fullname}</div>
          <div className="truncate text-xs text-muted-foreground">{me.user.email ?? me.user.phone}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {passwordMode && (
          <DropdownMenuItem asChild>
            <Link href={authRoutes[session].changePassword}>
              <KeyRound /> {t("changePassword")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => signOut(true)} disabled={logout.isPending}>
          <MonitorX /> {t("logOutEverywhere")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut(false)} disabled={logout.isPending}>
          <LogOut /> {t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
