import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { superAdminOnly } from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";

/*
 * A school's own settings, for its super admin. For now its look: the accent colour and the
 * sidebar colour of its dashboard and public homepage. Only the app's tested colours are
 * allowed: accents stay readable and never look like the green / red / amber of present, absent
 * and late; sidebars stay dark enough for their white text. null is the default (blue, navy).
 * The colours themselves live in the client (lib/theme/accents.ts): keep the lists in step.
 */
export const ACCENT_COLORS = ["BLUE", "INDIGO", "VIOLET", "MAROON", "TEAL", "SLATE"] as const;
export const SIDEBAR_COLORS = ["NAVY", "MAROON", "FOREST", "TEAL", "OCEAN", "PURPLE", "CHARCOAL"] as const;

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

export const schoolSettingsRoutes = router;
