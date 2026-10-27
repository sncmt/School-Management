import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { superAdminOnly } from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import { imageUploadMiddleware, processImage } from "../../shared/imageUpload";
import sendResponse from "../../shared/sendResponse";
import { deleteFile, fileKey, putFile, withFileUrls } from "../../shared/storage";

/*
 * A school's own settings, for its super admin: the accent colour and the sidebar colour of its
 * dashboard and public homepage, the pictures of the homepage's image slider and its admission
 * section (requirements, dates, fees). Only the app's tested colours are
 * allowed: accents stay readable and never look like the green / red / amber of present, absent
 * and late; sidebars stay dark enough for their white text. null is the default (blue, navy).
 * The colours themselves live in the client (lib/theme/accents.ts): keep the lists in step.
 */
export const ACCENT_COLORS = ["BLUE", "INDIGO", "VIOLET", "MAROON", "TEAL", "SLATE"] as const;
export const SIDEBAR_COLORS = ["NAVY", "INDIGO", "TEAL", "OCEAN", "EMERALD", "PURPLE", "CHARCOAL"] as const;

const appearanceSelect = { accentColor: true, sidebarColor: true } as const;

// either or both; left out = unchanged
const updateAppearance = z
  .strictObject({
    accentColor: z.enum(ACCENT_COLORS, { error: "Choose one of the colours offered" }).nullable().optional(),
    sidebarColor: z.enum(SIDEBAR_COLORS, { error: "Choose one of the colours offered" }).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Choose a colour" });

const router = express.Router();
router.use(authenticate("SCHOOL"), superAdminOnly);

router.get(
  "/appearance",
  catchAsync(async (req: Request, res: Response) => {
    const school = await prisma.school.findUniqueOrThrow({ where: { id: req.auth!.schoolId! }, select: appearanceSelect });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Appearance retrieved", data: school });
  }),
);

router.patch(
  "/appearance",
  validateRequest({ body: updateAppearance }),
  catchAsync(async (req: Request, res: Response) => {
    const school = await prisma.school.update({ where: { id: req.auth!.schoolId! }, data: req.body, select: appearanceSelect });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Appearance saved", data: school });
  }),
);

// ------------------------------------------------------------- homepage slider

const MAX_SLIDES = 6;
const slideSelect = { id: true, image: true, caption: true, sortOrder: true } as const;

// blank = no caption
const caption = z
  .string()
  .trim()
  .max(120, "Keep the caption under 120 characters")
  .transform((v) => v || null);

const slideParams = z.strictObject({ id: z.string().min(1) });
const updateSlide = z.strictObject({ caption: caption.nullable() });
// every slide of the school, in the new order
const reorderSlides = z.strictObject({ ids: z.array(z.string().min(1)).min(1).max(MAX_SLIDES) });

const listSlides = async (schoolId: string) => {
  const slides = await prisma.schoolSlide.findMany({
    where: { schoolId },
    select: slideSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return Promise.all(slides.map((slide) => withFileUrls(slide, ["image"])));
};

const findSlide = async (schoolId: string, id: string) => {
  const slide = await prisma.schoolSlide.findFirst({ where: { id, schoolId }, select: slideSelect });
  if (!slide) throw new AppError("Slide not found", httpStatus.NOT_FOUND);
  return slide;
};

router.get(
  "/slides",
  catchAsync(async (req: Request, res: Response) => {
    const data = await listSlides(req.auth!.schoolId!);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Slides retrieved", data });
  }),
);

// a new picture at the end, with an optional "caption" field beside the file
router.post(
  "/slides",
  imageUploadMiddleware,
  catchAsync(async (req: Request, res: Response) => {
    const schoolId = req.auth!.schoolId!;
    const text = caption.safeParse(req.body?.caption ?? "");
    if (!text.success) throw new AppError(text.error.issues[0].message, httpStatus.BAD_REQUEST);

    const [count, last] = await Promise.all([
      prisma.schoolSlide.count({ where: { schoolId } }),
      prisma.schoolSlide.findFirst({ where: { schoolId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } }),
    ]);
    if (count >= MAX_SLIDES) throw new AppError(`The slider holds up to ${MAX_SLIDES} pictures; remove one first`, httpStatus.CONFLICT);

    const image = await processImage(req.file!.buffer, "slide");
    const key = fileKey(`schools/${schoolId}/slides`, "slide", image.extension);
    await putFile(key, image.body, image.contentType);
    await prisma.schoolSlide.create({ data: { schoolId, image: key, caption: text.data, sortOrder: (last?.sortOrder ?? -1) + 1 } });

    sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Slide added", data: await listSlides(schoolId) });
  }),
);

router.patch(
  "/slides/:id",
  validateRequest({ params: slideParams, body: updateSlide }),
  catchAsync(async (req: Request, res: Response) => {
    const schoolId = req.auth!.schoolId!;
    const slide = await findSlide(schoolId, req.params.id as string);
    await prisma.schoolSlide.update({ where: { id: slide.id }, data: { caption: req.body.caption } });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Slide saved", data: await listSlides(schoolId) });
  }),
);

router.put(
  "/slides/order",
  validateRequest({ body: reorderSlides }),
  catchAsync(async (req: Request, res: Response) => {
    const schoolId = req.auth!.schoolId!;
    const ids: string[] = req.body.ids;
    const current = await prisma.schoolSlide.findMany({ where: { schoolId }, select: { id: true } });
    const same = new Set(ids).size === ids.length && ids.length === current.length && current.every((s) => ids.includes(s.id));
    if (!same) throw new AppError("The slides have changed; reload the page and try again", httpStatus.CONFLICT);

    await prisma.$transaction(ids.map((id, sortOrder) => prisma.schoolSlide.update({ where: { id }, data: { sortOrder } })));
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Slides reordered", data: await listSlides(schoolId) });
  }),
);

router.delete(
  "/slides/:id",
  validateRequest({ params: slideParams }),
  catchAsync(async (req: Request, res: Response) => {
    const schoolId = req.auth!.schoolId!;
    const slide = await findSlide(schoolId, req.params.id as string);
    await prisma.schoolSlide.delete({ where: { id: slide.id } });
    await deleteFile(slide.image);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Slide removed", data: await listSlides(schoolId) });
  }),
);

// ------------------------------------------------------------- admission section

const MAX_ADMISSION_ROWS = 20;
const text = (max: number) => z.string().trim().min(1, "Fill in or remove the empty row").max(max, `Keep it under ${max} characters`);

// the whole section at once; empty lists hide that part (all empty hides the section)
const admissionBody = z.strictObject({
  requirements: z.array(text(200)).max(MAX_ADMISSION_ROWS),
  dates: z.array(z.strictObject({ label: text(100), value: text(100) })).max(MAX_ADMISSION_ROWS),
  fees: z
    .array(z.strictObject({ label: text(100), amount: z.number().int("Whole taka only").min(0).max(10_000_000) }))
    .max(MAX_ADMISSION_ROWS),
});

const admissionSelect = { requirements: true, dates: true, fees: true } as const;
const NO_ADMISSION = { requirements: [], dates: [], fees: [] };

router.get(
  "/admission",
  catchAsync(async (req: Request, res: Response) => {
    const info = await prisma.admissionInfo.findUnique({ where: { schoolId: req.auth!.schoolId! }, select: admissionSelect });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Admission retrieved", data: info ?? NO_ADMISSION });
  }),
);

router.put(
  "/admission",
  validateRequest({ body: admissionBody }),
  catchAsync(async (req: Request, res: Response) => {
    const schoolId = req.auth!.schoolId!;
    const data = req.body as z.infer<typeof admissionBody>;
    const info = await prisma.admissionInfo.upsert({ where: { schoolId }, create: { schoolId, ...data }, update: data, select: admissionSelect });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Admission saved", data: info });
  }),
);

export const schoolSettingsRoutes = router;
