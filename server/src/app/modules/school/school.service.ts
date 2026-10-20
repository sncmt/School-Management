import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import httpStatus from "http-status";
import { generateSchoolCode } from "../../helpers/schoolCode";
import type {
  ChangeableSchoolStatus,
  CreateSchoolPayload,
  GetAllSchoolsQuery,
  UpdateSchoolPayload,
} from "./school.type";
import type { SchoolStatus, SubscriptionPlan } from "../../../../generated/prisma/enums";
import { recordPayment } from "../subscription/subscription.service";
import type { PaymentInput } from "../subscription/subscription.validation";
import { buildQueryOptions, paginate } from "../../utils/queryBuilder";
import { Prisma } from "../../../../generated/prisma/client";
import { PasswordUtils } from "../../utils/password";
import { processImage } from "../../shared/imageUpload";
import { deleteFile, fileKey, putFile, withFileUrls } from "../../shared/storage";


const createSchool = async (data: CreateSchoolPayload) => {

   const [subdomainTaken, emailTaken, emailUsedByUser] = await Promise.all([
    prisma.school.findUnique({
      where: { subdomain: data.subdomain },
      select: { id: true },
    }),
    prisma.school.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
  ]);

  if (subdomainTaken)
    throw new AppError("Subdomain is already taken", httpStatus.CONFLICT);
  if (emailTaken)
    throw new AppError(
      "Email is already in use by another school",
      httpStatus.CONFLICT,
    );
  if (emailUsedByUser)
    throw new AppError(
      "This email already belongs to a user account. Every school needs its own email address",
      httpStatus.CONFLICT,
    );

  let schoolCode = generateSchoolCode();
  while (await prisma.school.findUnique({ where: { schoolCode } })) {
    schoolCode = generateSchoolCode();
  }

  return prisma.school.create({
    data: { ...data, schoolCode, status: "PENDING" },
  });
};

/*
 * Activates a school: its super admin account, free modules, and its subscription (the plan and
 * the first month's or year's payment, which the school pays at activation), all at once.
 */
const activateSchool = async (
  schoolId: string,
  subscription: { plan: SubscriptionPlan; payment: Omit<PaymentInput, "plan"> },
  recordedBy: string,
) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });

  if (!school) {
    throw new AppError("School not found", httpStatus.NOT_FOUND);
  }
  if (school.status === "ACTIVE") {
    throw new AppError("School is already active", httpStatus.BAD_REQUEST);
  }
  if (!school.email) {
    throw new AppError(
      "School must have an email set before it can be activated",
      httpStatus.BAD_REQUEST,
    );
  }

  // Fail fast, before touching the DB, if this email is already taken
  // by an unrelated User account.
  const existingUser = await prisma.user.findUnique({
    where: { email: school.email },
    select: { id: true },
  });
  if (existingUser) {
    throw new AppError(
      "A user with this email already exists. Cannot auto-create a super admin account.",
      httpStatus.CONFLICT,
    );
  }

  const temporaryPassword = PasswordUtils.generateTemporaryPassword();
  const passwordHash = await PasswordUtils.hashPassword(temporaryPassword);

  const result = await prisma.$transaction(async (tx) => {
    const updatedSchool = await tx.school.update({
      where: { id: schoolId },
      data: { status: "ACTIVE", activationDate: new Date(), subscriptionPlan: subscription.plan },
    });

    // the first period, paid at activation
    await recordPayment(tx, schoolId, subscription.plan, subscription.payment, recordedBy);

    // 1. Provision free modules
    const freeModules = await tx.module.findMany({
      where: { type: "FREE", isActive: true },
      select: { id: true },
    });
    
    if (freeModules.length > 0) {
      await tx.schoolModule.createMany({
        data: freeModules.map((m) => ({ schoolId, moduleId: m.id, isEnabled: true })),
        skipDuplicates: true,
      });
    }

    // 2. Ensure SCHOOL_SUPER_ADMIN role exists for this school
    const superAdminRole = await tx.role.upsert({
      where: { scope_schoolId_name: { scope: "SCHOOL", schoolId, name: "SCHOOL_SUPER_ADMIN" } },
      update: {},
      create: {
        scope: "SCHOOL",
        schoolId,
        name: "SCHOOL_SUPER_ADMIN",
        description: "Full access within this school",
        isSystem: true,
      },
    });

    // 3. Create the super admin user, using the school's own email/name
    const superAdminUser = await tx.user.create({
      data: {
        fullname: updatedSchool.nameEn,
        email: updatedSchool.email!, // already validated non-null above
        password: passwordHash,
      },
    });

    // 4. Membership + role assignment
    const membership = await tx.schoolMembership.create({
      data: { userId: superAdminUser.id, schoolId, status: "ACTIVE" },
    });

    await tx.userRole.create({
      data: { userId: superAdminUser.id, roleId: superAdminRole.id, membershipId: membership.id },
    });

    return { school: updatedSchool, superAdminUser };
  });

  return {
    school: result.school,
    superAdmin: {
      id: result.superAdminUser.id,
      fullname: result.superAdminUser.fullname,
      email: result.superAdminUser.email,
    },
    temporaryPassword,
  };
};

// const createSchoolSuperAdmin = async (
//   schoolId: string,
//   data: { fullname: string; email: string },
// ) => {
//   const school = await prisma.school.findUnique({ where: { id: schoolId } });
//   if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);
//   if (school.status !== "ACTIVE") {
//     throw new AppError(
//       "School must be active before adding a super admin",
//       httpStatus.BAD_REQUEST,
//     );
//   }

//   const superAdminRole = await prisma.role.findUnique({
//     where: {
//       scope_schoolId_name: {
//         scope: "SCHOOL",
//         schoolId,
//         name: "SCHOOL_SUPER_ADMIN",
//       },
//     },
//   });
//   if (!superAdminRole) {
//     throw new AppError(
//       "Super admin role not provisioned for this school",
//       httpStatus.INTERNAL_SERVER_ERROR,
//     );
//   }

//   let user = await prisma.user.findUnique({ where: { email: data.email } });
//   let temporaryPassword: string | undefined;

//   if (!user) {
//   const temporaryPassword = PasswordUtils.generateTemporaryPassword();
//   const passwordHash = await PasswordUtils.hashPassword(temporaryPassword);
  
//     user = await prisma.user.create({
//       data: {
//         fullname: data.fullname,
//         email: data.email,
//         password: passwordHash,
//       },
//     });
//   }

//   const membership = await prisma.schoolMembership.upsert({
//     where: { userId_schoolId: { userId: user.id, schoolId } },
//     update: { status: "ACTIVE" },
//     create: { userId: user.id, schoolId, status: "ACTIVE" },
//   });

//   await prisma.userRole.upsert({
//     where: {
//       userId_roleId_membershipId: {
//         userId: user.id,
//         roleId: superAdminRole.id,
//         membershipId: membership.id,
//       },
//     },
//     update: {},
//     create: {
//       userId: user.id,
//       roleId: superAdminRole.id,
//       membershipId: membership.id,
//     },
//   });

//   return {
//     user: { id: user.id, fullname: user.fullname, email: user.email },
//     temporaryPassword, // undefined if the user already existed (e.g. staff at another school too)
//   };
// };

const getAllSchools = async (query: GetAllSchoolsQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildQueryOptions(query, {
    searchableFields: ["nameEn", "nameBn", "subdomain", "schoolCode", "phone", "email"],
  });

  const result = await paginate(
    (args) => prisma.school.findMany(args),
    (args) => prisma.school.count(args),
    { where, orderBy, skip, take } as Prisma.SchoolFindManyArgs,
    page,
    limit,
  );

  // the stored logo keys as signed links
  return {
    ...result,
    data: await Promise.all(result.data.map((school) => withFileUrls(school, ["logo", "favicon"]))),
  };
};

/*
 * What a school's own site may show before anyone logs in: name, logo and
 * language. Only active schools; anything else is "not found".
 */
const getPublicSite = async (subdomain: string) => {
  const school = await prisma.school.findUnique({
    where: { subdomain },
    select: {
      nameEn: true,
      nameBn: true,
      subdomain: true,
      language: true,
      logo: true,
      favicon: true,
      status: true,
    },
  });
  if (!school || school.status !== "ACTIVE") {
    throw new AppError("School not found!", httpStatus.NOT_FOUND);
  }

  const { status: _status, ...site } = school;
  return withFileUrls(site, ["logo", "favicon"]);
};

// ------------------------------------------------------------- one school

// the account created at activation, from the school's system super admin role
const findSuperAdmin = (schoolId: string) =>
  prisma.userRole
    .findFirst({
      where: { role: { schoolId, name: "SCHOOL_SUPER_ADMIN", isSystem: true } },
      orderBy: { createdAt: "asc" },
      select: {
        user: {
          select: { id: true, fullname: true, email: true, phone: true, isActive: true },
        },
      },
    })
    .then((userRole) => userRole?.user ?? null);

/** A school with its super admin, how many are using it, and its enabled modules. */
const getSchoolById = async (schoolId: string) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);

  const [superAdmin, activeStudents, activeTeachers, schoolModules] = await Promise.all([
    findSuperAdmin(schoolId),
    prisma.student.count({ where: { schoolId, status: "ACTIVE" } }),
    prisma.teacherProfile.count({ where: { schoolId, status: { in: ["ACTIVE", "ON_LEAVE"] } } }),
    prisma.schoolModule.findMany({
      where: { schoolId, isEnabled: true },
      select: { module: { select: { code: true, name: true, type: true } } },
      orderBy: { module: { name: "asc" } },
    }),
  ]);

  return {
    ...(await withFileUrls(school, ["logo", "favicon"])),
    superAdmin,
    stats: { activeStudents, activeTeachers },
    modules: schoolModules.map((sm) => sm.module),
  };
};

const updateSchool = async (schoolId: string, data: UpdateSchoolPayload) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, email: true, activationDate: true },
  });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);

  if (data.email && data.email !== school.email) {
    // the super admin logs in with this email; changing only the school's copy would split them
    if (school.activationDate) {
      throw new AppError(
        "The school email is its super admin's login, so it can't change after activation",
        httpStatus.BAD_REQUEST,
      );
    }
    const [emailTaken, emailUsedByUser] = await Promise.all([
      prisma.school.findFirst({ where: { email: data.email, NOT: { id: schoolId } }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: data.email }, select: { id: true } }),
    ]);
    if (emailTaken) throw new AppError("Email is already in use by another school", httpStatus.CONFLICT);
    if (emailUsedByUser) {
      throw new AppError(
        "This email already belongs to a user account. Every school needs its own email address",
        httpStatus.CONFLICT,
      );
    }
  }

  if (data.phone) {
    const phoneTaken = await prisma.school.findFirst({
      where: { phone: data.phone, NOT: { id: schoolId } },
      select: { id: true },
    });
    if (phoneTaken) throw new AppError("Phone is already in use by another school", httpStatus.CONFLICT);
  }

  return prisma.school.update({ where: { id: schoolId }, data });
};

/*
 * Which status changes are allowed. PENDING -> ACTIVE is /activate (it creates
 * the super admin); ACTIVE here means reactivating a school that was active
 * before. Suspended, inactive and expired schools can't log in or open their
 * site, since auth checks the status on every request.
 */
const STATUS_CHANGES: Record<SchoolStatus, ChangeableSchoolStatus[]> = {
  PENDING: ["INACTIVE"],
  ACTIVE: ["SUSPENDED", "INACTIVE"],
  SUSPENDED: ["ACTIVE", "INACTIVE"],
  INACTIVE: ["ACTIVE"],
  EXPIRED: ["ACTIVE", "INACTIVE"],
};

const changeSchoolStatus = async (schoolId: string, status: ChangeableSchoolStatus) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { status: true, activationDate: true },
  });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);

  if (school.status === status) {
    throw new AppError(`School is already ${status.toLowerCase()}`, httpStatus.BAD_REQUEST);
  }
  if (status === "ACTIVE" && !school.activationDate) {
    throw new AppError(
      "This school has never been activated. Activate it to create its super admin",
      httpStatus.BAD_REQUEST,
    );
  }
  if (!STATUS_CHANGES[school.status].includes(status)) {
    throw new AppError(
      `A ${school.status.toLowerCase()} school can't be changed to ${status.toLowerCase()}`,
      httpStatus.BAD_REQUEST,
    );
  }

  return prisma.school.update({ where: { id: schoolId }, data: { status } });
};

/**
 * A new password for the school's super admin. Every session they have is ended.
 */
const resetSuperAdminPassword = async (schoolId: string) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);

  const superAdmin = await findSuperAdmin(schoolId);
  if (!superAdmin) {
    throw new AppError("This school has no super admin yet. Activate it first", httpStatus.BAD_REQUEST);
  }

  const temporaryPassword = PasswordUtils.generateTemporaryPassword();
  const passwordHash = await PasswordUtils.hashPassword(temporaryPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: superAdmin.id },
      data: { password: passwordHash, tokensValidAfter: new Date() },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: superAdmin.id } }),
  ]);

  return {
    superAdmin: { id: superAdmin.id, fullname: superAdmin.fullname, email: superAdmin.email },
    temporaryPassword,
  };
};

// ------------------------------------------------------------------ branding

type BrandingImage = "logo" | "favicon";

/* A school's logo (512 px WebP) or favicon (64 px PNG): stores the new one, drops the old. */
const setBrandingImage = async (schoolId: string, kind: BrandingImage, upload: Buffer) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { logo: true, favicon: true } });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);

  const image = await processImage(upload, kind);
  const key = fileKey(`schools/${schoolId}`, kind, image.extension);
  await putFile(key, image.body, image.contentType);

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: { [kind]: key },
    select: { id: true, logo: true, favicon: true },
  });
  await deleteFile(school[kind]);
  return withFileUrls(updated, ["logo", "favicon"]);
};

const removeBrandingImage = async (schoolId: string, kind: BrandingImage) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { logo: true, favicon: true } });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: { [kind]: null },
    select: { id: true, logo: true, favicon: true },
  });
  await deleteFile(school[kind]);
  return withFileUrls(updated, ["logo", "favicon"]);
};

export const SchoolService = {
  setBrandingImage,
  removeBrandingImage,
  createSchool,
  activateSchool,
  getAllSchools,
  getPublicSite,
  getSchoolById,
  updateSchool,
  changeSchoolStatus,
  resetSuperAdminPassword,
};
