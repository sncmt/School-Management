"use client";

import { ChevronDown, KeyRound, LogOut, MonitorX } from "lucide-react";
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
import { getErrorMessage } from "@/lib/api/errors";
import { useLogout, useMe } from "@/lib/auth/hooks";
import { authRoutes } from "@/lib/auth/routes";
import type { SessionType } from "@/lib/tenant";

export function UserMenu({ session }: { session: SessionType }) {
  const { data: me } = useMe();
  const logout = useLogout(session);

  if (!me) return null;

  const signOut = (everywhere: boolean) =>
    logout.mutate({ everywhere }, { onError: (error) => toast.error(getErrorMessage(error)) });

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
        <DropdownMenuItem asChild>
          <Link href={authRoutes[session].changePassword}>
            <KeyRound /> Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => signOut(true)} disabled={logout.isPending}>
          <MonitorX /> Log out of all devices
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut(false)} disabled={logout.isPending}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
