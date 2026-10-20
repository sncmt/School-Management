import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { checkPermission } from "../../middlewares/authorize";
import { GUARDIAN_ROLE } from "../../shared/schoolAccounts";
import { deleteFile, fileKey, fileUrl, putFile } from "../../shared/storage";
import { prepareAttachment } from "../../shared/attachmentUpload";
import type { CreateNoticePayload, NoticeBoardQuery, NoticeListQuery, UpdateNoticePayload } from "./notice.validation";

/*
 * School notices. A notice is on the board once PUBLISHED and its publishAt has come,
 * until its expiresAt. Publishing always sets publishAt (to now when no date is given),
 * so the board is ordered by it. Staff read notices to EVERYONE and STAFF; a family login
 * (GUARDIAN) reads EVERYONE and FAMILIES notices for its children's classes / sections.
 * Someone with both kinds of role reads both.
 */

type Auth = NonNullable<Express.Request["auth"]>;

const MAX_ATTACHMENTS = 5;

const may = async (auth: Auth, code: string) => (await checkPermission(auth, code)) === "OK";

const liveWhere = (now: Date): Prisma.NoticeWhereInput => ({
  status: "PUBLISHED",
  publishAt: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

type NoticeState = "DRAFT" | "SCHEDULED" | "LIVE" | "EXPIRED";

const stateOf = (n: { status: string; publishAt: Date | null; expiresAt: Date | null }, now: Date): NoticeState => {
  if (n.status !== "PUBLISHED") return "DRAFT";
  if (n.publishAt && n.publishAt > now) return "SCHEDULED";
  if (n.expiresAt && n.expiresAt <= now) return "EXPIRED";
  return "LIVE";
};

const attachmentSelect = { id: true, key: true, name: true, contentType: true, size: true } as const;

const withUrls = async (attachments: { id: string; key: string; name: string; contentType: string; size: number }[]) =>
  Promise.all(attachments.map(async ({ key, ...a }) => ({ ...a, url: await fileUrl(key) })));

// ------------------------------------------------------------ who reads what

/*
 * What this person may read: staff (any role but GUARDIAN, or the platform owner) and
 * family (GUARDIAN, with the class / section of each child on roll now or next year).
 */
const readerOf = async (auth: Auth) => {
  const schoolId = auth.schoolId!;
  if (auth.isPlatformAdmin || !auth.membershipId) return { staff: true, family: false, places: [] };

  const roles = await prisma.userRole.findMany({
    where: { userId: auth.userId, membershipId: auth.membershipId, role: { scope: "SCHOOL", schoolId } },
    select: { role: { select: { name: true, isSystem: true } } },
  });
  const family = roles.some((r) => r.role.isSystem && r.role.name === GUARDIAN_ROLE.name);
  const staff = roles.some((r) => !(r.role.isSystem && r.role.name === GUARDIAN_ROLE.name));
  if (!family) return { staff, family, places: [] };

  const current = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { startDate: true } });
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: "ACTIVE",
      student: { schoolId, userId: auth.userId, status: "ACTIVE" },
      // this year's class, and next year's for a child admitted early
      academicYear: current ? { startDate: { gte: current.startDate } } : { isCurrent: true },
    },
    select: { classId: true, sectionId: true },
  });
  return { staff, family, places: enrollments };
};

const audienceWhere = (reader: Awaited<ReturnType<typeof readerOf>>): Prisma.NoticeWhereInput => {
  const or: Prisma.NoticeWhereInput[] = [{ audience: "EVERYONE" }];
  if (reader.staff) or.push({ audience: "STAFF" });
  if (reader.family) {
    or.push({
      audience: "FAMILIES",
      OR: [
        // no classes chosen: every family
        { targets: { none: {} } },
        ...(reader.places.length > 0
          ? [
              {
                targets: {
                  some: {
                    OR: reader.places.map((p) => ({ classId: p.classId, OR: [{ sectionId: null }, { sectionId: p.sectionId }] })),
                  },
                },
              },
            ]
          : []),
      ],
    });
  }
  return { OR: or };
};

// ------------------------------------------------------------------- board

/* The notices this person may read now: pinned first, newest first, with read marks. */
const getBoard = async (auth: Auth, query: NoticeBoardQuery) => {
  const schoolId = auth.schoolId!;
  const now = new Date();
  const reader = await readerOf(auth);
  const where: Prisma.NoticeWhereInput = { schoolId, AND: [liveWhere(now), audienceWhere(reader)] };
  const filtered = query.category ? { ...where, category: query.category } : where;

  const [rows, total, unread] = await Promise.all([
    prisma.notice.findMany({
      where: filtered,
      orderBy: [{ pinned: "desc" }, { publishAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        audience: true,
        pinned: true,
        isPublic: true,
        publishAt: true,
        expiresAt: true,
        attachments: { orderBy: { sortOrder: "asc" }, select: attachmentSelect },
        reads: { where: { userId: auth.userId }, select: { id: true } },
      },
    }),
    prisma.notice.count({ where: filtered }),
    prisma.notice.count({ where: { ...where, reads: { none: { userId: auth.userId } } } }),
  ]);

  const items = await Promise.all(
    rows.map(async ({ reads, attachments, ...n }) => ({ ...n, read: reads.length > 0, attachments: await withUrls(attachments) })),
  );
  return { items, unread, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
};

/* Marks a notice read (only one the person may read now). */
const markRead = async (auth: Auth, noticeId: string) => {
  const schoolId = auth.schoolId!;
  const reader = await readerOf(auth);
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, schoolId, AND: [liveWhere(new Date()), audienceWhere(reader)] },
    select: { id: true },
  });
  if (!notice) throw new AppError("Notice not found!", httpStatus.NOT_FOUND);
  // the platform owner is not a school user: nothing to record
  if (auth.isPlatformAdmin) return { read: true };

  await prisma.noticeRead.upsert({
    where: { noticeId_userId: { noticeId, userId: auth.userId } },
    create: { noticeId, userId: auth.userId },
    update: {},
  });
  return { read: true };
};

// ------------------------------------------------------------------ manage

const names = async (ids: (string | null)[]) => {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, fullname: true } });
  return new Map(users.map((u) => [u.id, u.fullname]));
};

const stateWhere = (state: NoticeListQuery["state"], now: Date): Prisma.NoticeWhereInput => {
  switch (state) {
    case "DRAFT":
      return { status: "DRAFT" };
    case "SCHEDULED":
      return { status: "PUBLISHED", publishAt: { gt: now } };
    case "EXPIRED":
      return { status: "PUBLISHED", expiresAt: { lte: now } };
    case "LIVE":
      return liveWhere(now);
    default:
      return {};
  }
};

/* Every notice of the school, drafts and old ones too (notice:view). */
const listNotices = async (auth: Auth, query: NoticeListQuery) => {
  const schoolId = auth.schoolId!;
  const now = new Date();
  const where: Prisma.NoticeWhereInput = {
    schoolId,
    ...stateWhere(query.state, now),
    ...(query.category ? { category: query.category } : {}),
    ...(query.audience ? { audience: query.audience } : {}),
    ...(query.search ? { title: { contains: query.search, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        title: true,
        category: true,
        audience: true,
        isPublic: true,
        pinned: true,
        status: true,
        publishAt: true,
        expiresAt: true,
        createdBy: true,
        createdAt: true,
        targets: { select: { class: { select: { id: true, name: true } }, section: { select: { id: true, name: true, isDefault: true } } } },
        _count: { select: { attachments: true, reads: true } },
      },
    }),
    prisma.notice.count({ where }),
  ]);

  const authors = await names(rows.map((r) => r.createdBy));
  const items = rows.map(({ _count, createdBy, ...n }) => ({
    ...n,
    state: stateOf(n, now),
    authorId: createdBy,
    author: createdBy ? (authors.get(createdBy) ?? null) : null,
    attachmentCount: _count.attachments,
    readCount: _count.reads,
  }));
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
};

const findNotice = async (schoolId: string, noticeId: string) => {
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, schoolId },
    select: { id: true, status: true, publishAt: true, expiresAt: true, audience: true, createdBy: true },
  });
  if (!notice) throw new AppError("Notice not found!", httpStatus.NOT_FOUND);
  return notice;
};

/* One notice in full, for writing it (notice:view). */
const getNotice = async (auth: Auth, noticeId: string) => {
  const now = new Date();
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, schoolId: auth.schoolId! },
    include: {
      targets: { select: { class: { select: { id: true, name: true } }, section: { select: { id: true, name: true, isDefault: true } } } },
      attachments: { orderBy: { sortOrder: "asc" }, select: attachmentSelect },
      _count: { select: { reads: true } },
    },
  });
  if (!notice) throw new AppError("Notice not found!", httpStatus.NOT_FOUND);

  const people = await names([notice.createdBy, notice.publishedBy]);
  const { _count, attachments, createdBy, publishedBy, schoolId: _schoolId, ...rest } = notice;
  return {
    ...rest,
    state: stateOf(notice, now),
    authorId: createdBy,
    author: createdBy ? (people.get(createdBy) ?? null) : null,
    publisher: publishedBy ? (people.get(publishedBy) ?? null) : null,
    readCount: _count.reads,
    attachments: await withUrls(attachments),
  };
};

/* The classes and sections must be this school's, and each section in its class. */
const checkTargets = async (schoolId: string, targets: { classId: string; sectionId?: string }[]) => {
  if (targets.length === 0) return [];
  const classIds = [...new Set(targets.map((t) => t.classId))];
  const sectionIds = [...new Set(targets.flatMap((t) => (t.sectionId ? [t.sectionId] : [])))];
  const [classes, sections] = await Promise.all([
    prisma.schoolClass.findMany({ where: { schoolId, id: { in: classIds } }, select: { id: true } }),
    prisma.section.findMany({ where: { schoolId, id: { in: sectionIds } }, select: { id: true, classId: true } }),
  ]);
  if (classes.length !== classIds.length) throw new AppError("Choose the classes from this school", httpStatus.BAD_REQUEST);
  const sectionClass = new Map(sections.map((s) => [s.id, s.classId]));
  for (const t of targets) {
    if (t.sectionId && sectionClass.get(t.sectionId) !== t.classId) {
      throw new AppError("A chosen section is not in its class", httpStatus.BAD_REQUEST);
    }
  }
  // a whole class covers its sections: keep one row per place
  const whole = new Set(targets.filter((t) => !t.sectionId).map((t) => t.classId));
  const seen = new Set<string>();
  return targets
    .filter((t) => !t.sectionId || !whole.has(t.classId))
    .filter((t) => {
      const k = `${t.classId}:${t.sectionId ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((t) => ({ classId: t.classId, sectionId: t.sectionId ?? null }));
};

const checkDates = (publishAt: Date | null | undefined, expiresAt: Date | null | undefined, now: Date) => {
  if (expiresAt && expiresAt <= (publishAt ?? now)) {
    throw new AppError("The end must be after the notice goes up", httpStatus.BAD_REQUEST);
  }
};

/* A new notice: a draft, or published straight away by someone who may publish. */
const createNotice = async (auth: Auth, payload: CreateNoticePayload) => {
  const schoolId = auth.schoolId!;
  const now = new Date();
  const { publish, targets, publishAt, expiresAt, ...fields } = payload;
  if (publish && !(await may(auth, "notice:publish"))) {
    throw new AppError("You can save it as a draft. Someone who can publish notices will put it up", httpStatus.FORBIDDEN);
  }
  const places = fields.audience === "FAMILIES" ? await checkTargets(schoolId, targets) : [];
  checkDates(publishAt, expiresAt, now);
  if (publish && expiresAt && expiresAt <= now) throw new AppError("The end date has already passed", httpStatus.BAD_REQUEST);

  const notice = await prisma.notice.create({
    data: {
      ...fields,
      schoolId,
      expiresAt: expiresAt ?? null,
      createdBy: auth.userId,
      ...(publish
        ? { status: "PUBLISHED", publishAt: publishAt ?? now, publishedAt: now, publishedBy: auth.userId }
        : { status: "DRAFT", publishAt: publishAt ?? null }),
      targets: { create: places },
    },
    select: { id: true },
  });
  return getNotice(auth, notice.id);
};

/* A published notice (on the board, waiting or ended) changes only with notice:publish. */
const assertMayChange = async (auth: Auth, notice: { status: string; createdBy: string | null }) => {
  if (notice.status === "PUBLISHED" && !(await may(auth, "notice:publish"))) {
    throw new AppError("This notice is published. Only someone who can publish notices can change it", httpStatus.FORBIDDEN);
  }
};

const updateNotice = async (auth: Auth, noticeId: string, payload: UpdateNoticePayload) => {
  const schoolId = auth.schoolId!;
  const now = new Date();
  const notice = await findNotice(schoolId, noticeId);
  await assertMayChange(auth, notice);

  const { targets, publishAt, expiresAt, ...fields } = payload;
  const audience = fields.audience ?? notice.audience;
  if (targets && targets.length > 0 && audience !== "FAMILIES") {
    throw new AppError("Classes can only be chosen for a notice to families", httpStatus.BAD_REQUEST);
  }
  // a published notice always has a start: cleared, it starts now
  const nextPublishAt = publishAt === undefined ? notice.publishAt : publishAt ?? (notice.status === "PUBLISHED" ? now : null);
  const nextExpiresAt = expiresAt === undefined ? notice.expiresAt : expiresAt;
  checkDates(nextPublishAt, nextExpiresAt, now);

  // moving away from families drops the chosen classes
  const places = targets !== undefined && audience === "FAMILIES" ? await checkTargets(schoolId, targets) : undefined;
  const dropTargets = audience !== "FAMILIES" && notice.audience === "FAMILIES";

  await prisma.$transaction(async (tx) => {
    if (places !== undefined || dropTargets) {
      await tx.noticeTarget.deleteMany({ where: { noticeId } });
      if (places && places.length > 0) await tx.noticeTarget.createMany({ data: places.map((p) => ({ ...p, noticeId })) });
    }
    await tx.notice.update({
      where: { id: noticeId },
      data: {
        ...fields,
        ...(publishAt !== undefined ? { publishAt: nextPublishAt } : {}),
        ...(expiresAt !== undefined ? { expiresAt: nextExpiresAt } : {}),
      },
    });
  });
  return getNotice(auth, noticeId);
};

/* Puts a notice up now, or at publishAt (the draft's own date when it is still ahead). */
const publishNotice = async (auth: Auth, noticeId: string, publishAt: Date | null | undefined) => {
  const now = new Date();
  const notice = await findNotice(auth.schoolId!, noticeId);
  if (notice.status === "PUBLISHED") throw new AppError("This notice is already published", httpStatus.CONFLICT);

  const start = publishAt ?? (notice.publishAt && notice.publishAt > now ? notice.publishAt : now);
  if (notice.expiresAt && notice.expiresAt <= start) {
    throw new AppError("Its end date is before it would go up. Change the end date first", httpStatus.BAD_REQUEST);
  }
  await prisma.notice.update({
    where: { id: noticeId },
    data: { status: "PUBLISHED", publishAt: start, publishedAt: now, publishedBy: auth.userId },
  });
  return getNotice(auth, noticeId);
};

/* Takes a notice down: it is a draft again (who read it is kept). */
const unpublishNotice = async (auth: Auth, noticeId: string) => {
  const notice = await findNotice(auth.schoolId!, noticeId);
  if (notice.status !== "PUBLISHED") throw new AppError("This notice is not published", httpStatus.CONFLICT);
  await prisma.notice.update({
    where: { id: noticeId },
    data: { status: "DRAFT", publishAt: null, publishedAt: null, publishedBy: null },
  });
  return getNotice(auth, noticeId);
};

/* notice:publish deletes any notice; a writer deletes only a draft of their own. */
const deleteNotice = async (auth: Auth, noticeId: string) => {
  const notice = await findNotice(auth.schoolId!, noticeId);
  const ownDraft = notice.status === "DRAFT" && notice.createdBy === auth.userId;
  if (!ownDraft && !(await may(auth, "notice:publish"))) {
    throw new AppError("You can delete only your own drafts", httpStatus.FORBIDDEN);
  }
  const attachments = await prisma.noticeAttachment.findMany({ where: { noticeId }, select: { key: true } });
  await prisma.notice.delete({ where: { id: noticeId } });
  await Promise.all(attachments.map((a) => deleteFile(a.key)));
  return { id: noticeId };
};

// ------------------------------------------------------------- attachments

const addAttachment = async (auth: Auth, noticeId: string, file: Express.Multer.File) => {
  const schoolId = auth.schoolId!;
  const notice = await findNotice(schoolId, noticeId);
  await assertMayChange(auth, notice);

  const { _count, _max } = await prisma.noticeAttachment.aggregate({ where: { noticeId }, _count: { _all: true }, _max: { sortOrder: true } });
  if (_count._all >= MAX_ATTACHMENTS) throw new AppError(`A notice can have at most ${MAX_ATTACHMENTS} files`, httpStatus.BAD_REQUEST);
  // after the last file (a removed one leaves a gap, so the count could repeat a place)
  const sortOrder = (_max.sortOrder ?? -1) + 1;

  const prepared = await prepareAttachment(file.buffer, file.originalname);
  const key = fileKey(`schools/${schoolId}/notices/${noticeId}`, "file", prepared.extension);
  await putFile(key, prepared.body, prepared.contentType);

  try {
    await prisma.noticeAttachment.create({
      data: { noticeId, key, name: prepared.name, contentType: prepared.contentType, size: prepared.body.length, sortOrder },
    });
  } catch (error) {
    await deleteFile(key);
    throw error;
  }
  return getNotice(auth, noticeId);
};

const removeAttachment = async (auth: Auth, noticeId: string, attachmentId: string) => {
  const notice = await findNotice(auth.schoolId!, noticeId);
  await assertMayChange(auth, notice);
  const attachment = await prisma.noticeAttachment.findFirst({ where: { id: attachmentId, noticeId }, select: { id: true, key: true } });
  if (!attachment) throw new AppError("File not found!", httpStatus.NOT_FOUND);

  await prisma.noticeAttachment.delete({ where: { id: attachment.id } });
  await deleteFile(attachment.key);
  return getNotice(auth, noticeId);
};

// ------------------------------------------------------------------ public

const publicSchool = async (subdomain: string) => {
  const school = await prisma.school.findUnique({ where: { subdomain }, select: { id: true, status: true } });
  if (!school || school.status !== "ACTIVE") throw new AppError("School not found!", httpStatus.NOT_FOUND);
  return school.id;
};

const publicSelect = {
  id: true,
  title: true,
  category: true,
  pinned: true,
  publishAt: true,
  expiresAt: true,
} as const;

/* The school's public notice page: notices marked public that are up now. */
const listPublic = async (subdomain: string, query: NoticeBoardQuery) => {
  const schoolId = await publicSchool(subdomain);
  const where: Prisma.NoticeWhereInput = {
    schoolId,
    isPublic: true,
    ...liveWhere(new Date()),
    ...(query.category ? { category: query.category } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { publishAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: { ...publicSelect, _count: { select: { attachments: true } } },
    }),
    prisma.notice.count({ where }),
  ]);
  const items = rows.map(({ _count, ...n }) => ({ ...n, attachmentCount: _count.attachments }));
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
};

const getPublic = async (subdomain: string, noticeId: string) => {
  const schoolId = await publicSchool(subdomain);
  const notice = await prisma.notice.findFirst({
    where: { id: noticeId, schoolId, isPublic: true, ...liveWhere(new Date()) },
    select: { ...publicSelect, body: true, attachments: { orderBy: { sortOrder: "asc" }, select: attachmentSelect } },
  });
  if (!notice) throw new AppError("Notice not found!", httpStatus.NOT_FOUND);
  return { ...notice, attachments: await withUrls(notice.attachments) };
};

export const NoticeService = {
  getBoard,
  markRead,
  listNotices,
  getNotice,
  createNotice,
  updateNotice,
  publishNotice,
  unpublishNotice,
  deleteNotice,
  addAttachment,
  removeAttachment,
  listPublic,
  getPublic,
};
