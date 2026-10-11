import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { displayName } from "../../shared/names";
import { dayKey, todayInBangladesh } from "../../shared/scheduleSchemas";
import { dayStatus, loadCalendar, weeklyHolidaysOn } from "../calendar/calendar.resolver";
import { resolveSectionHours } from "../schedule/schedule.service";
import { WORKING_STATUSES } from "../teacher/teacher.service";
import { audienceOf, audiencesDisjoint, timesOverlap, WEEKDAYS } from "./routine.rules";
import type {
  DayQuery,
  EntryPayload,
  FreeTeachersQuery,
  MyDayQuery,
  SectionWeekQuery,
  SubstitutionPayload,
  SubstitutionsQuery,
  TeacherWeekQuery,
  YearQuery,
} from "./routine.validation";

type Auth = NonNullable<Express.Request["auth"]>;
type Period = { number: number; nameEn: string | null; nameBn: string | null; startTime: string; endTime: string; isBreak: boolean };
type Template = { id: string; nameEn: string | null; nameBn: string | null; periods: Map<number, Period> };

const teacherBrief = {
  id: true,
  nameEn: true,
  nameBn: true,
  designation: true,
  membership: { select: { user: { select: { id: true, fullname: true, phone: true } } } },
} satisfies Prisma.TeacherProfileSelect;

const entryInclude = {
  class: { select: { id: true, name: true, numericLevel: true } },
  sections: { select: { section: { select: { id: true, name: true, isDefault: true } } } },
  classSubject: {
    select: {
      id: true,
      type: true,
      groupId: true,
      group: { select: { id: true, nameEn: true, nameBn: true } },
      subject: { select: { id: true, nameEn: true, nameBn: true, code: true, religion: true } },
    },
  },
  teacher: { select: teacherBrief },
} satisfies Prisma.RoutineEntryInclude;

type Entry = Prisma.RoutineEntryGetPayload<{ include: typeof entryInclude }>;

// for the API's (English) messages
const teacherName = (t: { nameEn: string } | null) => t?.nameEn ?? null;

// ------------------------------------------------------------------- helpers

const resolveYear = async (schoolId: string, academicYearId?: string) => {
  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!year) {
    throw academicYearId
      ? new AppError("Academic year not found for this school", httpStatus.NOT_FOUND)
      : new AppError("No current academic year is set. Choose an academic year", httpStatus.BAD_REQUEST);
  }
  return year;
};

const yearCovering = async (schoolId: string, date: Date) => {
  const year = await prisma.academicYear.findFirst({
    where: { schoolId, startDate: { lte: date }, endDate: { gte: date } },
    orderBy: { startDate: "desc" },
  });
  if (!year) throw new AppError("No academic year covers this date", httpStatus.BAD_REQUEST);
  return year;
};

const toTemplate = (t: { id: string; nameEn: string | null; nameBn: string | null; periods: Period[] }): Template => ({
  id: t.id,
  nameEn: t.nameEn,
  nameBn: t.nameBn,
  periods: new Map(t.periods.map((p) => [p.number, p])),
});

const periodSelect = { number: true, nameEn: true, nameBn: true, startTime: true, endTime: true, isBreak: true } satisfies Prisma.TemplatePeriodSelect;

/* Each section's own (regular) period template in a year. */
const regularTemplates = async (academicYearId: string, sectionIds: string[]) => {
  const configs = await prisma.sectionYearConfig.findMany({
    where: { academicYearId, sectionId: { in: sectionIds } },
    select: {
      sectionId: true,
      periodTemplate: { select: { id: true, nameEn: true, nameBn: true, periods: { select: periodSelect } } },
    },
  });
  return new Map(configs.map((c) => [c.sectionId, c.periodTemplate ? toTemplate(c.periodTemplate) : null]));
};

const templatesById = async (ids: string[]) => {
  const templates = await prisma.periodTemplate.findMany({
    where: { id: { in: ids } },
    select: { id: true, nameEn: true, nameBn: true, periods: { select: periodSelect } },
  });
  return new Map(templates.map((t) => [t.id, toTemplate(t)]));
};

/* The weekly days off in force today. */
const weeklyHolidaysToday = async (schoolId: string) => {
  const today = todayInBangladesh();
  const calendar = await loadCalendar(prisma, schoolId, today, today);
  return weeklyHolidaysOn(calendar, today);
};

const entryView = (e: Entry, time: { startTime: string; endTime: string } | null) => ({
  id: e.id,
  weekday: e.weekday,
  weekdayName: WEEKDAYS[e.weekday],
  periodNumber: e.periodNumber,
  startTime: time?.startTime ?? null,
  endTime: time?.endTime ?? null,
  class: e.class,
  sections: e.sections.map((s) => s.section),
  combined: e.sections.length > 1,
  subject: e.classSubject.subject,
  group: e.classSubject.group,
  isOptional: e.classSubject.type === "OPTIONAL",
  teacher: e.teacher,
});

// ------------------------------------------------------------------- entries

/*
 * Adds or replaces one class of the weekly routine. Checks:
 *  - the sections are of the class, and each has a period template with that period
 *    (not a break); sections taught together must have that period at the same time
 *  - the day is not a weekly holiday
 *  - the sections' other classes in that period are for different students
 *  - the teacher is not teaching anywhere else at an overlapping time
 */
const saveEntry = async (schoolId: string, data: EntryPayload, entryId?: string) => {
  if (entryId) {
    const existing = await prisma.routineEntry.findFirst({ where: { id: entryId, schoolId }, select: { id: true } });
    if (!existing) throw new AppError("Routine entry not found", httpStatus.NOT_FOUND);
  }
  const year = await resolveYear(schoolId, data.academicYearId);
  const weekdayName = WEEKDAYS[data.weekday];

  const [sections, classSubject, teacher, weeklyOff] = await Promise.all([
    prisma.section.findMany({ where: { id: { in: data.sectionIds }, schoolId, classId: data.classId }, select: { id: true, name: true } }),
    prisma.classSubject.findFirst({
      where: { id: data.classSubjectId, schoolId, classId: data.classId, academicYearId: year.id },
      select: { id: true, type: true, groupId: true, subject: { select: { nameEn: true, nameBn: true, religion: true } } },
    }),
    data.teacherId
      ? prisma.teacherProfile.findFirst({ where: { id: data.teacherId, schoolId, status: { in: WORKING_STATUSES } }, select: teacherBrief })
      : null,
    weeklyHolidaysToday(schoolId),
  ]);
  if (sections.length !== data.sectionIds.length) {
    throw new AppError("One or more sections are not in this class", httpStatus.BAD_REQUEST);
  }
  if (!classSubject) throw new AppError("This subject is not taught in this class this year", httpStatus.BAD_REQUEST);
  if (data.teacherId && !teacher) {
    throw new AppError("The teacher was not found, or has left the school", httpStatus.BAD_REQUEST);
  }
  if (weeklyOff.includes(data.weekday)) throw new AppError(`${weekdayName} is a weekly holiday`, httpStatus.BAD_REQUEST);

  // the period in each section's template: it must exist, be a class period, and (taught
  // together) be at the same time in every section
  const templates = await regularTemplates(year.id, data.sectionIds);
  let time: { startTime: string; endTime: string } | null = null;
  for (const section of sections) {
    const template = templates.get(section.id);
    if (!template) {
      throw new AppError(
        `Section ${section.name} has no period template this year. Set it in the section's year settings`,
        httpStatus.BAD_REQUEST,
      );
    }
    const period = template.periods.get(data.periodNumber);
    if (!period) throw new AppError(`Section ${section.name}'s periods have no period ${data.periodNumber}`, httpStatus.BAD_REQUEST);
    if (period.isBreak) throw new AppError(`Period ${data.periodNumber} (${displayName(period)}) is a break`, httpStatus.BAD_REQUEST);
    if (time && (time.startTime !== period.startTime || time.endTime !== period.endTime)) {
      throw new AppError("Sections taught together must have this period at the same time", httpStatus.BAD_REQUEST);
    }
    time = { startTime: period.startTime, endTime: period.endTime };
  }

  // the same students cannot have two classes in one period
  const audience = audienceOf(classSubject);
  const slotMates = await prisma.routineEntry.findMany({
    where: {
      academicYearId: year.id,
      weekday: data.weekday,
      periodNumber: data.periodNumber,
      sections: { some: { sectionId: { in: data.sectionIds } } },
      ...(entryId ? { id: { not: entryId } } : {}),
    },
    include: entryInclude,
  });
  for (const other of slotMates) {
    if (!audiencesDisjoint(audience, audienceOf(other.classSubject))) {
      const shared = other.sections.find((s) => data.sectionIds.includes(s.section.id))!.section;
      throw new AppError(
        `Section ${shared.name} already has ${displayName(other.classSubject.subject)} in period ${data.periodNumber} on ${weekdayName}`,
        httpStatus.CONFLICT,
      );
    }
  }

  // the teacher cannot be in two places at once
  if (data.teacherId) {
    const teacherEntries = await prisma.routineEntry.findMany({
      where: { academicYearId: year.id, weekday: data.weekday, teacherId: data.teacherId, ...(entryId ? { id: { not: entryId } } : {}) },
      include: entryInclude,
    });
    const theirTemplates = await regularTemplates(year.id, [...new Set(teacherEntries.map((e) => e.sections[0].section.id))]);
    for (const other of teacherEntries) {
      const period = theirTemplates.get(other.sections[0].section.id)?.periods.get(other.periodNumber);
      if (period && timesOverlap(period, time!)) {
        throw new AppError(
          `${teacherName(teacher)} already teaches ${displayName(other.classSubject.subject)} to ${other.class.name} ` +
            `${other.sections.map((s) => s.section.name).join(" + ")} at ${period.startTime}-${period.endTime} on ${weekdayName}`,
          httpStatus.CONFLICT,
        );
      }
    }
  }

  const values = {
    academicYearId: year.id,
    classId: data.classId,
    weekday: data.weekday,
    periodNumber: data.periodNumber,
    classSubjectId: data.classSubjectId,
    teacherId: data.teacherId ?? null,
  };
  const entry = await prisma.$transaction(async (tx) => {
    if (entryId) {
      await tx.routineEntrySection.deleteMany({ where: { entryId } });
      return tx.routineEntry.update({
        where: { id: entryId },
        data: { ...values, sections: { create: data.sectionIds.map((sectionId) => ({ sectionId })) } },
        include: entryInclude,
      });
    }
    return tx.routineEntry.create({
      data: { schoolId, ...values, sections: { create: data.sectionIds.map((sectionId) => ({ sectionId })) } },
      include: entryInclude,
    });
  });
  return entryView(entry, time);
};

const deleteEntry = async (schoolId: string, entryId: string) => {
  const entry = await prisma.routineEntry.findFirst({ where: { id: entryId, schoolId }, select: { id: true } });
  if (!entry) throw new AppError("Routine entry not found", httpStatus.NOT_FOUND);
  // its substitutions go with it
  await prisma.routineEntry.delete({ where: { id: entryId } });
};

// --------------------------------------------------------------- weekly views

/* A section's weekly routine: its periods, the school days of the week, and every class. */
const getSectionWeek = async (schoolId: string, query: SectionWeekQuery) => {
  const section = await prisma.section.findFirst({
    where: { id: query.sectionId, schoolId },
    select: { id: true, name: true, isDefault: true, class: { select: { id: true, name: true } } },
  });
  if (!section) throw new AppError("Section not found", httpStatus.NOT_FOUND);
  const year = await resolveYear(schoolId, query.academicYearId);

  const [templates, entries, weeklyOff] = await Promise.all([
    regularTemplates(year.id, [section.id]),
    prisma.routineEntry.findMany({
      where: { academicYearId: year.id, sections: { some: { sectionId: section.id } } },
      include: entryInclude,
    }),
    weeklyHolidaysToday(schoolId),
  ]);
  const template = templates.get(section.id) ?? null;

  return {
    academicYear: { id: year.id, name: year.name },
    section,
    template: template ? { id: template.id, nameEn: template.nameEn, nameBn: template.nameBn } : null,
    periods: template ? [...template.periods.values()].sort((a, b) => a.number - b.number) : [],
    days: WEEKDAYS.map((name, weekday) => ({ weekday, name, isWeeklyHoliday: weeklyOff.includes(weekday) })),
    entries: entries
      .map((e) => {
        const p = template?.periods.get(e.periodNumber);
        return entryView(e, p ? { startTime: p.startTime, endTime: p.endTime } : null);
      })
      .sort((a, b) => a.weekday - b.weekday || a.periodNumber - b.periodNumber),
  };
};

const teacherWeek = async (teacherId: string, academicYearId: string) => {
  const entries = await prisma.routineEntry.findMany({ where: { academicYearId, teacherId }, include: entryInclude });
  const templates = await regularTemplates(academicYearId, [...new Set(entries.map((e) => e.sections[0].section.id))]);

  const items = entries
    .map((e) => {
      const p = templates.get(e.sections[0].section.id)?.periods.get(e.periodNumber);
      return entryView(e, p ? { startTime: p.startTime, endTime: p.endTime } : null);
    })
    .sort((a, b) => a.weekday - b.weekday || (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  const perDay = WEEKDAYS.map((name, weekday) => ({ weekday, name, periods: items.filter((i) => i.weekday === weekday).length }));
  return { periodsPerWeek: items.length, perDay, entries: items };
};

/* A teacher's weekly routine across all their sections, with their weekly load. */
const getTeacherWeek = async (schoolId: string, query: TeacherWeekQuery) => {
  const teacher = await prisma.teacherProfile.findFirst({ where: { id: query.teacherId, schoolId }, select: teacherBrief });
  if (!teacher) throw new AppError("Teacher not found", httpStatus.NOT_FOUND);
  const year = await resolveYear(schoolId, query.academicYearId);
  return { academicYear: { id: year.id, name: year.name }, teacher, ...(await teacherWeek(teacher.id, year.id)) };
};

/* Every working teacher's number of periods per week (and per day). */
const getWorkload = async (schoolId: string, query: YearQuery) => {
  const year = await resolveYear(schoolId, query.academicYearId);
  const [teachers, counts] = await Promise.all([
    prisma.teacherProfile.findMany({ where: { schoolId, status: { in: WORKING_STATUSES } }, select: { ...teacherBrief, status: true } }),
    prisma.routineEntry.groupBy({
      by: ["teacherId", "weekday"],
      where: { academicYearId: year.id, teacherId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const items = teachers.map((t) => {
    const own = counts.filter((c) => c.teacherId === t.id);
    return {
      teacher: t,
      periodsPerWeek: own.reduce((s, c) => s + c._count._all, 0),
      perDay: WEEKDAYS.map((name, weekday) => ({ weekday, name, periods: own.find((c) => c.weekday === weekday)?._count._all ?? 0 })),
    };
  });
  return {
    academicYear: { id: year.id, name: year.name },
    // routine classes still without a teacher
    unassigned: await prisma.routineEntry.count({ where: { academicYearId: year.id, schoolId, teacherId: null } }),
    items: items.sort((a, b) => b.periodsPerWeek - a.periodsPerWeek),
  };
};

// ------------------------------------------------------------------ one date

/*
 * Everything about the routine on one date: the weekday's classes, the period template
 * each section uses that day (a schedule change can swap it), the calendar and the
 * substitutions.
 */
const loadDay = async (schoolId: string, date: Date) => {
  const year = await yearCovering(schoolId, date);
  const weekday = date.getUTCDay();

  const entries = await prisma.routineEntry.findMany({ where: { academicYearId: year.id, weekday }, include: entryInclude });
  const sections = [
    ...new Map(entries.flatMap((e) => e.sections.map((s) => [s.section.id, { id: s.section.id, classId: e.classId }] as const))).values(),
  ];

  const [hours, calendar, substitutions] = await Promise.all([
    resolveSectionHours(prisma, schoolId, year.id, date, sections),
    loadCalendar(prisma, schoolId, date, date),
    prisma.routineSubstitution.findMany({
      where: { schoolId, date, entryId: { in: entries.map((e) => e.id) } },
      include: { teacher: { select: teacherBrief } },
    }),
  ]);
  const templates = await templatesById([...new Set([...hours.values()].flatMap((h) => (h.periodTemplateId ? [h.periodTemplateId] : [])))]);
  const substitutionOf = new Map(substitutions.map((s) => [s.entryId, s]));

  const templateOf = (sectionId: string) => {
    const id = hours.get(sectionId)?.periodTemplateId;
    return id ? (templates.get(id) ?? null) : null;
  };
  /* The entry's time that day; null = its period does not exist (or is a break) on that day's template. */
  const timeOf = (e: Entry) => {
    const p = templateOf(e.sections[0].section.id)?.periods.get(e.periodNumber);
    return p && !p.isBreak ? { startTime: p.startTime, endTime: p.endTime } : null;
  };
  const isHeld = (e: Entry) => dayStatus(calendar, date, { classId: e.classId }).isSchoolDay && timeOf(e) !== null;
  /* Who actually teaches the entry that day: the substitute, else the routine's teacher. */
  const teacherOn = (e: Entry) => substitutionOf.get(e.id)?.teacherId ?? e.teacherId;

  return { year, weekday, entries, calendar, templateOf, timeOf, isHeld, teacherOn, substitutionOf };
};

const dayEntryView = (day: Awaited<ReturnType<typeof loadDay>>, e: Entry) => {
  const substitution = day.substitutionOf.get(e.id);
  return {
    ...entryView(e, day.timeOf(e)),
    held: day.isHeld(e),
    substitution: substitution
      ? { id: substitution.id, teacher: substitution.teacher, note: substitution.note }
      : null,
  };
};

/* A section's or a teacher's routine on one date (default today). */
const getDay = async (schoolId: string, query: DayQuery) => {
  const date = query.date ?? todayInBangladesh();
  const day = await loadDay(schoolId, date);
  const base = { date: dayKey(date), weekday: WEEKDAYS[day.weekday] };

  if (query.sectionId) {
    const section = await prisma.section.findFirst({
      where: { id: query.sectionId, schoolId },
      select: { id: true, name: true, isDefault: true, classId: true, class: { select: { id: true, name: true } } },
    });
    if (!section) throw new AppError("Section not found", httpStatus.NOT_FOUND);

    const status = dayStatus(day.calendar, date, { classId: section.classId });
    const template = day.templateOf(section.id) ?? (await regularTemplates(day.year.id, [section.id])).get(section.id) ?? null;
    return {
      ...base,
      section,
      day: status,
      template: template ? { id: template.id, nameEn: template.nameEn, nameBn: template.nameBn } : null,
      periods: status.isSchoolDay && template ? [...template.periods.values()].sort((a, b) => a.number - b.number) : [],
      entries: status.isSchoolDay
        ? day.entries
            .filter((e) => e.sections.some((s) => s.section.id === section.id))
            .map((e) => dayEntryView(day, e))
            .sort((a, b) => a.periodNumber - b.periodNumber)
        : [],
    };
  }

  const teacher = await prisma.teacherProfile.findFirst({ where: { id: query.teacherId!, schoolId }, select: teacherBrief });
  if (!teacher) throw new AppError("Teacher not found", httpStatus.NOT_FOUND);
  return { ...base, teacher, ...teacherDay(day, teacher.id, date) };
};

/*
 * A teacher's day: their own classes (held or not, or covered by a substitute) and the
 * classes they cover for others.
 */
const teacherDay = (day: Awaited<ReturnType<typeof loadDay>>, teacherId: string, date: Date) => {
  const status = dayStatus(day.calendar, date, "TEACHERS");
  const own = day.entries.filter((e) => e.teacherId === teacherId).map((e) => ({ role: "OWN" as const, ...dayEntryView(day, e) }));
  const covering = day.entries
    .filter((e) => day.substitutionOf.get(e.id)?.teacherId === teacherId)
    .map((e) => ({ role: "SUBSTITUTE" as const, ...dayEntryView(day, e) }));

  const classes = [...own, ...covering].sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  return {
    day: status,
    // classes the teacher actually takes that day
    periodsToday: classes.filter((c) => c.held && (c.role === "SUBSTITUTE" || c.substitution === null)).length,
    classes,
  };
};

// --------------------------------------------------------------- substitutes

/* Teachers who cannot take a class on a date: marked absent or on leave in teacher attendance. */
const awayTeachers = async (schoolId: string, date: Date) => {
  const records = await prisma.teacherAttendance.findMany({
    where: { schoolId, date, status: { in: ["ABSENT", "LEAVE"] } },
    select: { teacherId: true },
  });
  return new Set(records.map((r) => r.teacherId));
};

/* Teachers teaching (their own class or a substitution) at a time on that date. */
const busyAt = (day: Awaited<ReturnType<typeof loadDay>>, time: { startTime: string; endTime: string }, exceptEntryId?: string) => {
  const busy = new Set<string>();
  for (const e of day.entries) {
    if (e.id === exceptEntryId || !day.isHeld(e)) continue;
    const who = day.teacherOn(e);
    if (who && timesOverlap(day.timeOf(e)!, time)) busy.add(who);
  }
  return busy;
};

/* The teachers free at a section's period on a date: working, present, and not teaching then. */
const getFreeTeachers = async (schoolId: string, query: FreeTeachersQuery) => {
  const section = await prisma.section.findFirst({ where: { id: query.sectionId, schoolId }, select: { id: true, classId: true } });
  if (!section) throw new AppError("Section not found", httpStatus.NOT_FOUND);

  const day = await loadDay(schoolId, query.date);
  if (!dayStatus(day.calendar, query.date, { classId: section.classId }).isSchoolDay) {
    throw new AppError("This is not a school day for the section", httpStatus.BAD_REQUEST);
  }
  const template = day.templateOf(section.id) ?? (await regularTemplates(day.year.id, [section.id])).get(section.id) ?? null;
  const period = template?.periods.get(query.periodNumber);
  if (!period || period.isBreak) throw new AppError("The section has no such class period that day", httpStatus.BAD_REQUEST);

  const [teachers, away] = await Promise.all([
    prisma.teacherProfile.findMany({ where: { schoolId, status: "ACTIVE" }, select: teacherBrief }),
    awayTeachers(schoolId, query.date),
  ]);
  const busy = busyAt(day, period);

  return {
    date: dayKey(query.date),
    period: { number: period.number, nameEn: period.nameEn, startTime: period.startTime, endTime: period.endTime },
    free: teachers
      .filter((t) => !busy.has(t.id) && !away.has(t.id))
      .map((t) => ({ teacher: t, periodsToday: teacherDay(day, t.id, query.date).periodsToday }))
      // the least busy first, to share the load
      .sort((a, b) => a.periodsToday - b.periodsToday),
  };
};

/*
 * Another teacher takes a routine class on one date. The date must be that class's weekday
 * and a school day; the substitute must be working, present, and free at that time.
 * Saving again for the same class and date replaces the substitute.
 */
const createSubstitution = async (auth: Auth, data: SubstitutionPayload) => {
  const schoolId = auth.schoolId!;
  const entry = await prisma.routineEntry.findFirst({ where: { id: data.entryId, schoolId }, include: entryInclude });
  if (!entry) throw new AppError("Routine entry not found", httpStatus.NOT_FOUND);
  if (data.date.getUTCDay() !== entry.weekday) {
    throw new AppError(`This class is on ${WEEKDAYS[entry.weekday]}s, not on ${dayKey(data.date)}`, httpStatus.BAD_REQUEST);
  }
  if (data.teacherId === entry.teacherId) throw new AppError("That is the class's own teacher", httpStatus.BAD_REQUEST);

  const day = await loadDay(schoolId, data.date);
  if (day.year.id !== entry.academicYearId) throw new AppError("The date is outside this routine's academic year", httpStatus.BAD_REQUEST);
  const time = day.timeOf(entry);
  if (!day.isHeld(entry) || !time) throw new AppError("This class does not take place on that date", httpStatus.BAD_REQUEST);

  const substitute = await prisma.teacherProfile.findFirst({
    where: { id: data.teacherId, schoolId, status: "ACTIVE" },
    select: teacherBrief,
  });
  if (!substitute) throw new AppError("The substitute was not found, or is not working now", httpStatus.BAD_REQUEST);
  if ((await awayTeachers(schoolId, data.date)).has(data.teacherId)) {
    throw new AppError(`${teacherName(substitute)} is marked absent or on leave that day`, httpStatus.CONFLICT);
  }
  if (busyAt(day, time, entry.id).has(data.teacherId)) {
    throw new AppError(`${teacherName(substitute)} is teaching at ${time.startTime}-${time.endTime} that day`, httpStatus.CONFLICT);
  }

  const substitution = await prisma.routineSubstitution.upsert({
    where: { entryId_date: { entryId: entry.id, date: data.date } },
    create: { schoolId, entryId: entry.id, date: data.date, teacherId: data.teacherId, note: data.note ?? null, createdBy: auth.userId },
    update: { teacherId: data.teacherId, note: data.note ?? null, createdBy: auth.userId },
    include: { teacher: { select: teacherBrief } },
  });
  return { ...substitution, date: dayKey(substitution.date), class: entryView(entry, time) };
};

const deleteSubstitution = async (schoolId: string, substitutionId: string) => {
  const substitution = await prisma.routineSubstitution.findFirst({ where: { id: substitutionId, schoolId }, select: { id: true } });
  if (!substitution) throw new AppError("Substitution not found", httpStatus.NOT_FOUND);
  await prisma.routineSubstitution.delete({ where: { id: substitutionId } });
};

/* Every substitution of a date, with the class, its time and both teachers. */
const getSubstitutions = async (schoolId: string, query: SubstitutionsQuery) => {
  const day = await loadDay(schoolId, query.date);
  return {
    date: dayKey(query.date),
    items: day.entries
      .filter((e) => day.substitutionOf.has(e.id))
      .map((e) => dayEntryView(day, e))
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
  };
};

// ------------------------------------------------------------ teacher's own

const findMyTeacherId = async (auth: Auth) => {
  const teacher = auth.membershipId
    ? await prisma.teacherProfile.findUnique({ where: { membershipId: auth.membershipId }, select: { id: true, status: true } })
    : null;
  if (!teacher || !WORKING_STATUSES.includes(teacher.status)) {
    throw new AppError("You are not a teacher at this school", httpStatus.FORBIDDEN);
  }
  return teacher.id;
};

/* The logged-in teacher's weekly routine. */
const getMyWeek = async (auth: Auth) => {
  const teacherId = await findMyTeacherId(auth);
  const year = await resolveYear(auth.schoolId!);
  return { academicYear: { id: year.id, name: year.name }, ...(await teacherWeek(teacherId, year.id)) };
};

/* The logged-in teacher's classes on a date (default today), substitutions included. */
const getMyDay = async (auth: Auth, query: MyDayQuery) => {
  const teacherId = await findMyTeacherId(auth);
  const date = query.date ?? todayInBangladesh();
  const day = await loadDay(auth.schoolId!, date);
  return { date: dayKey(date), weekday: WEEKDAYS[day.weekday], ...teacherDay(day, teacherId, date) };
};

export const RoutineService = {
  createEntry: (schoolId: string, data: EntryPayload) => saveEntry(schoolId, data),
  updateEntry: (schoolId: string, entryId: string, data: EntryPayload) => saveEntry(schoolId, data, entryId),
  deleteEntry,
  getSectionWeek,
  getTeacherWeek,
  getWorkload,
  getDay,
  getFreeTeachers,
  createSubstitution,
  deleteSubstitution,
  getSubstitutions,
  getMyWeek,
  getMyDay,
};
