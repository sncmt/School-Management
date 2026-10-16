"use client";

import { ChevronDown, KeyRound, LogOut, MonitorX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

export function UserMenu({ session }: { session: SessionType }) {
  const t = useTranslations("auth.userMenu");
  const describeError = useErrorMessage();
  const { data: me } = useMe();
  const logout = useLogout(session);
  // school staff other than the super admin ask the super admin for a new password
  const passwordMode = useOwnPasswordMode();

  if (!me) return null;

  const signOut = (everywhere: boolean) =>
    logout.mutate({ everywhere }, { onError: (error) => toast.error(describeError(error)) });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          {me.user.fullname}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
