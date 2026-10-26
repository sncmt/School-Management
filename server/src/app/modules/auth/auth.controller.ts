import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { authConfig } from "../../config/auth.config";
import { AppError } from "../../errorHandler/AppError";
import { DomainUtils } from "../../utils/domain";
import {
  clearAuthCookies,
  cookieNames,
  setAuthCookies,
  type SessionType,
} from "../../utils/cookieOptions";
import { AuthService } from "./auth.service";
import { RefreshRetryError, type ClientMeta } from "./refreshToken.service";
import { UserPasswordService } from "./userPassword.service";

type SessionResult = { accessToken: string; refreshToken: string; refreshExpiresAt: Date };

const getClientMeta = (req: Request): ClientMeta => ({
  userAgent: req.get("user-agent")?.slice(0, 255),
  ipAddress: req.ip,
});

// the school always comes from the host the request arrived on, never from the body
const getSchoolSubdomain = (req: Request) => {
  const subdomain = DomainUtils.getSchoolSubdomain(req.hostname);
  if (!subdomain) throw new AppError("Invalid school domain!", httpStatus.BAD_REQUEST);
  return subdomain;
};

/*
 * The mobile app (header "X-Client: mobile") has no cookies: its school session's tokens
 * travel in the request and response bodies instead. School sessions only.
 */
const isMobileSession = (req: Request, type: SessionType) =>
  type === "SCHOOL" && req.get("x-client")?.toLowerCase() === "mobile";

/*
 * The app's refresh token, from the body only. Never fall back to the cookie: a script on
 * the website could then add the header and read the browser's httpOnly token in the reply.
 */
const bodyRefreshToken = (req: Request) => {
  const token: unknown = req.body?.refreshToken;
  return typeof token === "string" && token.length > 0 && token.length <= 256 ? token : undefined;
};

/* A new session to the client: cookies for the browser, or the tokens to put in the body. */
const deliverSession = (req: Request, res: Response, type: SessionType, result: SessionResult) => {
  if (!isMobileSession(req, type)) {
    setAuthCookies(res, type, result);
    return null;
  }
  return {
    accessToken: result.accessToken,
    accessExpiresIn: authConfig.accessTtlSeconds,
    refreshToken: result.refreshToken,
    refreshExpiresAt: result.refreshExpiresAt,
  };
};

/*
 * Shared by both refresh endpoints. A failed refresh clears the cookies so the
 * client can't loop. The exception is RefreshRetryError (another tab just
 * refreshed): the cookies in the browser are now the winner's, so clearing
 * them would log that tab out.
 */
const refreshHandler = <T extends SessionResult>(
  type: SessionType,
  run: (rawToken: string, req: Request) => Promise<T>,
  pick: (result: T) => object,
) =>
  catchAsync(async (req: Request, res: Response) => {
    const mobile = isMobileSession(req, type);
    const rawToken = mobile ? bodyRefreshToken(req) : (req.cookies?.[cookieNames[type].refresh] as string | undefined);

    if (!rawToken) {
      if (!mobile) clearAuthCookies(res, type);
      throw new AppError("Refresh token is required!", httpStatus.UNAUTHORIZED);
    }

    let result: T;
    try {
      result = await run(rawToken, req);
    } catch (error) {
      if (!mobile && !(error instanceof RefreshRetryError)) clearAuthCookies(res, type);
      throw error;
    }

    const tokens = deliverSession(req, res, type, result);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Token refreshed successfully!",
      data: { ...pick(result), ...(tokens && { tokens }) },
    });
  });


// Platform Login
const platformLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.platformLogin(req.body, getClientMeta(req));
  setAuthCookies(res, "PLATFORM", result);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful!",
    data: { user: result.user },
  });
});

const schoolLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.schoolLogin(
    { ...req.body, subdomain: getSchoolSubdomain(req) },
    getClientMeta(req),
  );
  const tokens = deliverSession(req, res, "SCHOOL", result);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful!",
    data: { user: result.user, school: result.school, roles: result.roles, ...(tokens && { tokens }) },
  });
});

const refreshPlatformAccessToken = refreshHandler(
  "PLATFORM",
  (rawToken, req) => AuthService.refreshPlatformAccessToken(rawToken, getClientMeta(req)),
  (result) => ({ user: result.user }),
);

const refreshSchoolAccessToken = refreshHandler(
  "SCHOOL",
  (rawToken, req) =>
    AuthService.refreshSchoolAccessToken(rawToken, getSchoolSubdomain(req), getClientMeta(req)),
  (result) => ({ user: result.user, school: result.school }),
);

const logoutHandler = (type: SessionType) =>
  catchAsync(async (req: Request, res: Response) => {
    const mobile = isMobileSession(req, type);
    await AuthService.logout(mobile ? bodyRefreshToken(req) : req.cookies?.[cookieNames[type].refresh]);
    if (!mobile) clearAuthCookies(res, type);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Logout successful!",
      data: null,
    });
  });

const platformLogout = logoutHandler("PLATFORM");
const schoolLogout = logoutHandler("SCHOOL");

const logoutAllSessions = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logoutAllSessions(req.auth!.userId);

  clearAuthCookies(res, "PLATFORM");
  clearAuthCookies(res, "SCHOOL");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out from all sessions!",
    data: null,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getMe(req.auth!);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully!",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(req.auth!, req.body, getClientMeta(req));
  // every other session has ended; this device carries on with a fresh one
  const tokens = deliverSession(req, res, req.auth!.sessionType, result);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully!",
    data: tokens && { tokens },
  });
});

// ---------------------------------------- the school super admin changing passwords

const sendPasswordCode = catchAsync(async (req: Request, res: Response) => {
  const result = await UserPasswordService.sendCode(req.auth!, req.body.userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Code sent to your email", data: result });
});

const setUserPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await UserPasswordService.changeWithCode(req.auth!, req.params.userId as string, req.body, getClientMeta(req));
  // their own password: this device stays logged in with fresh cookies
  if (result.session) setAuthCookies(res, "SCHOOL", result.session);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully!",
    data: { self: result.self, user: result.user },
  });
});

export const AuthController = {
  sendPasswordCode,
  setUserPassword,
  platformLogin,
  refreshPlatformAccessToken,
  platformLogout,
  schoolLogin,
  refreshSchoolAccessToken,
  schoolLogout,
  logoutAllSessions,
  getMe,
  changePassword,
};