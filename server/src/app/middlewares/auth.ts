import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { prisma } from "../../../lib/prisma";
import { authConfig } from "../config/auth.config";
import { AppError } from "../errorHandler/AppError";
import { cookieNames } from "../utils/cookieOptions";
import { DomainUtils } from "../utils/domain";
import { JwtUtils } from "../utils/jwt";

type AuthSession = "PLATFORM" | "SCHOOL";

type AuthenticateOptions = {
  // SCHOOL routes only: true = real school members only, never a platform admin
  // working inside a school through the X-School-Id header
  memberOnly?: boolean;
};

const SCHOOL_ID_HEADER = "x-school-id";

/* "Authorization: Bearer <token>": the mobile app's school session (it has no cookies). */
const getBearerToken = (req: Request) => /^Bearer\s+(\S+)$/i.exec(req.get("authorization") ?? "")?.[1];

const loadUser = (id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true, tokensValidAfter: true },
  });

type LoadedUser = Awaited<ReturnType<typeof loadUser>>;

const assertUsable = (user: LoadedUser, tokenIssuedAt: number) => {
  if (!user) throw new AppError("User not found!", httpStatus.UNAUTHORIZED);
  if (!user.isActive) throw new AppError("Your account is inactive!", httpStatus.FORBIDDEN);

  // password change and logout-all kill access tokens issued before them
  if (user.tokensValidAfter && tokenIssuedAt < Math.floor(user.tokensValidAfter.getTime() / 1000)) {
    throw new AppError("Your session has been revoked!", httpStatus.UNAUTHORIZED);
  }
  return user;
};

/* Verifies a platform access token and that the user is still an APP_ADMIN. */
const verifyPlatformAdmin = async (token: string) => {
  const decoded = JwtUtils.verifyToken(token, authConfig.accessSecret);
  if (decoded.sessionType !== "PLATFORM") {
    throw new AppError("Invalid session!", httpStatus.UNAUTHORIZED);
  }

  const [rawUser, adminRole] = await Promise.all([
    loadUser(decoded.userId),
    prisma.userRole.findFirst({
      where: {
        userId: decoded.userId,
        membershipId: null,
        role: { name: "APP_ADMIN", scope: "PLATFORM", schoolId: null },
      },
      select: { id: true },
    }),
  ]);

  const user = assertUsable(rawUser, decoded.iat);
  if (!adminRole) {
    throw new AppError("You are not authorized as a platform administrator!", httpStatus.FORBIDDEN);
  }
  return user;
};

const authenticate = (sessionType?: AuthSession, options: AuthenticateOptions = {}) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
   
    try {
      // a request with a Bearer token is judged by it alone: always a school session,
      // never mixed with cookies (and so never a platform admin inside a school)
      const bearerToken = getBearerToken(req);
      const platformToken = bearerToken ? undefined : (req.cookies?.[cookieNames.PLATFORM.access] as string | undefined);
      const schoolToken = bearerToken ?? (req.cookies?.[cookieNames.SCHOOL.access] as string | undefined);
      const headerSchoolId = req.get(SCHOOL_ID_HEADER)?.trim();

      let mode: "PLATFORM" | "SCHOOL" | "TENANT_ADMIN" | undefined;

      if (sessionType === "PLATFORM") {
        mode = platformToken ? "PLATFORM" : undefined;
      } else if (sessionType === "SCHOOL") {
        if (schoolToken) mode = "SCHOOL";
        // a platform admin working inside one school; the header is honoured
        // only together with a valid platform session, never for school users
        else if (platformToken && headerSchoolId && !options.memberOnly) mode = "TENANT_ADMIN";
      } else {
        mode = platformToken ? "PLATFORM" : schoolToken ? "SCHOOL" : undefined;
      }
      if (!mode) throw new AppError("Authentication required!", httpStatus.UNAUTHORIZED);

      // ---------------------------------------------------------- platform
      if (mode === "PLATFORM") {
        const user = await verifyPlatformAdmin(platformToken!);

        req.auth = {
          userId: user.id,
          sessionType: "PLATFORM",
        };
        return next();
      }

      // ----------------------------------- platform admin inside a school
      if (mode === "TENANT_ADMIN") {
        if (headerSchoolId!.length > 64) {
          throw new AppError("Invalid school id!", httpStatus.BAD_REQUEST);
        }

        const [user, school] = await Promise.all([
          verifyPlatformAdmin(platformToken!),
          // any status: admins set a school up while it is still PENDING
          prisma.school.findUnique({ where: { id: headerSchoolId! }, select: { id: true } }),
        ]);
        if (!school) throw new AppError("School not found!", httpStatus.NOT_FOUND);

        req.auth = {
          userId: user.id,
          sessionType: "SCHOOL",
          schoolId: school.id,
          isPlatformAdmin: true,
        };
        return next();
      }

      // ------------------------------------------------------------ school
      const decoded = JwtUtils.verifyToken(schoolToken!, authConfig.accessSecret);
      if (decoded.sessionType !== "SCHOOL") {
        throw new AppError("Invalid session!", httpStatus.UNAUTHORIZED);
      }

      const subdomain = DomainUtils.getSchoolSubdomain(req.hostname);
      if (!subdomain) throw new AppError("Invalid school domain!", httpStatus.BAD_REQUEST);

      const [rawUser, school, membership] = await Promise.all([
        loadUser(decoded.userId),
        prisma.school.findUnique({ where: { subdomain }, select: { id: true, status: true } }),
        prisma.schoolMembership.findFirst({
          where: { userId: decoded.userId, schoolId: decoded.schoolId, status: "ACTIVE" },
          select: { id: true },
        }),
      ]);

      const user = assertUsable(rawUser, decoded.iat);

      if (!school) throw new AppError("School not found!", httpStatus.NOT_FOUND);
      if (school.status !== "ACTIVE") {
        throw new AppError("This school is not active!", httpStatus.FORBIDDEN);
      }
      if (school.id !== decoded.schoolId) {
        throw new AppError("Invalid school session!", httpStatus.FORBIDDEN);
      }
      if (!membership) {
        throw new AppError("You are not a member of this school!", httpStatus.FORBIDDEN);
      }

      req.auth = {
        userId: user.id,
        sessionType: "SCHOOL",
        schoolId: school.id,
        membershipId: membership.id,
      };
      return next();
    } catch (error) {
      next(error);
    }
  };
};

export default authenticate;