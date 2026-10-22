import axios, { type InternalAxiosRequestConfig } from "axios";
import { goToLogin } from "@/lib/auth/session";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { currentSessionType } from "@/lib/tenant";
import { getErrorStatus } from "./errors";

/*
 * Calls go to /api/v1 on the page's own host, and next.config.ts rewrites them
 * to Express. The server needs this: it blocks cross-origin writes, keeps
 * cookies host-only and reads the school from the hostname.
 */
export const httpClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/*
 * Text on screen shows Bangla digits in Bangla (see components/i18n/BanglaDigits), so a number
 * copied from the page, or typed in Bangla, arrives in a search box as "২০২৭০০০১". The server
 * stores ASCII digits: query values go out with ASCII digits, so those searches still match.
 */
httpClient.interceptors.request.use((config) => {
  if (config.params && typeof config.params === "object") {
    config.params = Object.fromEntries(
      Object.entries(config.params as Record<string, unknown>).map(([key, value]) => [key, typeof value === "string" ? toAsciiDigits(value) : value]),
    );
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// A 401 from these means "wrong credentials" or "no session", never "access token expired".
const NO_REFRESH = /^\/?auth\/(platform|school)\/(login|refresh|logout)$/;

// refresh answers that mean the session can't continue
const SESSION_OVER = new Set([401, 403, 404]);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const refreshSession = async () => {
  const segment = currentSessionType() === "PLATFORM" ? "platform" : "school";
  try {
    await httpClient.post(`/auth/${segment}/refresh`);
  } catch (error) {
    // 409: another tab rotated this refresh token a moment ago. Its response
    // sets the new cookies for every tab, so give it a moment and retry.
    if (getErrorStatus(error) === 409) return wait(500);
    throw error;
  }
};

// One refresh at a time: every request that gets a 401 meanwhile waits for it.
let refreshInFlight: Promise<void> | null = null;

const refreshOnce = () => {
  refreshInFlight ??= refreshSession().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

httpClient.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as RetriableConfig | undefined;

  if (
    typeof window === "undefined" ||
    !currentSessionType() || // the marketing site has no session to refresh
    getErrorStatus(error) !== 401 ||
    !config ||
    config._retried ||
    NO_REFRESH.test(config.url ?? "")
  ) {
    throw error;
  }

  config._retried = true;

  try {
    await refreshOnce();
  } catch (refreshError) {
    // 401/403/404: the session is over and the server has cleared the cookies.
    // Anything else (rate limited, server or network error) is not a logout;
    // the caller shows the error and can retry.
    if (SESSION_OVER.has(getErrorStatus(refreshError) ?? 0)) goToLogin("expired");
    throw error;
  }

  return httpClient(config);
});
