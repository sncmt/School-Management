import httpStatus from "http-status";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { Mailer } from "../../utils/mailer";
import { AuthService } from "./auth.service";
import type { ClientMeta } from "./refreshToken.service";

/*
 * The school super admin changes the password of anyone in the school (themselves too).
 * Each change is confirmed with a 6-digit code emailed to the super admin: the code names
 * the account, lasts 10 minutes, allows 5 tries and is used once.
 */

type Auth = NonNullable<Express.Request["auth"]>;

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60_000;

const hashCode = (targetUserId: string, code: string) => createHash("sha256").update(`${targetUserId}:${code}`).digest("hex");

/* "school@example.com" -> "sc****@example.com" */
const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
};

/* The super admin asking, with the email the code goes to. */
const findSuperAdmin = async (auth: Auth) => {
  if (auth.isPlatformAdmin || !auth.membershipId) {
    throw new AppError("Only the school super admin can change passwords", httpStatus.FORBIDDEN);
  }
  const user = await prisma.user.findFirst({
    where: {
      id: auth.userId,
      userRoles: {
        some: { membershipId: auth.membershipId, role: { name: "SCHOOL_SUPER_ADMIN", isSystem: true, schoolId: auth.schoolId } },
      },
    },
    select: { id: true, email: true },
  });
  if (!user) throw new AppError("Only the school super admin can change passwords", httpStatus.FORBIDDEN);
  if (!user.email) throw new AppError("Your account has no email address to send the code to", httpStatus.BAD_REQUEST);
  return { id: user.id, email: user.email };
};

/*
 * The account whose password changes: anyone in this school, even when the same login is
 * also used at another school (the new password works there too). A platform admin's
 * account is never changed from a school.
 */
const findTarget = async (schoolId: string, userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, memberships: { some: { schoolId } } },
    select: { id: true, fullname: true, phone: true, email: true, userRoles: { where: { membershipId: null }, select: { id: true } } },
  });
  if (!user) throw new AppError("This account is not part of your school", httpStatus.NOT_FOUND);
  if (user.userRoles.length > 0) {
    throw new AppError("This account is a platform administrator's; only the platform can change its password", httpStatus.FORBIDDEN);
  }
  return { id: user.id, fullname: user.fullname, phone: user.phone, email: user.email };
};

/* Emails the super admin a code for changing this account's password. */
const sendCode = async (auth: Auth, targetUserId: string) => {
  const schoolId = auth.schoolId!;
  const admin = await findSuperAdmin(auth);
  const target = await findTarget(schoolId, targetUserId);

  const last = await prisma.passwordChangeCode.findFirst({
    where: { requestedById: admin.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_AFTER_MS) {
    throw new AppError("A code was sent less than a minute ago. Wait a moment before asking again", httpStatus.TOO_MANY_REQUESTS);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { nameEn: true } });

  // one live code per super admin; expired codes of anyone are cleared on the way
  await prisma.passwordChangeCode.deleteMany({
    where: { OR: [{ requestedById: admin.id }, { expiresAt: { lt: new Date() } }] },
  });
  const row = await prisma.passwordChangeCode.create({
    data: { requestedById: admin.id, schoolId, targetUserId: target.id, codeHash: hashCode(target.id, code), expiresAt },
    select: { id: true },
  });

  const account = target.id === admin.id ? "your own account" : `${target.fullname} (${target.phone ?? target.email ?? ""})`;
  try {
    await Mailer.send({
      to: admin.email,
      subject: `Password change code for ${school?.nameEn ?? "your school"}`,
      text: [
        `Your code to change the password of ${account} is: ${code}`,
        "",
        "It works once and expires in 10 minutes.",
        "If you did not ask for it, ignore this email: no password changes without the code.",
      ].join("\n"),
    });
  } catch (error) {
    // an email that never left must not block asking again
    await prisma.passwordChangeCode.delete({ where: { id: row.id } });
    throw error;
  }

  return { sentTo: maskEmail(admin.email), expiresAt };
};

/*
 * Sets the account's new password once the code is right. The account is logged out
 * everywhere; a super admin changing their own password stays logged in on this device.
 */
const changeWithCode = async (auth: Auth, targetUserId: string, body: { newPassword: string; code: string }, meta: ClientMeta) => {
  const admin = await findSuperAdmin(auth);
  const target = await findTarget(auth.schoolId!, targetUserId);

  const row = await prisma.passwordChangeCode.findFirst({
    where: { requestedById: admin.id, schoolId: auth.schoolId!, targetUserId: target.id },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw new AppError("No code was sent for this account. Ask for a new one", httpStatus.BAD_REQUEST);
  if (row.expiresAt.getTime() < Date.now()) {
    throw new AppError("The code has expired. Ask for a new one", httpStatus.BAD_REQUEST);
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new AppError("Too many wrong codes. Ask for a new one", httpStatus.BAD_REQUEST);
  }

  const given = Buffer.from(hashCode(target.id, body.code), "hex");
  if (!timingSafeEqual(given, Buffer.from(row.codeHash, "hex"))) {
    await prisma.passwordChangeCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    // 400, not 401: a 401 would make the client try to refresh its session
    throw new AppError("The code is not correct", httpStatus.BAD_REQUEST);
  }
  await prisma.passwordChangeCode.delete({ where: { id: row.id } });

  const self = target.id === admin.id;
  const session = await AuthService.setPassword(target.id, body.newPassword, self ? { auth, meta } : undefined);
  return { self, session, user: { id: target.id, fullname: target.fullname } };
};

export const UserPasswordService = { sendCode, changeWithCode };
