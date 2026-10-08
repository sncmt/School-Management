import { currentSessionType } from "@/lib/tenant";
import { authRoutes, loginPathWithNext } from "./routes";

/*
 * Browser-only session helpers. Tabs on the same site share cookies, so a
 * logout in one tab is broadcast to the others. A school subdomain is its own
 * origin, so its channel never reaches the platform or another school.
 */

type AuthMessage = { type: "LOGOUT" };

const CHANNEL_NAME = "auth";

const openChannel = () =>
  typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);

export const broadcastLogout = () => {
  const channel = openChannel();
  channel?.postMessage({ type: "LOGOUT" } satisfies AuthMessage);
  channel?.close();
};

/** Calls `onLogout` when another tab logs out. Returns the unsubscribe function. */
export const onLogoutElsewhere = (onLogout: () => void) => {
  const channel = openChannel();
  if (!channel) return () => {};

  channel.onmessage = (event: MessageEvent<AuthMessage>) => {
    if (event.data?.type === "LOGOUT") onLogout();
  };
  return () => channel.close();
};

/**
 * Leaves the app for the login page. A full page load (not router.push) so no
 * cached query or in-memory state from the old session survives.
 */
export const goToLogin = (reason?: "expired") => {
  const type = currentSessionType();
  const { pathname, search } = window.location;

  if (!type || pathname === authRoutes[type].login) return;
  window.location.replace(loginPathWithNext(type, pathname + search, reason));
};
