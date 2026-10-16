import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { ensureMembership, ensureRole, findOrCreateAccount, GUARDIAN_ROLE, TEACHER_ROLE } from "../../shared/schoolAccounts";
import { isUniqueViolation } from "../../utils/prismaError";
import type { AddStaffPayload, CreateRolePayload, UpdateRolePayload } from "./role.validation";

/*
 * A school's roles and its staff. The system roles are fixed: SCHOOL_SUPER_ADMIN may do
 * everything, GUARDIAN is the family login; TEACHER's permissions are the school's to set.
 * Everything else is a role the school made (Accountant, Office…) from the permissions of
 * its enabled modules. Only the super admin manages these (see the routes).
 */

type Db = Prisma.TransactionClient;

const SUPER_ADMIN = "SCHOOL_SUPER_ADMIN";
const RESERVED = new Set([SUPER_ADMIN, TEACHER_ROLE.name, GUARDIAN_ROLE.name].map((n) => n.toLowerCase()));

export type RoleKind = "SUPER_ADMIN" | "TEACHER" | "GUARDIAN" | "CUSTOM";
const kindOf = (role: { name: string; isSystem: boolean }): RoleKind =>
  !role.isSystem ? "CUSTOM" : role.name === SUPER_ADMIN ? "SUPER_ADMIN" : role.name === TEACHER_ROLE.name ? "TEACHER" : "GUARDIAN";
const KIND_ORDER: Record<RoleKind, number> = { SUPER_ADMIN: 0, TEACHER: 1, GUARDIAN: 2, CUSTOM: 3 };

/* The permissions a school can give: active ones of its enabled modules. */
const permissionCatalog = (db: Db, schoolId: string) =>
  db.permission.findMany({
    where: { isActive: true, module: { isActive: true, schoolModules: { some: { schoolId, isEnabled: true } } } },
    select: { id: true, code: true, name: true, module: { select: { code: true, name: true } } },
    orderBy: [{ module: { name: "asc" } }, { code: "asc" }],
  });

const findRole = async (db: Db, schoolId: string, roleId: string) => {
  const role = await db.role.findFirst({ where: { id: roleId, scope: "SCHOOL", schoolId } });
  if (!role) throw new AppError("Role not found", httpStatus.NOT_FOUND);
  return role;
};

/* "Accountant" and "accountant" are one name; the system roles' names are taken. */
const assertNameFree = async (db: Db, schoolId: string, name: string, excludeId?: string) => {
  if (RESERVED.has(name.toLowerCase())) throw new AppError("This name belongs to a built-in role", httpStatus.CONFLICT);
  const clash = await db.role.findFirst({
    where: { scope: "SCHOOL", schoolId, name: { equals: name, mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new AppError("A role with this name already exists", httpStatus.CONFLICT);
};

/* The chosen codes as permission ids; a code the school can't give is refused. */
const permissionIds = async (db: Db, schoolId: string, codes: string[]) => {
  const catalog = await permissionCatalog(db, schoolId);
  const byCode = new Map(catalog.map((p) => [p.code, p.id]));
  const unknown = codes.filter((c) => !byCode.has(c));
  if (unknown.length > 0) throw new AppError(`These permissions can't be given: ${unknown.join(", ")}`, httpStatus.BAD_REQUEST);
  return { ids: codes.map((c) => byCode.get(c)!), catalogIds: catalog.map((p) => p.id) };
};

// --------------------------------------------------------------------- roles

const getRoles = async (schoolId: string) => {
  // the Teacher role exists from the start, so its permissions can be set before the first teacher
  await prisma.$transaction((tx) => ensureRole(tx, schoolId, TEACHER_ROLE));

  const [roles, catalog] = await Promise.all([
    prisma.role.findMany({
      where: { scope: "SCHOOL", schoolId },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permission: { select: { code: true } } } },
        _count: { select: { userRoles: true } },
      },
    }),
    permissionCatalog(prisma, schoolId),
  ]);

  return {
    roles: roles
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        kind: kindOf(r),
        members: r._count.userRoles,
        permissions: r.permissions.map((p) => p.permission.code).sort(),
      }))
      .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name)),
    // what can be given, grouped on the screen
    permissions: catalog.map((p) => ({ code: p.code, name: p.name, module: p.module })),
  };
};

const createRole = async (schoolId: string, data: CreateRolePayload) =>
  prisma.$transaction(async (tx) => {
    await assertNameFree(tx, schoolId, data.name);
    const { ids } = await permissionIds(tx, schoolId, data.permissions);
    try {
      const role = await tx.role.create({
        data: { scope: "SCHOOL", schoolId, name: data.name, description: data.description || null, isSystem: false },
      });
      await tx.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId: role.id, permissionId })) });
      return role;
    } catch (e) {
      if (isUniqueViolation(e)) throw new AppError("A role with this name already exists", httpStatus.CONFLICT);
      throw e;
    }
  });

/*
 * A custom role: name, description, permissions. The Teacher role: permissions only.
 * Permissions of modules the school doesn't have now are left as they were.
 */
const updateRole = async (schoolId: string, roleId: string, data: UpdateRolePayload) =>
  prisma.$transaction(async (tx) => {
    const role = await findRole(tx, schoolId, roleId);
    const kind = kindOf(role);
    if (kind === "SUPER_ADMIN" || kind === "GUARDIAN") throw new AppError("This built-in role can't be changed", httpStatus.FORBIDDEN);
    if (kind === "TEACHER" && (data.name !== undefined || data.description !== undefined)) {
      throw new AppError("Only the Teacher role's permissions can be changed", httpStatus.FORBIDDEN);
    }

    if (data.name !== undefined && data.name !== role.name) await assertNameFree(tx, schoolId, data.name, roleId);
    if (data.name !== undefined || data.description !== undefined) {
      await tx.role.update({
        where: { id: roleId },
        data: { ...(data.name !== undefined ? { name: data.name } : {}), ...(data.description !== undefined ? { description: data.description || null } : {}) },
      });
    }
    if (data.permissions) {
      const { ids, catalogIds } = await permissionIds(tx, schoolId, data.permissions);
      await tx.rolePermission.deleteMany({ where: { roleId, permissionId: { in: catalogIds } } });
      await tx.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId, permissionId })), skipDuplicates: true });
    }
    return { id: roleId };
  });

/* A custom role nobody has. */
const deleteRole = async (schoolId: string, roleId: string) =>
  prisma.$transaction(async (tx) => {
    const role = await findRole(tx, schoolId, roleId);
    if (role.isSystem) throw new AppError("Built-in roles can't be deleted", httpStatus.FORBIDDEN);
    const members = await tx.userRole.count({ where: { roleId } });
    if (members > 0) {
      throw new AppError(`${members} staff ${members === 1 ? "member has" : "members have"} this role. Take it from them first`, httpStatus.CONFLICT);
    }
    await tx.role.delete({ where: { id: roleId } });
  });

// --------------------------------------------------------------------- staff

const memberSelect = {
  id: true,
  status: true,
  user: { select: { id: true, fullname: true, phone: true, email: true, isActive: true } },
  teacherProfile: { select: { id: true, nameEn: true, nameBn: true } },
  roles: { select: { role: { select: { id: true, name: true, isSystem: true } } } },
} satisfies Prisma.SchoolMembershipSelect;

const toMember = (m: Prisma.SchoolMembershipGetPayload<{ select: typeof memberSelect }>) => ({
  membershipId: m.id,
  status: m.status,
  user: m.user,
  teacher: m.teacherProfile,
  roles: m.roles.map((r) => ({ id: r.role.id, name: r.role.name, kind: kindOf(r.role) })).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
});

/* Everyone working at the school: the super admin, teachers and staff (not the family logins). */
const getStaff = async (schoolId: string) => {
  const members = await prisma.schoolMembership.findMany({
    where: { schoolId, roles: { some: { role: { name: { not: GUARDIAN_ROLE.name } } } } },
    select: memberSelect,
    orderBy: { user: { fullname: "asc" } },
  });
  return members.map(toMember);
};

/* Only roles the school made can be given here (teachers come from Teachers). */
const assertCustomRoles = async (db: Db, schoolId: string, roleIds: string[]) => {
  const roles = await db.role.findMany({ where: { id: { in: roleIds }, scope: "SCHOOL", schoolId, isSystem: false }, select: { id: true } });
  if (roles.length !== roleIds.length) throw new AppError("One or more roles were not found", httpStatus.BAD_REQUEST);
};

/*
 * A staff member who isn't a teacher. A new account gets a generated password (shown
 * once); a number that already has an account keeps its password and gets the roles.
 */
const addStaff = async (schoolId: string, data: AddStaffPayload) =>
  prisma.$transaction(async (tx) => {
    await assertCustomRoles(tx, schoolId, data.roleIds);
    const account = await findOrCreateAccount(tx, { phone: data.phone, fullname: data.fullname, password: "GENERATED" });
    const membershipId = await ensureMembership(tx, schoolId, account.userId);
    await tx.userRole.createMany({
      data: data.roleIds.map((roleId) => ({ userId: account.userId, roleId, membershipId })),
      skipDuplicates: true,
    });
    const member = await tx.schoolMembership.findUniqueOrThrow({ where: { id: membershipId }, select: memberSelect });
    return {
      member: toMember(member),
      account: { status: account.created ? ("CREATED" as const) : ("LINKED" as const), loginPhone: data.phone, password: account.password },
    };
  });

/*
 * Sets the member's school-made roles to exactly these; super admin, teacher and guardian
 * stay. A member left with no role at all can no longer log in to the school.
 */
const setStaffRoles = async (schoolId: string, membershipId: string, roleIds: string[]) =>
  prisma.$transaction(async (tx) => {
    const membership = await tx.schoolMembership.findFirst({ where: { id: membershipId, schoolId }, select: { id: true, userId: true } });
    if (!membership) throw new AppError("Member not found", httpStatus.NOT_FOUND);
    await assertCustomRoles(tx, schoolId, roleIds);

    await tx.userRole.deleteMany({ where: { membershipId, role: { isSystem: false }, roleId: { notIn: roleIds } } });
    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId: membership.userId, roleId, membershipId })),
      skipDuplicates: true,
    });

    const left = await tx.userRole.count({ where: { membershipId } });
    if (left === 0) {
      await tx.schoolMembership.update({ where: { id: membershipId }, data: { status: "INACTIVE", leftAt: new Date() } });
    } else {
      await ensureMembership(tx, schoolId, membership.userId);
    }
    const member = await tx.schoolMembership.findUniqueOrThrow({ where: { id: membershipId }, select: memberSelect });
    return toMember(member);
  });

export const RoleService = { getRoles, createRole, updateRole, deleteRole, getStaff, addStaff, setStaffRoles };
