import httpStatus from "http-status";
import { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client";
import type { AcademicTrack, InstitutionType } from "../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../errorHandler/AppError";

/*
 * Academic years come in tracks. An institution that has both school and college classes
 * runs two year lines side by side (school January-December, college June-May): every
 * class and every year belongs to one track, and each track has its own current year.
 * An ordinary school has one track (SCHOOL) and everything works as one line of years.
 *
 * "The current year" and "the year of a date" are always asked for a track: the track of
 * the class in question, or of the page's track switch.
 */

type Db = Prisma.TransactionClient | typeof prisma;

export const ACADEMIC_TRACKS = ["SCHOOL", "COLLEGE"] as const satisfies readonly AcademicTrack[];

/** A track in a body or query: "SCHOOL" or "COLLEGE". */
export const trackSchema = z.enum(ACADEMIC_TRACKS, { error: "Track must be SCHOOL or COLLEGE" });

/** The tracks an institution of this type has, the main one first. */
export const tracksOf = (type: InstitutionType): AcademicTrack[] =>
  type === "SCHOOL_AND_COLLEGE" ? ["SCHOOL", "COLLEGE"] : type === "COLLEGE" ? ["COLLEGE"] : ["SCHOOL"];

export const institutionTracks = async (db: Db, schoolId: string) => {
  const school = await db.school.findUnique({ where: { id: schoolId }, select: { institutionType: true } });
  return tracksOf(school?.institutionType ?? "SCHOOL");
};

/**
 * The track a new class or year gets: the one asked for, which must be one the institution
 * has, or the institution's main track when nothing is asked (a single-track institution).
 */
export const trackForNew = async (db: Db, schoolId: string, asked?: AcademicTrack | null) => {
  const tracks = await institutionTracks(db, schoolId);
  if (!asked) return tracks[0]!;
  if (!tracks.includes(asked)) {
    throw new AppError(
      asked === "COLLEGE" ? "This institution has no college classes" : "This institution has no school classes",
      httpStatus.BAD_REQUEST,
      [{ path: "track", message: "Choose a track this institution has" }],
    );
  }
  return asked;
};

const yearSelect = { id: true, name: true, startDate: true, endDate: true, isCurrent: true, track: true } as const;
export type TrackYear = Prisma.AcademicYearGetPayload<{ select: typeof yearSelect }>;

/**
 * The year a request is about: the one it names (of this school), or the current year of
 * the track it names, or of the institution's main track. Null when there is none.
 */
export const findYear = async (
  db: Db,
  schoolId: string,
  { academicYearId, track }: { academicYearId?: string | null; track?: AcademicTrack | null } = {},
): Promise<TrackYear | null> => {
  if (academicYearId) return db.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: yearSelect });
  const t = track ?? (await institutionTracks(db, schoolId))[0]!;
  return db.academicYear.findFirst({ where: { schoolId, track: t, isCurrent: true }, select: yearSelect });
};

/**
 * The year a request works in, or an error: the given year, else the current year of the
 * given track, else of the class's track, else of the main track. With classes, they must
 * belong to the year's track.
 */
export const requireYear = async (
  db: Db,
  schoolId: string,
  {
    academicYearId,
    track,
    classId,
    classIds,
  }: { academicYearId?: string | null; track?: AcademicTrack | null; classId?: string | null; classIds?: readonly string[] } = {},
): Promise<TrackYear> => {
  const classes = [...(classId ? [classId] : []), ...(classIds ?? [])];
  const t = academicYearId ? undefined : (track ?? (classes[0] ? await trackOfClass(db, schoolId, classes[0]) : null));
  const year = await findYear(db, schoolId, { academicYearId, track: t });
  if (!year) {
    throw academicYearId
      ? new AppError("Academic year not found for this school", httpStatus.NOT_FOUND)
      : new AppError("No current academic year is set. Choose an academic year", httpStatus.BAD_REQUEST);
  }
  await assertClassesInTrack(db, schoolId, classes, year);
  return year;
};

/** The current year of every track the institution uses (one or two years). */
export const currentYears = (db: Db, schoolId: string) =>
  db.academicYear.findMany({ where: { schoolId, isCurrent: true }, orderBy: { track: "asc" }, select: yearSelect });

/** The year of this track that covers the day (years of one track never overlap). */
export const yearCovering = (db: Db, schoolId: string, date: Date, track: AcademicTrack) =>
  db.academicYear.findFirst({
    where: { schoolId, track, startDate: { lte: date }, endDate: { gte: date } },
    orderBy: { startDate: "desc" },
    select: yearSelect,
  });

/** The years covering the day, one per track at most (school first). */
export const yearsCovering = (db: Db, schoolId: string, date: Date) =>
  db.academicYear.findMany({
    where: { schoolId, startDate: { lte: date }, endDate: { gte: date } },
    orderBy: [{ track: "asc" }, { startDate: "desc" }],
    select: yearSelect,
  });

/** The track of a class of this school (null: no such class). */
export const trackOfClass = async (db: Db, schoolId: string, classId: string) =>
  (await db.schoolClass.findFirst({ where: { id: classId, schoolId }, select: { track: true } }))?.track ?? null;

/** The track of a section's class (null: no such section). */
export const trackOfSection = async (db: Db, schoolId: string, sectionId: string) =>
  (await db.section.findFirst({ where: { id: sectionId, schoolId }, select: { class: { select: { track: true } } } }))?.class
    .track ?? null;

const trackLabel = (track: AcademicTrack) => (track === "COLLEGE" ? "college" : "school");

/**
 * A class is taught only in the years of its own track: a college class has no place in a
 * school year and the other way round. A 400 naming the first class that doesn't fit.
 */
export const assertClassesInTrack = async (
  db: Db,
  schoolId: string,
  classIds: readonly string[],
  year: { name: string; track: AcademicTrack },
) => {
  if (classIds.length === 0) return;
  const wrong = await db.schoolClass.findFirst({
    where: { schoolId, id: { in: [...new Set(classIds)] }, track: { not: year.track } },
    select: { name: true, track: true },
  });
  if (wrong) {
    throw new AppError(
      `${wrong.name} is a ${trackLabel(wrong.track)} class; ${year.name} is a ${trackLabel(year.track)} year`,
      httpStatus.BAD_REQUEST,
    );
  }
};

/** The same check when only the year's id is at hand. */
export const assertClassesInYearTrack = async (db: Db, schoolId: string, classIds: readonly string[], academicYearId: string) => {
  const year = await db.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: { name: true, track: true } });
  if (!year) throw new AppError("Academic year not found", httpStatus.NOT_FOUND);
  await assertClassesInTrack(db, schoolId, classIds, year);
};
