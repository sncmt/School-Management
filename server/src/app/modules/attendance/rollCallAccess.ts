import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { checkPermission } from "../../middlewares/authorize";
import { todayInBangladesh } from "../../shared/scheduleSchemas";

/*
 * Who takes a section's student roll call: anyone with attendance:mark (any section), and the
 * section's class teacher, for that section only, with no permission needed: in most schools
 * the class teacher takes the daily roll. The class teacher is the one of the academic year
 * covering the day. Either way the school needs the attendance module.
 */

type Auth = NonNullable<Request["auth"]>;

const MARK = "attendance:mark";

/* The attendance module is on for the school (it holds attendance:mark). */
const moduleEnabled = async (schoolId: string) =>
  (await prisma.schoolModule.findFirst({
    where: { schoolId, isEnabled: true, module: { isActive: true, permissions: { some: { code: MARK, isActive: true } } } },
    select: { id: true },
  })) !== null;

/* The sections this member is class teacher of, in the years covering the day. */
const classTeacherSections = (auth: Auth, day: Date) =>
  auth.membershipId
    ? prisma.sectionYearConfig.findMany({
        where: {
          classTeacherMembershipId: auth.membershipId,
          academicYear: { schoolId: auth.schoolId!, startDate: { lte: day }, endDate: { gte: day } },
        },
        select: {
          section: { select: { id: true, name: true, isDefault: true, class: { select: { id: true, name: true, numericLevel: true } } } },
        },
      })
    : Promise.resolve([]);

/*
 * Guard for GET and PUT /students/sheet, after validateRequest (sectionId and date already
 * parsed, from the query or the body; no date = today).
 */
export const mayTakeRollCall = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const auth = req.auth!;
    const allowed = await checkPermission(auth, MARK);
    if (allowed === "OK") return next();
    if (allowed === "MODULE_DISABLED") throw new AppError("This feature is not enabled for your school", httpStatus.FORBIDDEN);

    const source = (req.method === "GET" ? req.query : req.body) as { sectionId?: string; date?: Date };
    const day = source.date ?? todayInBangladesh();
    const sections = source.sectionId ? await classTeacherSections(auth, day) : [];
    if (sections.some((s) => s.section.id === source.sectionId)) return next();

    throw new AppError("Only the section's class teacher, or someone allowed to mark attendance, can take this roll call", httpStatus.FORBIDDEN);
  } catch (error) {
    next(error);
  }
};

/*
 * For the app's teacher screens: whether this member may take any section's roll call, and the
 * sections they are class teacher of today (empty when the school has no attendance module).
 */
export const myRollCallSections = async (auth: Auth) => {
  const day = todayInBangladesh();
  const [allowed, enabled] = await Promise.all([checkPermission(auth, MARK), moduleEnabled(auth.schoolId!)]);
  if (!enabled) return { canMarkAny: false, sections: [] };
  const rows = await classTeacherSections(auth, day);
  return {
    canMarkAny: allowed === "OK",
    sections: rows
      .map((r) => r.section)
      .sort((a, b) => (a.class.numericLevel ?? 0) - (b.class.numericLevel ?? 0) || a.name.localeCompare(b.name)),
  };
};
