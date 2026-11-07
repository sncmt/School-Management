import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { PasswordUtils } from "../../utils/password";
import { AuthService } from "../auth/auth.service";
import { logPasswordChange } from "../auth/passwordLog";
import type { SchoolUsersQuery, SetUserPasswordPayload } from "./school.validation";

/*
 * The platform admin and a school's people: everyone with a login there (the super admin,
 * teachers, staff, guardians), and setting any one's password. The platform sees every school,
 * so a login also used at another school can be changed too (the new password works there as
 * well). Never a platform admin's own account: that changes only through its own login.
 */

const SUPER_ADMIN = "SCHOOL_SUPER_ADMIN";
const GUARDIAN = "GUARDIAN";
const TEACHER = "TEACHER";

const findSchool = async (schoolId: string) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);
};

/* The school's logins, by name: who, their roles here, and whether the account is in use elsewhere. */
const listUsers = async (schoolId: string, query: SchoolUsersQuery) => {
  await findSchool(schoolId);
  const { search, role, page, limit } = query;
  const text = search ? { contains: search, mode: "insensitive" as const } : undefined;
  const roleWhere: Prisma.SchoolMembershipWhereInput =
    role === "SUPER_ADMIN"
      ? { roles: { some: { role: { name: SUPER_ADMIN, isSystem: true } } } }
      : role === "TEACHER"
        ? { roles: { some: { role: { name: TEACHER, isSystem: true } } } }
        : role === "GUARDIAN"
          ? { roles: { some: { role: { name: GUARDIAN, isSystem: true } } } }
          : role === "STAFF"
            ? { roles: { some: { role: { isSystem: false } } } }
            : {};
  const where: Prisma.SchoolMembershipWhereInput = {
    schoolId,
    ...roleWhere,
    ...(text ? { user: { OR: [{ fullname: text }, { email: text }, { phone: { contains: search } }] } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.schoolMembership.findMany({
      where,
      orderBy: [{ user: { fullname: "asc" } }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        status: true,
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
            phone: true,
            isActive: true,
            _count: { select: { memberships: true } },
            userRoles: { where: { membershipId: null }, select: { id: true } },
          },
        },
        roles: { select: { role: { select: { name: true, isSystem: true } } } },
      },
    }),
    prisma.schoolMembership.count({ where }),
  ]);

  return {
    items: rows.map((m) => ({
      membershipId: m.id,
      status: m.status,
      user: { id: m.user.id, fullname: m.user.fullname, email: m.user.email, phone: m.user.phone, isActive: m.user.isActive },
      // SUPER_ADMIN, TEACHER, GUARDIAN, or a role the school made (by its name)
      roles: m.roles.map((r) => (r.role.isSystem ? r.role.name.replace("SCHOOL_", "") : r.role.name)),
      // the same login at other schools too
      otherSchools: m.user._count.memberships - 1,
      // a platform admin's account: not changed from here
      platformAdmin: m.user.userRoles.length > 0,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/*
 * A new password for someone of the school: the one typed, or one made up (shown once). Every
 * session of the account ends, here and at any other school it is used at.
 */
const setUserPassword = async (schoolId: string, userId: string, adminId: string, data: SetUserPasswordPayload) => {
  await findSchool(schoolId);
  const user = await prisma.user.findFirst({
    where: { id: userId, memberships: { some: { schoolId } } },
    select: {
      id: true,
      fullname: true,
      _count: { select: { memberships: true } },
      userRoles: { where: { membershipId: null }, select: { id: true } },
    },
  });
  if (!user) throw new AppError("This account is not part of the school", httpStatus.NOT_FOUND);
  if (user.userRoles.length > 0) {
    throw new AppError("This is a platform administrator's account; it changes only through its own login", httpStatus.FORBIDDEN);
  }

  const generated = !data.newPassword;
  const password = data.newPassword ?? PasswordUtils.generateTemporaryPassword();
  await AuthService.setPassword(user.id, password);
  await logPasswordChange(prisma, { targetUserId: user.id, schoolId, source: "PLATFORM", changedById: adminId, generated });

  return {
    user: { id: user.id, fullname: user.fullname },
    // only a made-up one is sent back, to pass on
    temporaryPassword: generated ? password : null,
    otherSchools: user._count.memberships - 1,
  };
};

/* The passwords set for the school's people, newest first. */
const passwordLog = async (schoolId: string, query: { page: number; limit: number }) => {
  await findSchool(schoolId);
  const where = { schoolId };
  const [items, total] = await Promise.all([
    prisma.passwordChangeLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.passwordChangeLog.count({ where }),
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
};

export const SchoolUsersService = { listUsers, setUserPassword, passwordLog };
