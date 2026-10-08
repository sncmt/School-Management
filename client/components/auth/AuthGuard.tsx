"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getErrorStatus } from "@/lib/api/errors";
import { useLogout, useMe } from "@/lib/auth/hooks";
import { authRoutes } from "@/lib/auth/routes";
import { goToLogin, onLogoutElsewhere } from "@/lib/auth/session";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { SessionType } from "@/lib/tenant";
import { FullPageState } from "./FullPageState";

type Props = {
  session: SessionType;
  // the change-password page itself must open while a password change is pending
  allowPasswordChange?: boolean;
  children: ReactNode;
};

/*
 * Renders children only for a loaded session of the right type. Middleware has
 * already sent visitors without a session cookie to login; this is the real
 * check, since /auth/me goes through the server (and the refresh interceptor).
 */
export function AuthGuard({ session, allowPasswordChange = false, children }: Props) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const router = useRouter();
  const { data: me, error, isPending, refetch, isRefetching } = useMe();
  const logout = useLogout(session);

  const mustChangePassword = !!me?.user.mustChangePassword && !allowPasswordChange;

  useEffect(
    () => onLogoutElsewhere(() => window.location.replace(authRoutes[session].login)),
    [session],
  );

  useEffect(() => {
    if (!mustChangePassword) return;
    const next = window.location.pathname + window.location.search;
    router.replace(`${authRoutes[session].changePassword}?next=${encodeURIComponent(next)}`);
  }, [mustChangePassword, router, session]);

  if (isPending || mustChangePassword) return <FullPageState loading />;

  if (error) {
    // 401: the refresh failed and the interceptor is already leaving for login
    if (getErrorStatus(error) === 401) {
      return (
        <FullPageState
          title={t("sessionEndedTitle")}
          message={t("sessionEndedMessage")}
          actions={<Button onClick={() => goToLogin("expired")}>{tCommon("logIn")}</Button>}
        />
      );
    }

    // 403/404 (inactive account or school, no longer a member) or the server is unreachable
    return (
      <FullPageState
        title={t("loadFailedTitle")}
        message={describeError(error)}
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              {tCommon("tryAgain")}
            </Button>
            <Button onClick={() => logout.mutate({})} disabled={logout.isPending}>
              {tCommon("logOut")}
            </Button>
          </>
        }
      />
    );
  }

  if (me.sessionType !== session) {
    return <FullPageState title={t("wrongAccountTitle")} message={t("wrongAccountMessage")} />;
  }

  return children;
}
