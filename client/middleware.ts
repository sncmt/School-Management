import { NextResponse, type NextRequest } from "next/server";
import { authRoutes, publicNoticeHref, publicSchoolRoutes, sessionFlagCookie, siteAppFolder } from "@/lib/auth/routes";
import { getSiteFromHost, type SessionType } from "@/lib/tenant";

/*
 * Routes each request by host, then gates logged-in areas.
 *
 *   localhost:3000        marketing pages only (app/(marketing))
 *   admin.localhost:3000  platform admin, served from app/platform/*
 *   abc.localhost:3000    school "abc", served from app/school/*
 *
 * The gate only checks the readable session flag cookie, so it is a fast
 * redirect, not security: AuthGuard and the server decide who gets in. When a
 * session really ends, the server clears the flag too, so redirects can't loop.
 */

const APP_FOLDERS = Object.values(siteAppFolder);

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

// the app folders are internal: never reachable by their own URL
const isAppFolderPath = (pathname: string) => APP_FOLDERS.some((folder) => isUnder(pathname, folder));

// any path without a page renders app/not-found
const notFound = (req: NextRequest) => NextResponse.rewrite(new URL("/_not-found", req.url));

// req.url carries the server's own address, not the subdomain, so build
// redirects from the Host header to stay on the same site
const redirect = (req: NextRequest, path: string) => {
  const host = req.headers.get("host") ?? req.nextUrl.host;
  return NextResponse.redirect(new URL(path, `${req.nextUrl.protocol}//${host}`));
};

// the notice board had its own pages before it became a section of the homepage: old links still land
const OLD_NOTICE_BOARD = "/notice-board";

/** A logged-in site (admin or school): login is public, everything else needs a session. */
const appSite = (req: NextRequest, type: SessionType) => {
  const { pathname, search } = req.nextUrl;
  const { login, home } = authRoutes[type];
  const hasSession = req.cookies.has(sessionFlagCookie[type]);

  if (isAppFolderPath(pathname)) return notFound(req);

  if (type === "SCHOOL" && isUnder(pathname, OLD_NOTICE_BOARD)) {
    const noticeId = pathname.slice(OLD_NOTICE_BOARD.length + 1).split("/")[0];
    return redirect(req, noticeId ? publicNoticeHref(decodeURIComponent(noticeId)) : publicSchoolRoutes.notices);
  }

  if (type === "SCHOOL" && pathname === publicSchoolRoutes.home) {
    // no session check: the school's public homepage (logged in or not)
  } else if (pathname === login) {
    if (hasSession) return redirect(req, home);
  } else if (!hasSession) {
    return redirect(req, `${login}?${new URLSearchParams({ next: pathname + search })}`);
  } else if (pathname === "/" && home !== "/") {
    return redirect(req, home);
  }

  const url = req.nextUrl.clone();
  url.pathname = siteAppFolder[type] + (pathname === "/" ? "" : pathname);
  return NextResponse.rewrite(url);
};

export function middleware(req: NextRequest) {
  const site = getSiteFromHost(req.headers.get("host"));

  if (site.type === "MARKETING") {
    return isAppFolderPath(req.nextUrl.pathname) ? notFound(req) : NextResponse.next();
  }
  return appSite(req, site.type);
}

export const config = {
  // everything except the API proxy, Next internals and files with an extension
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
